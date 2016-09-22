var botauth = function() {

};

botauth.prototype.middleware = function(options) {
    var self = this;
    
    return { 
        botbuilder: function(session, next) {
            console.log("[botbuilder]\n%j", session);
            next();
        },
        receive: function(session, next) {
            console.log("[receive]\n%j", session);
            next();
        },
        send: function(session, next) {
            console.log("[send]\n%j");
            next();
        }
    };
}

module.exports = new botauth();