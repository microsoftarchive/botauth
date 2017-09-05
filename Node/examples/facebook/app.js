"use strict";

const restify = require("restify");
const builder = require("botbuilder");
const envx = require("envx");
const botauth = require("botauth");

const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;

//contextual service information
const WEBSITE_HOSTNAME = envx("WEB_HOSTNAME");
const PORT = envx("PORT", 3998);

//bot application identity
const MICROSOFT_APP_ID = envx("MICROSOFT_APP_ID");
const MICROSOFT_APP_PASSWORD = envx("MICROSOFT_APP_PASSWORD");

//oauth details for facebook
const FACEBOOK_APP_ID = envx("FACEBOOK_APP_ID");
const FACEBOOK_APP_SECRET = envx("FACEBOOK_APP_SECRET");

//encryption key for saved state
const BOTAUTH_SECRET = envx("BOTAUTH_SECRET"); 

const LUIS_URL = envx("LUIS_URL");

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
    .provider("facebook", (options) => { 
        return new FacebookStrategy({
            clientID : FACEBOOK_APP_ID,
            clientSecret : FACEBOOK_APP_SECRET,
            callbackURL : options.callbackURL
        }, (accessToken, refreshToken, profile, done) => {
            profile = profile || {};
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            
            return done(null, profile);
        });
    });

/**
 * Just a page to make sure the server is running
 */
server.get("/", (req, res) => {
    res.send("facebook");
});

//=========================================================
// Bot Dialogs
//=========================================================
var recog = new builder.LuisRecognizer(LUIS_URL);

bot.dialog('/', new builder.IntentDialog({ recognizers : [ recog ]})
    .matches("SayHello", "/hello")
    .matches("GetProfile", "/profile")
    .matches("Logout", "/logout")
    .onDefault((session, args) => {
        session.endDialog("I didn't understand that.  Try saying 'show my profile'.");
    })
);

bot.dialog("/hello", (session, args) => {
    session.endDialog("Hello. I can help you get information from facebook.  Try saying 'get profile'.");
});

bot.dialog("/profile", [].concat( 
    ba.authenticate("facebook"),
    function(session, results) {
        //get the facebook profile
        var user = ba.profile(session, "facebook");
        //var user = results.response;

        //call facebook and get something using user.accessToken 
        var client = restify.createJsonClient({
            url: 'https://graph.facebook.com',
            accept : 'application/json',
            headers : {
                "Authorization" : `OAuth ${ user.accessToken }`
            }
        });

        client.get(`/v2.8/me/picture?redirect=0`, (err, req, res, obj) => {
            if(!err) {
                console.log(obj);
                var msg = new builder.Message()
                    .attachments([
                        new builder.HeroCard(session)
                            .text(user.displayName)
                            .images([
                                new builder.CardImage(session).url(obj.data.url)
                                ]
                            )
                        ]
                    );
                session.endDialog(msg);
            } else {
                console.log(err);
                session.endDialog("error getting profile");
            }
        });
    }
));

bot.dialog("/logout", [
    (session, args, next) => {
        builder.Prompts.confirm(session, "are you sure you want to logout");        
    }, (session, args) => {
        if(args.response) {
            ba.logout(session, "facebook");
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