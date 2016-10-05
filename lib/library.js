"use strict";
const builder = require("botbuilder");
const libraryName = "botauth";
const dialogName = "auth";
exports.name = `${libraryName}:${dialogName}`;
function build() {
    let authlib = new builder.Library(libraryName);
    authlib.dialog(dialogName, new builder.SimpleDialog(function (session, args) {
        console.log(`[${exports.name}] args = %j`, args);
        console.log(`[${exports.name}] userData = %j`, session.userData);
        let providerId = args.providerId;
        let authUrl = args.authUrl;
        if (session.userData && session.userData.botauth && session.userData.botauth.tokens && session.userData.botauth.tokens[providerId]) {
            console.log(`[${exports.name}] resumed`);
            session.endDialog("thanks. you're signed in");
        }
        else {
            console.log(`[${exports.name}] started`);
            let state = Buffer.from(JSON.stringify(session.message.address)).toString('base64');
            var msg = new builder.Message(session)
                .attachments([
                new builder.SigninCard(session)
                    .text("Connect to OAuth Provider")
                    .button("connect", `${authUrl}?state=${state}`)
            ]);
            session.send(msg);
        }
    }).cancelAction("cancel", "cancelling authentication...", { matches: /cancel/, dialogArgs: false }));
    return authlib;
}
exports.build = build;
;
