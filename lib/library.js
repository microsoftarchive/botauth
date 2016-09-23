const builder = require("botbuilder");

var _lastAddress;

var authlib = new builder.Library("botauth");
authlib.dialog("auth", new builder.SimpleDialog(function(session, args) {
    _lastAddress = session.message.address;

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

module.exports = authlib;