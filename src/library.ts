import builder = require("botbuilder");

let authlib = new builder.Library("botauth");
authlib.dialog("auth", new builder.SimpleDialog(function(session, args) {

    if(args && args.resumed) {
        console.log("[botauth:auth] resumed");
        session.endDialog("thanks");
    } else {
        console.log("[botauth:auth] started");
        var msg = new builder.Message(session)
            .attachments([ 
                new builder.SigninCard(session) 
                    .text("Connect to OAuth Provider") 
                    .button("connect", "https://microsoft.com") 
            ]);

        session.endDialog(msg); 
    }
}));

export = authlib;