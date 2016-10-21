"use strict";
const crypto = require('crypto');
const builder = require('botbuilder');
const passport = require('passport');
const routes = require("./routes");
const dialogs_1 = require("./dialogs");
exports.AuthDialog = dialogs_1.AuthDialog;
const DIALOG_LIBRARY = "botauth";
const DIALOG_ID = "auth";
const DIALOG_FULLNAME = `${DIALOG_LIBRARY}:${DIALOG_ID}`;
class Authenticator {
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
        routes.add(this.server, this.bot, this.store);
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
}
exports.Authenticator = Authenticator;
