"use strict";
const account_linking_dialog_1 = require("./account-linking-dialog");
const account_unlinking_dialog_1 = require("./account-unlinking-dialog");
const builder = require("botbuilder");
const crypto = require("crypto");
class FacebookAccountLinkingFlow {
    constructor(authenticator) {
        let fb = new builder.Library("fb");
        fb.dialog("link", new account_linking_dialog_1.FacebookAccountLinkingDialog());
        fb.dialog("unlink", new account_unlinking_dialog_1.FacebookAccountUnlinkingDialog());
        authenticator.bot.library(fb);
        authenticator.server.get("/account_linking", function (req, res) {
            console.log(req.query.account_linking_token);
            console.log(req.query.redirect_uri);
            var authCode = encodeURIComponent(crypto.randomBytes(54).toString("base64"));
            res.status(302);
            res.header("Location", `${req.query.redirect_uri}&authorization_code=${authCode}`);
            res.send("redirecting");
            res.end();
        });
    }
    get id() {
        return "facebook-account-linking";
    }
    supported(session) {
        return (session.message.source === "facebook");
    }
    login(session) {
    }
    logout(session) {
    }
    loginCallback(error, user, state, req, res) {
        return new Promise(() => true);
    }
}
exports.FacebookAccountLinkingFlow = FacebookAccountLinkingFlow;
