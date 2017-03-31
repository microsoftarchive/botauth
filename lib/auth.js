"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const passport = require("passport");
function setupPassport(authenticator) {
    passport.serializeUser((user, done) => {
        done(null, user);
    });
    passport.deserializeUser((user, done) => {
        done(null, user);
    });
    authenticator.server.use(passport.initialize());
    authenticator.server.use(passport.session());
}
exports.setupPassport = setupPassport;
;
