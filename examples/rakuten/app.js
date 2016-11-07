"use strict";

const restify = require("restify");
const builder = require("botbuilder");
const envx = require("envx");
const botauth = require("botauth");

const passport = require("passport");
const RakutenStrategy = require("passport-rakuten").RakutenStrategy;

//contextual service information
const WEBSITE_HOSTNAME = envx("WEB_HOSTNAME");
const PORT = envx("PORT", 3998);

//bot application identity
const MICROSOFT_APP_ID = envx("MICROSOFT_APP_ID");
const MICROSOFT_APP_PASSWORD = envx("MICROSOFT_APP_PASSWORD");

//oauth details for facebook
const RAKUTEN_APP_ID = envx("RAKUTEN_APP_ID");
const RAKUTEN_APP_SECRET = envx("RAKUTEN_APP_SECRET");

//encryption key for saved state
const BOTAUTH_SECRET = envx("BOTAUTH_SECRET"); 

// Setup Restify Server
var server = restify.createServer();
server.use(restify.bodyParser());
server.use(restify.queryParser());

// Create chat connector with bot's Microsoft app identity
var connector = new builder.ChatConnector({
    appId: MICROSOFT_APP_ID,
    appPassword: MICROSOFT_APP_PASSWORD
});

// Create bot builder client and connect it to restify server
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

// Initialize with the strategies we want to use
var ba = new botauth.BotAuthenticator(server, bot, { baseUrl : "https://" + WEBSITE_HOSTNAME, secret : BOTAUTH_SECRET })
    .provider("raktuen", (options) => { 
        return new RakutenStrategy({
            clientID : RAKUTEN_APP_ID,
            clientSecret : RAKUTEN_APP_SECRET,
            callbackURL : options.callbackURL,
            scope : ["rakuten_favoritebookmark_read"],
            skipUserProfile : true
        }, (accessToken, refreshToken, profile, done) => {
            //botauth stores profile object in bot userData, so make sure any token data you need is included
            profile = profile || {};
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            profile.provider = "rakuten"; //workaround, shouldn't need this
            return done(null, profile);
        });
    });

/**
 * Just a page to make sure the server is running
 */
server.get("/", (req, res) => {
    res.send("rakuten");
});

//=========================================================
// Bot Dialogs
//=========================================================
bot.dialog('/', new builder.IntentDialog()
    .matches(/(hi)|(hello)/, "/hello")
    .matches(/(get\s*)?bookmarks/, "/bookmarks")
    .matches(/log\s?out/, "/logout")
    .onDefault((session, args) => {
        session.endDialog("I didn't understand that.  Try saying 'get bookmarks'.");
    })
);

bot.dialog("/hello", (session, args) => {
    session.endDialog("Hello. I can help you get information from rakuten.  Try saying 'get bookmarks'.");
});

bot.dialog("/bookmarks", [].concat( 
    ba.authenticate("raktuen"),
    function(session, results) {
        //get the facebook profile
        var user = ba.profile(session, "raktuen");

        //todo: get bookmarks and not just dump user info in chat
        session.endDialog(`your user info is ${ JSON.stringify(user) }`);
    }
));

bot.dialog("/logout", [
    (session, args, next) => {
        builder.Prompts.confirm(session, "are you sure you want to logout");        
    }, (session, args) => {
        if(args.response) {
            ba.logout(session, "raktuen");
            session.endDialog("you've been logged out.");
        } else {
            session.endDialog("you're still logged in");
        }
    }
]);

//start the server
server.listen(PORT, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

 