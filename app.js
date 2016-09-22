const builder = require("botbuilder");

var authlib = new builder.Library("botauth");
authlib.dialog("auth", new builder.SimpleDialog(function(session, args) {
        if(args.resumed) {
            console.log("[botauth:auth] resumed");
        } else {
            console.log("[botauth:auth] started");
        }
}));

var botauth = function() {
    
};

botauth.prototype.auth = function(providerId) {
    return function(session, args, next) {
        console.log("[authfn: %s]", providerId);
        next();
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
            console.log("[botbuilder]\n%j", session);
            if(session.userData["authData"]) {

            } else {
                next();
            }
        }
    };
}

module.exports = new botauth();