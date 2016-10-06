"use strict";
const builder = require('botbuilder');
const passport = require('passport');
const library = require('./library');
const routes = require('./routes');
class Authenticator {
    constructor(server, bot, options) {
        this._bot = bot;
        this._server = server;
        this._options = Object.assign({ basePath: "botauth" }, options);
        this._server.use(passport.initialize());
        routes.add(this._server, this._bot);
        this._bot.library(library.build());
        passport.serializeUser(function (user, done) {
            done(null, JSON.stringify(user));
        });
        passport.deserializeUser(function (userId, done) {
            return done(null, JSON.parse(userId));
        });
    }
    provider(name, strategy, options) {
        let args = Object.assign({
            callbackURL: this.callbackUrl(name)
        }, options.args);
        let s = new strategy(args, function (accessToken, refreshToken, profile, done) {
            console.log("token %s", accessToken);
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            return done(null, profile);
        });
        passport.use(name, s);
        return this;
    }
    authenticate(providerId) {
        return (session, args, skip) => {
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
            else {
                session.beginDialog(library.name, {
                    providerId: providerId,
                    authUrl: this.authUrl(providerId)
                });
            }
        };
    }
    callbackUrl(providerName) {
        return `${this._options.baseUrl}/${this._options.basePath}/${providerName}/callback`;
    }
    authUrl(providerName) {
        return `${this._options.baseUrl}/${this._options.basePath}/${providerName}`;
    }
}
exports.Authenticator = Authenticator;
