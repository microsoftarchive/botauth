"use strict";
const passport = require("passport");
function add(server, bot) {
    server.get('/botauth/:providerId/auth', function (req, res, next) {
        let providerId = req.params.providerId;
        let state = req.query.state;
        return passport.authenticate(providerId, { state: state })(req, res, next);
    });
    server.get('/botauth/:providerId/auth/callback', function (req, res, next) {
        let providerId = req.params.providerId;
        return passport.authenticate(providerId)(req, res, next);
    }, function (req, res) {
        let providerId = req.params.providerId;
        let state = req.query.state;
        let encodedAddr = req.query.address;
        var addr = JSON.parse(Buffer.from(encodedAddr, 'base64').toString('utf-8'));
        var botStorage = bot.get("storage");
        var botContext = { address: addr, userId: addr.user.id, conversationId: addr.conversation.id, persistUserData: true, persistConversationData: true };
        botStorage.getData(botContext, function (err, data) {
            console.log("\n[rest:/botauth/auth(getData)]\n%j", data);
            var cs = data.privateConversationData["BotBuilder.Data.SessionState"].callstack;
            var csi = cs.findIndex(function (el, ind, arr) { return el.id === "botauth:authd"; });
            if (!data.userData.botauth)
                data.userData.botauth = {};
            data.userData.botauth.tokens = Object.assign({}, data.userData.botauth.tokens, {}[providerId] = { accessToken: encodedAddr });
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
        });
    });
}
exports.add = add;
