"use strict";
const crypto = require('crypto');
const builder = require('botbuilder');
const passport = require('passport');
const dialogs_1 = require("./dialogs");
exports.AuthDialog = dialogs_1.AuthDialog;
const resumption_1 = require("./resumption");
exports.CookieResumption = resumption_1.CookieResumption;
const DIALOG_LIBRARY = "botauth";
const DIALOG_ID = "auth";
const DIALOG_FULLNAME = `${DIALOG_LIBRARY}:${DIALOG_ID}`;
const defaultOptions = {
    basePath: "botauth",
    resumption: null,
    secret: null,
    baseUrl: null
};
class BotAuthenticator {
    constructor(server, bot, options) {
        this.server = server;
        this.bot = bot;
        this.options = options;
        if (!bot || !server) {
            throw new Error("Autenticator constructor failed because required parameters were null/undefined");
        }
        this.options = Object.assign({}, defaultOptions, options);
        if (!this.options.secret) {
            throw new Error("options.secret can not be null");
        }
        if (!this.options.resumption) {
            this.options.resumption = new resumption_1.CookieResumption(15 * 60, this.options.secret);
        }
        this.server.use(passport.initialize());
        this.server.get(`/${this.options.basePath}/:providerId`, this.options.resumption.persistHandler(), this.passport_redirect);
        this.server.get(`/${this.options.basePath}/:providerId/callback`, this.passport_callback, this.options.resumption.restoreHandler(), this.credential_callback.bind(this));
        this.bot.set("persistConversationData", true);
        this.bot.set("persistUserData", true);
        let lib = new builder.Library(DIALOG_LIBRARY);
        lib.dialog(DIALOG_ID, new dialogs_1.AuthDialog({ secret: this.options.secret }));
        this.bot.library(lib);
    }
    provider(name, factory) {
        let s = factory({
            callbackURL: this.callbackUrl(name)
        });
        passport.use(name, s);
        return this;
    }
    authenticate(providerId, options) {
        let authSteps = [
                (session, args, skip) => {
                let user = this.profile(session, providerId);
                if (user) {
                    skip({ response: user });
                }
                else {
                    let cxt = new Buffer(JSON.stringify(session.message.address)).toString('base64');
                    session.beginDialog(DIALOG_FULLNAME, {
                        providerId: providerId,
                        buttonUrl: this.authUrl(providerId, cxt)
                    });
                }
            },
                (session, args, skip) => {
                if (args) {
                    if (args.resumed === builder.ResumeReason.completed || args.resumed === builder.ResumeReason.forward) {
                        skip({ response: args.response });
                        return;
                    }
                    else if (args.resumed === builder.ResumeReason.back || args.resumed === builder.ResumeReason.canceled || args.resumed === builder.ResumeReason.notCompleted) {
                        session.endConversation("auth failed, ending conversation");
                        return;
                    }
                }
            }
        ];
        return authSteps;
    }
    profile(session, providerId) {
        if (session && session.userData && session.userData.botauth && session.userData.botauth.user && session.userData.botauth.user.hasOwnProperty(providerId)) {
            let encryptedProfile = session.userData.botauth.user[providerId];
            let decipher = crypto.createDecipher("aes192", this.options.secret);
            let json = decipher.update(encryptedProfile, 'base64', 'utf8') + decipher.final('utf8');
            return JSON.parse(json);
        }
        else {
            return null;
        }
    }
    logout(session, providerId) {
        if (session && session.userData && session.userData.botauth && session.userData.botauth.user && session.userData.botauth.user.hasOwnProperty(providerId)) {
            delete session.userData.botauth.user[providerId];
            session.save();
        }
    }
    callbackUrl(providerName) {
        return `${this.options.baseUrl}/${this.options.basePath}/${providerName}/callback`;
    }
    authUrl(providerName, state) {
        return `${this.options.baseUrl}/${this.options.basePath}/${providerName}?state=${encodeURIComponent(state)}`;
    }
    passport_redirect(req, res, next) {
        let providerId = req.params.providerId;
        return passport.authenticate(providerId, { session: false })(req, res, next);
    }
    passport_callback(req, res, next) {
        let providerId = req.params.providerId;
        return passport.authenticate(providerId, { session: false })(req, res, next);
    }
    credential_callback(req, res, next) {
        let providerId = req.params.providerId;
        let addr = JSON.parse(new Buffer(req.locals.resumption, "base64").toString());
        ;
        if (!addr) {
            res.send(403, "resumption token has expired or is invalid");
            res.end();
            return next();
        }
        let magic = crypto.randomBytes(3).toString('hex');
        let response = {
            providerId: providerId,
            user: req.user,
            timestamp: new Date()
        };
        let cipher = crypto.createCipher("aes192", magic + this.options.secret);
        let encryptedResponse = cipher.update(JSON.stringify(response), 'utf8', 'base64') + cipher.final('base64');
        let botStorage = this.bot.get("storage");
        let botContext = { persistConversationData: true, persistUserData: false, address: addr, conversationId: addr.conversation.id };
        botStorage.getData(botContext, (err, data) => {
            if (err) {
                console.error(err);
                res.send(403, "failed to get bot state");
                res.end();
                return;
            }
            let magicKey = crypto.createHmac("sha256", this.options.secret).update(magic).digest("hex");
            data.conversationData.botauth = data.conversationData.botauth || {};
            data.conversationData.botauth.responses = data.conversationData.botauth.responses || {};
            data.conversationData.botauth.responses[magicKey] = encryptedResponse;
            botStorage.saveData(botContext, data, (err) => {
                if (err) {
                    res.send(403, "saving credential failed");
                    res.end();
                }
                else {
                    if (this.options.successRedirect) {
                        res.send("302", "redirecting...", { "Location": `${this.options.successRedirect}#${encodeURIComponent(magic)}` });
                        res.end();
                    }
                    else {
                        res.end(`You're almost done. To complete your authentication, put '${magic}' in our chat.`);
                    }
                }
            });
        });
    }
}
exports.BotAuthenticator = BotAuthenticator;
