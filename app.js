const builder = require("botbuilder");

var authlib = new builder.Library("botauth");
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
                        .button("connect", "http://microsoft.com") 
                ]);
    
            session.send(msg); 
        }
}));

var botauth = function() {
    
};

botauth.prototype.auth = function(providerId) {
    return function(session, result, skip) {
        console.log("[authfn: %s] %j %j", providerId, result, skip);
    };
}

botauth.prototype.configure = function (bot, options) {
    bot.use(this.middleware());
    bot.library(this.library());
}

botauth.prototype.library = function() {
    return authlib;
};

botauth.prototype.middleware = function(options) {
    var self = this;
    
    return { 
        botbuilder: function(session, next) {
            console.log("[botbuilder]");
            if(!session.userData["authData"]) {
                session.beginDialog("botauth:auth");
            } else {
                next();
            }
        }
    };
}

module.exports = new botauth();