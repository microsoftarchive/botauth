"use strict";
const builder = require("botbuilder");
const crypto = require("crypto");
const libraryName = "botauth";
const dialogName = "auth";
exports.name = `${libraryName}:${dialogName}`;
function build(store) {
    let authlib = new builder.Library(libraryName);
    authlib.dialog(dialogName, new builder.SimpleDialog(function (session, args) {
        console.log(`[${exports.name}] args %j`, args);
        let providerId = args ? args.providerId : "";
        let authUrl = args ? args.authUrl : "";
        if (session.userData && session.userData.botauth && session.userData.botauth.tokens && session.userData.botauth.tokens[providerId]) {
            console.log(`[${exports.name}] resumed`);
            session.endDialog("thanks. you're signed in");
        }
        else {
            console.log(`[${exports.name}] started`);
            let authId = crypto.randomBytes(32).toString('hex');
            let authObj = {
                _id: authId,
                address: session.message.address
            };
            store.saveAuthorization(authObj, (err, id) => {
                var connectUrl = `${authUrl}?state=${id}`;
                console.log("[authlib > store.saveAuthorization] %j %j", err, id);
                if (!err) {
                    var msg = new builder.Message(session)
                        .attachments([
                        new builder.SigninCard(session)
                            .text("Connect to OAuth Provider. You can say 'cancel' to go back without signing in.")
                            .button("connect", connectUrl)
                    ]);
                    session.send(msg);
                }
                else {
                    console.log("[authlib > store.saveAuthorization] error : %j", err);
                    throw err;
                }
            });
        }
    }).cancelAction("cancel", "cancelling authentication...", { matches: /cancel/, dialogArgs: false }));
    return authlib;
}
exports.build = build;
;
