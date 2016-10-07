"use strict";
const passport = require("passport");
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
        let state = req.query.state;
        store.findAuthorization(state, (findErr, authorization) => {
            if (!findErr) {
                if (authorization) {
                    console.log("authorization found: %j", authorization);
                    req.locals = Object.assign({}, req.locals, { authorization: authorization });
                    next();
                }
                else {
                    console.log("authorization not found");
                    req.locals = Object.assign({}, req.locals, { authorization: authorization });
                    next();
                }
            }
            else {
                next(findErr);
            }
        });
    }, (req, res, next) => {
        let providerId = req.params.providerId;
        console.log(`[botauth/${providerId}/callback]`);
        if (!req.locals.authorization || !req.locals.authorization.address) {
            res.send(403, "Authorization token is invalid or has expired.");
            return;
        }
        let addr = req.locals.authorization.address;
        let botStorage = bot.get("storage");
        let botContext = { address: addr, userId: addr.user.id, conversationId: addr.conversation.id, persistUserData: true, persistConversationData: true };
        botStorage.getData(botContext, (getErr, data) => {
            console.log("\n[rest:/botauth/auth(getData)]\n%j\n%j", getErr, data);
            if (!getErr) {
                let providerToken = {};
                providerToken[providerId] = req.user;
                if (!data.userData.botauth)
                    data.userData.botauth = {};
                data.userData.botauth.tokens = Object.assign({}, data.userData.botauth.tokens, providerToken);
                console.log("**TOKENS**\n%j\n", data.userData);
                botStorage.saveData(botContext, data, function (saveError) {
                    if (saveError) {
                        console.log("error saving data %j", saveError);
                    }
                    else {
                        console.log("success saving data");
                    }
                    bot.receive({
                        type: "message",
                        agent: "botbuilder",
                        source: addr.channelId,
                        sourceEvent: {},
                        address: addr,
                        user: addr.user,
                        text: ""
                    });
                    res.send(addr);
                });
            }
        });
    });
}
exports.add = add;
