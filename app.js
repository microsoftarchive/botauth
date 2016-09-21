var botauth = function() {

};

botauth.prototype.middleware = function(options) {
    var self = this;
    
    return { 
        botbuilder: function(session, next) {
            console.log("[botbuilder]");
            next();
        },
        receive: function(session, next) {
            console.log("[receive]");
            next();
        },
        send: function(session, next) {
            console.log("[send]");
            next();
        }
    };
}

module.exports = new botauth();