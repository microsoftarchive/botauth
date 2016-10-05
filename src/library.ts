import builder = require("botbuilder");

export const name : string = "botauth";

export function build() {
    let authlib = new builder.Library(name);
    authlib.dialog("auth", new builder.SimpleDialog(function(session : builder.Session, args : any) {

        console.log("[botauth:auth] args = %j", args);
        console.log("[botauth:auth] userData = %j", session.userData);
        let providerId = args.providerId;
        let authUrl = args.authUrl;

        if(session.userData && session.userData.botauth && session.userData.botauth.tokens && session.userData.botauth.tokens[providerId]) {
            console.log("[botauth:auth] resumed");
            session.endDialog("thanks. you're signed in");
        } else {
            console.log("[botauth:auth] started");
            var msg = new builder.Message(session)
                .attachments([ 
                    new builder.SigninCard(session)
                        .text("Connect to OAuth Provider") 
                        .button("connect", "https://botauth.ngrok.io/botauth/auth?address=" + Buffer.from(JSON.stringify(session.message.address)).toString('base64'))
                ]);

            session.send(msg); 
        }
    }).cancelAction("cancel", "cancelling authentication...", { matches: /cancel/, dialogArgs : false } ));

    return authlib;
};