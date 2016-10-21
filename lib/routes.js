"use strict";
const passport = require("passport");
const crypto = require("crypto");
function add(server, bot, store) {
    server.get('/botauth/:providerId', (req, res, next) => {
        let providerId = req.params.providerId;
        let state = req.query.state;
        return passport.authenticate(providerId, { state: state })(req, res, next);
    });
    server.get('/botauth/:providerId/callback', (req, res, next) => {
        let providerId = req.params.providerId;
        return passport.authenticate(providerId)(req, res, next);
    }, (req, res, next) => {
        let cred = {
            _id: crypto.randomBytes(32).toString('hex'),
            conversation: req.query.state,
            authToken: req.user.authToken,
            refreshToken: req.user.refreshToken
        };
        store.saveCredential(cred, (err, credential) => {
            if (err) {
                res.send(403, "saving credential failed");
            }
            else {
                res.send(`To complete your authentication, put '${cred._id.substring(cred._id.length - 6)}' in our chat.`);
            }
        });
        let botStorage = bot.get("storage");
        let botContext = { persistConversationData: true, persistUserData: false };
        let botData = {};
        botData.conversationData.botauth = {};
        botData.conversationData.botauth[cred._id.slice(-6)] = cred;
        botStorage.saveData(botContext, botData, (err) => { });
    });
}
exports.add = add;
