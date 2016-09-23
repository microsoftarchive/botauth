const builder = require("botbuilder");
const passport = require("passport");

const authlib = require("./library");

var _bot;
var _server;
var _providers = {};
var _options = {};

/**
 * Constructor
 */
var botauth = function() {
    var baseURL = "https://localhost";
};

/**
 * Adds restify/express routes to handle oauth redirects, adds authentication dialogs to bot, and adds authentication middleware to bot. 
 * @param {Server} server 
 * @param {UniversalBot} bot
 * @param {} options
 * @return {BotAuth} this
 */
botauth.prototype.configure = function (server, bot, options) {
    _bot = bot;
    _server = server;
    _options = options;

    //todo: may need to verify queryParser and bodyParser are present.

    //register a route for signon action button.
    _server.get("/auth/:provider", function(req, res, next) {
        passport.authenticate(providerId, {
                state: req.query.aid
            })(req, res, next);
    });

    //register route for oauth callback
    _server.get('/auth/:provider/callback', 
        function(req, res, next) {
            return passport.authenticate(req.params.provider, { failureRedirect: '/' })(req, res, next);
        },
        function (req, res, next) {
            //todo: 
        }
    );

    //register bot middleware for global authentication rules
    bot.use(this.middleware({
        "facebook" : /facebook/ }
        ));

    //register library of auth dialogs
    bot.library(this.library());

    return this;
};

/**
 * Registers a provider with passportjs and may start monitoring for auth requests 
 * @param {String} name 
 * @param {Strategy} strategy
 * @param {} options
 * @return {BotAuth} this
 */
botauth.prototype.provider = function (name, options) {
    if(!_server) {
        throw Error("must call configure before calling provider");
    }

    var args = {
        callbackURL : this.baseURL + "/auth/" + name + "/callback"
    };
    console.log("callbackURL:%s", args.callbackURL);

    args = Object.assign(args, options.args);
    //todo: set callback url

    passport.use(name, new options.strategy(args, function(accessToken, refreshToken, profile, done) {
        profile.accessToken = accessToken;
        profile.refreshToken = refreshToken;
        return done(null, profile);
    }));

    return this;
};

/**
 * Returns a DialogWaterfallStep which provides authentication for a specific dialog 
 * @param {String} providerId 
 * @return {DialogWaterfallStep} 
 */
botauth.prototype.authenticate = function(providerId) {
    return function(session, result, skip) {
        console.log("[authfn: %s] %j %j", providerId, result, skip);
    };
};

botauth.prototype.library = function() {
    return authlib;
};

botauth.prototype.middleware = function(filters) {
    var self = this;

    //make sure that filters isn't null
    filters = filters || {};
    
    return { 
        botbuilder: function(session, next) {
            console.log("[botbuilder]");
            console.log("dialogId = %s", session.options.dialogId);

            for(var prop in filters) {
                var rx = filters[prop];
                if(rx && rx.test(session.options.dialogId)) {
                    console.log("%s provider should authenticate");
                } else {
                    
                }
            }

            if(!session.userData["authData"]) {
                //session.beginDialog("botauth:auth");
                next();
            } else {
                next();
            }
        }
    };
}

module.exports = new botauth();