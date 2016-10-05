"use strict";
const passport = require('passport');
const library = require('./library');
const routes = require('./routes');
class Authenticator {
    constructor(server, bot, options) {
        this._bot = bot;
        this._server = server;
        this._options = options;
        routes.add(this._server, this._bot);
    }
    provider(strategy, options) {
        var args = {
            callbackURL: `${this._options.baseUrl}/auth/${name}/callback`
        };
        console.log("callbackURL:%s", args.callbackURL);
        args = Object.assign(args, options.args);
        passport.use(name, new strategy(args, function (accessToken, refreshToken, profile, done) {
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            return done(null, profile);
        }));
        return this;
    }
    authenticate(providerId) {
        return (session, args, skip) => {
            session.beginDialog(library.name);
        };
    }
}
exports.Authenticator = Authenticator;
