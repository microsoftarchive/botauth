"use strict";
const passport = require('passport');
class BotAuth {
    constructor(server, bot, options) {
        server.get('/botauth/:providerId/auth', function (req, res) {
        });
        server.get('/botauth/:providerId/auth/callback', function (req, res) {
        });
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
}
exports.BotAuth = BotAuth;
