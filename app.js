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

        session.send(msg); 
    }
}));

var _bot;
var _server;

var botauth = function() {
    
};

botauth.prototype.auth = function(providerId) {
    return function(session, result, skip) {
        console.log("[authfn: %s] %j %j", providerId, result, skip);
    };
}

botauth.prototype.configure = function (server, bot, options) {
    _bot = bot;
    _server = server;

    bot.use(this.middleware());
    bot.library(this.library());

    return this;
};

botauth.prototype.provider = function (name, options) {
    if(!_server) {
        throw Error("must call configure before calling provider");
    }

    _server.get("/auth/" + name, function(req, res) {

    });

    return this;
};

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