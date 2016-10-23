"use strict";
const crypto = require('crypto');
const builder = require('botbuilder');
const passport = require('passport');
const dialogs_1 = require("./dialogs");
exports.AuthDialog = dialogs_1.AuthDialog;
const DIALOG_LIBRARY = "botauth";
const DIALOG_ID = "auth";
const DIALOG_FULLNAME = `${DIALOG_LIBRARY}:${DIALOG_ID}`;
class BotAuthenticator {
    constructor(server, bot, store, options) {
        this.server = server;
        this.bot = bot;
        this.store = store;
        this.options = options;
        if (!bot || !server || !store) {
            throw new Error("Autenticator constructor failed because required parameters were null/undefined");
        }
        this.options = Object.assign({ basePath: "botauth" }, options);
        this.server.use(passport.initialize());
        this.server.get(`/${this.options.basePath}/:providerId`, this.persistContext.bind(this), this.passport_redirect);
        this.server.get(`/${this.options.basePath}/:providerId/callback`, this.passport_callback, this.restoreContext.bind(this), this.credential_callback.bind(this));
        let lib = new builder.Library(DIALOG_LIBRARY);
        lib.dialog(DIALOG_ID, new dialogs_1.AuthDialog(this.store));
        this.bot.library(lib);
        passport.serializeUser((user, done) => {
            done(null, user);
        });
        passport.deserializeUser((userId, done) => {
            return done(null, userId);
        });
    }
    provider(name, options) {
        let args = Object.assign({
            callbackURL: this.callbackUrl(name)
        }, options.args);
        let s = new options.strategy(args, function (accessToken, refreshToken, profile, done) {
            profile = profile || {};
            profile.id = profile.id || crypto.randomBytes(32).toString('hex');
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            return done(null, profile);
        });
        passport.use(name, s);
        return this;
    }
    authenticate(providerId, options) {
        let authSteps = [
                (session, args, skip) => {
                session.beginDialog("botauth:auth", {
                    providerId: providerId,
                    buttonUrl: this.authUrl(providerId)
                });
            },
                (session, args, skip) => {
                if (args) {
                    if (args.resumed === builder.ResumeReason.completed) {
                        skip();
                        return;
                    }
                    else if (args.resumed === builder.ResumeReason.back || args.resumed === builder.ResumeReason.canceled || args.resumed === builder.ResumeReason.forward || args.resumed === builder.ResumeReason.notCompleted) {
                        session.endConversation("auth failed, ending conversation");
                        return;
                    }
                }
            }
        ];
        return authSteps;
    }
    profile(session, providerId) {
        if (session && session.userData && session.userData.botauth && session.userData.botauth.tokens && session.userData.botauth.tokens.hasOwnProperty(providerId)) {
            return session.userData.botauth.tokens[providerId];
        }
        else {
            return null;
        }
    }
    callbackUrl(providerName) {
        return `${this.options.baseUrl}/${this.options.basePath}/${providerName}/callback`;
    }
    authUrl(providerName) {
        return `${this.options.baseUrl}/${this.options.basePath}/${providerName}`;
    }
    passport_redirect(req, res, next) {
        let providerId = req.params.providerId;
        let state = req.query.state;
        return passport.authenticate(providerId, { state: state, session: false })(req, res, next);
    }
    passport_callback(req, res, next) {
        let providerId = req.params.providerId;
        return passport.authenticate(providerId)(req, res, next);
    }
    persistContext(req, res, next) {
        return next();
    }
    restoreContext(req, res, next) {
        return next();
    }
    credential_callback(req, res, next) {
        let cred = {
            _id: crypto.randomBytes(32).toString('hex'),
            conversation: req.query.state,
            authToken: req.user.authToken,
            refreshToken: req.user.refreshToken
        };
        this.store.saveCredential(cred, (err, credential) => {
            if (err) {
                res.send(403, "saving credential failed");
                res.end();
            }
            else {
                res.end(`You're almost done. To complete your authentication, put '${cred._id.slice(-6)}' in our chat.`);
            }
        });
    }
}
exports.BotAuthenticator = BotAuthenticator;
