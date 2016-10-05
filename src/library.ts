import builder = require("botbuilder");

const libraryName : string = "botauth";
const dialogName : string = "auth";

export const name : string = `${libraryName}:${dialogName}`;

export function build() {
    let authlib = new builder.Library(libraryName);
    authlib.dialog(dialogName, new builder.SimpleDialog(function(session : builder.Session, args : any) {

        console.log(`[${name}] args = %j`, args);
        console.log(`[${name}] userData = %j`, session.userData);
        let providerId = args.providerId;
        let authUrl = args.authUrl;

        if(session.userData && session.userData.botauth && session.userData.botauth.tokens && session.userData.botauth.tokens[providerId]) {
            console.log(`[${name}] resumed`);
            session.endDialog("thanks. you're signed in");
        } else {
            console.log(`[${name}] started`);
            let state : string = Buffer.from(JSON.stringify(session.message.address)).toString('base64');
            var msg = new builder.Message(session)
                .attachments([ 
                    new builder.SigninCard(session)
                        .text("Connect to OAuth Provider") 
                        .button("connect", `${authUrl}?state=${state}`)
                ]);

            session.send(msg); 
        }
    }).cancelAction("cancel", "cancelling authentication...", { matches: /cancel/, dialogArgs : false } ));

    return authlib;
};