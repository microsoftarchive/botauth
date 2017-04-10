"use strict";

const restify = require("restify");
const builder = require("botbuilder");
const envx = require("envx");
const botauth = require("botauth");

const passport = require("passport");
const MercadoLibreStrategy = require("passport-mercadolibre").Strategy;

//contextual service information
const WEBSITE_HOSTNAME = envx("WEB_HOSTNAME");
const PORT = envx("PORT", 3998);

//bot application identity
const MICROSOFT_APP_ID = envx("MICROSOFT_APP_ID");
const MICROSOFT_APP_PASSWORD = envx("MICROSOFT_APP_PASSWORD");

//oauth details for Mercado Libre
const MERCADOLIBRE_APP_ID = envx("MERCADOLIBRE_APP_ID");
const MERCADOLIBRE_SECRET_KEY = envx("MERCADOLIBRE_SECRET_KEY");

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
    .provider("mercadolibre", (options) => {
        return new MercadoLibreStrategy({
            clientID : MERCADOLIBRE_APP_ID,
            clientSecret : MERCADOLIBRE_SECRET_KEY,
            scope: [ 'read_public', 'read_relationships' ],
            callbackURL: options.callbackURL
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
    res.send("mercadolibre");
});

//=========================================================
// Bot Dialogs
//=========================================================
bot.dialog('/', new builder.IntentDialog()
    .matches(/^hello/i, "/hello")
    .matches(/^profile/i, "/profile")
    .matches(/^logout/i, "/logout")
    .onDefault((session, args) => {
        session.endDialog("I didn't understand that.  Try saying 'profile'.");
    })
);

bot.dialog("/hello", (session, args) => {
    session.endDialog("Hello. I can help you get information from Mercado Libre.  Try saying 'profile'.");
});

bot.dialog("/profile", [].concat(
    ba.authenticate("mercadolibre"),
    function(session, results) {
        //get the facebook profile
        var user = ba.profile(session, "mercadolibre");

        //todo: get interesting info on a card and not just dump user info in chat
        session.endDialog(`your user info is ${ JSON.stringify(user) }`);
    }
));

bot.dialog("/logout", [
    (session, args, next) => {
        builder.Prompts.confirm(session, "are you sure you want to logout");
    }, (session, args) => {
        if(args.response) {
            ba.logout(session, "mercadolibre");
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
