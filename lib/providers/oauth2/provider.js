"use strict";
const crypto = require("crypto");
const passport = require("passport");
const defaultOptions = {
    basePath: "botauth",
    resumption: null,
    secret: null,
    baseUrl: null,
    session: false,
    server: null,
    bot: null,
    strategy: null
};
class PassportOAuth2Provider {
    constructor(options) {
        this.options = options;
        if (!options.strategy) {
            throw new Error("PassportProvider constructor failed because 'options.strategy' argument was null/undefined");
        }
        this.options = Object.assign({}, defaultOptions, options);
        this.options.server.get(`/${this.options.basePath}/:providerId`, this.options.resumption.persistHandler(), this.passport_redirect());
        this.options.server.get(`/${this.options.basePath}/:providerId/callback`, this.passport_callback(), this.options.resumption.restoreHandler(), this.credential_callback());
        this.options.server.post(`/${this.options.basePath}/:providerId/callback`, this.passport_callback(), this.options.resumption.restoreHandler(), this.credential_callback());
    }
    authenticate(req, options) {
        this.options.strategy.authenticate.bind(this.options.strategy)(req, options);
    }
    passport_redirect() {
        let session = this.options.session;
        return (req, res, next) => {
            let providerId = req.params.providerId;
            return passport.authenticate(providerId, { session: session })(req, res, next);
        };
    }
    passport_callback() {
        let session = this.options.session;
        return (req, res, next) => {
            let providerId = req.params.providerId;
            return passport.authenticate(providerId, { session: session })(req, res, next);
        };
    }
    credential_callback() {
        let bot = this.options.bot;
        let options = this.options;
        return (req, res, next) => {
            let providerId = req.params.providerId;
            let user = req.user;
            if (!user) {
                res.status(403);
                res.send("verify function yielded no user");
                res.end();
                return;
            }
            let addr = JSON.parse(new Buffer(req.locals.resumption, "base64").toString("utf8"));
            if (!addr) {
                res.status(403);
                res.send("resumption token has expired or is invalid");
                res.end();
                return next();
            }
            let magic = crypto.randomBytes(3).toString("hex");
            let response = {
                providerId: providerId,
                user: user,
                timestamp: new Date()
            };
            let cipher = crypto.createCipher("aes192", magic + options.secret);
            let encryptedResponse = cipher.update(JSON.stringify(response), "utf8", "base64") + cipher.final("base64");
            let botStorage = bot.get("storage");
            let botContext = { persistConversationData: true, persistUserData: false, address: addr, conversationId: addr.conversation.id };
            botStorage.getData(botContext, (err, data) => {
                if (err) {
                    console.error(err);
                    res.status(403);
                    res.send("failed to get bot state");
                    res.end();
                    return;
                }
                let magicKey = crypto.createHmac("sha256", options.secret).update(magic).digest("hex");
                data.conversationData.botauth = data.conversationData.botauth || {};
                data.conversationData.botauth.responses = data.conversationData.botauth.responses || {};
                data.conversationData.botauth.responses[magicKey] = encryptedResponse;
                botStorage.saveData(botContext, data, (err) => {
                    if (err) {
                        res.status(403);
                        res.send("saving credential failed");
                        res.end();
                    }
                    else {
                        if (this.options.successRedirect) {
                            res.status(302);
                            res.header("Location", `${options.successRedirect}#${encodeURIComponent(magic)}`);
                            res.send("redirecting...");
                            res.end();
                        }
                        else {
                            res.end(`You're almost done. To complete your authentication, put "${magic}" in our chat.`);
                        }
                    }
                });
            });
        };
    }
}
exports.PassportOAuth2Provider = PassportOAuth2Provider;
