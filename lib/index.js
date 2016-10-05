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
        routes.add(this._server, this._bot);
    }
    provider(name, strategy, options) {
        var args = {
            callbackURL: this.callbackUrl(name)
        };
        console.log("callbackURL:%s", args.callbackURL);
        args = Object.assign(args, options.args);
        let s = new strategy(args, function (accessToken, refreshToken, profile, done) {
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            return done(null, profile);
        });
        passport.use(name, s);
        return this;
    }
    authenticate(providerId) {
        return (session, args, skip) => {
            if (args.resumed === builder.ResumeReason.completed) {
                skip();
            }
            else if (args.resumed === builder.ResumeReason.back || args.resumed === builder.ResumeReason.canceled || args.resumed === builder.ResumeReason.forward || args.resumed === builder.ResumeReason.notCompleted) {
                session.endConversation("auth failed, ending conversation");
                return;
            }
            session.beginDialog(library.name, {
                providerId: providerId,
                authUrl: this.authUrl(providerId)
            });
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
