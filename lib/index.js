"use strict";
const url = require("url");
const crypto = require("crypto");
const builder = require("botbuilder");
const passport = require("passport");
const index_1 = require("./flows/index");
const index_2 = require("./flows/facebook-account-linking/index");
const index_3 = require("./flows/magic/index");
const provider_1 = require("./providers/oauth2/provider");
const dialogs_1 = require("./dialogs");
exports.AuthDialog = dialogs_1.AuthDialog;
const resumption_1 = require("./resumption");
exports.CookieResumption = resumption_1.CookieResumption;
const defaultOptions = {
    basePath: "botauth",
    resumption: null,
    secret: null,
    baseUrl: null,
    session: false
};
class BotAuthenticator {
    constructor(server, bot, options) {
        this.server = server;
        this.bot = bot;
        this.options = options;
        this.providers = [];
        if (!bot) {
            throw new Error("BotAuthenticator constructor failed because 'bot' argument was null/undefined");
        }
        if (!server) {
            throw new Error("BotAuthenticator constructor failed because 'server' argument was null/undefined");
        }
        this.options = Object.assign({}, defaultOptions, options);
        if (!this.options.baseUrl) {
            throw new Error("options.baseUrl can not be null");
        }
        else {
            let parsedUrl = url.parse(this.options.baseUrl);
            if (parsedUrl.protocol !== "https:" || !parsedUrl.slashes || !parsedUrl.hostname) {
                throw new Error("options.baseUrl must be a valid url and start with 'https://'.");
            }
        }
        if (!this.options.secret) {
            throw new Error("options.secret can not be null");
        }
        if (!this.options.resumption) {
            this.options.resumption = new resumption_1.CookieResumption(15 * 60, this.options.secret);
        }
        this.flows = new index_1.FlowRouter([
            new index_2.FacebookAccountLinkingFlow(this),
            new index_3.MagicCodeFlow(this, { secret: this.options.secret })
        ]);
        this.server.use(passport.initialize());
        if (this.options.session) {
            this.server.use(passport.session());
            passport.serializeUser((user, done) => {
                done(null, user);
            });
            passport.deserializeUser((userId, done) => {
                done(null, userId);
            });
        }
        this.bot.set("persistConversationData", true);
        this.bot.set("persistUserData", true);
    }
    provider(name, factory) {
        let s = factory({
            callbackURL: this.callbackUrl(name)
        });
        if (!s) {
            throw new Error("The 'factory' method passed to BotAuthenticator.provider must return an instance of an authentication Strategy.");
        }
        this.providers.push(new provider_1.PassportOAuth2Provider({
            strategy: s,
            baseUrl: this.callbackUrl(name),
            secret: this.options.secret,
            bot: this.bot,
            server: this.server,
            resumption: new resumption_1.CookieResumption(5, this.options.secret)
        }));
        passport.use(name, s);
        return this;
    }
    authenticate(providerId, options) {
        let authSteps = [
                (session, args, skip) => {
                let user = this.profile(session, providerId);
                if (user) {
                    skip({ response: (args || {}).response, resumed: builder.ResumeReason.forward });
                }
                else {
                    let dialogName = this.flows.loginDialog(session);
                    console.log(dialogName);
                    let cxt = new Buffer(JSON.stringify(session.message.address)).toString("base64");
                    session.beginDialog(dialogName, {
                        providerId: providerId,
                        buttonUrl: this.authUrl(providerId, cxt),
                        originalArgs: args.response
                    });
                }
            },
                (session, args, skip) => {
                if (args) {
                    if (args.resumed === builder.ResumeReason.completed || args.resumed === builder.ResumeReason.forward) {
                        skip({ response: args.response, resumed: builder.ResumeReason.forward });
                        return;
                    }
                    else if (args.resumed === builder.ResumeReason.back || args.resumed === builder.ResumeReason.canceled || args.resumed === builder.ResumeReason.notCompleted) {
                        session.endDialogWithResult({ response: false, resumed: args.resumed });
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
            let json = decipher.update(encryptedProfile, "base64", "utf8") + decipher.final("utf8");
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
}
exports.BotAuthenticator = BotAuthenticator;
