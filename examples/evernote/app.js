"use strict";

const url = require("url");
const path = require("path");
const https = require("https");
const envx = require("envx");
const restify = require("restify");
const builder = require("botbuilder");
const botauth = require("botauth");
const session = require("express-session");
const Evernote = require("evernote").Evernote;

const EvernoteStrategy = require("passport-evernote").Strategy;

//contextual service information
const WEBSITE_HOSTNAME = envx("WEBSITE_HOSTNAME");
const PORT = envx("PORT", 3998);

//bot application identity
const MICROSOFT_APP_ID = envx("MICROSOFT_APP_ID");
const MICROSOFT_APP_PASSWORD = envx("MICROSOFT_APP_PASSWORD");

//oauth details for evernote
const EVERNOTE_CONSUMER_KEY = envx("EVERNOTE_CONSUMER_KEY");
const EVERNOTE_CONSUMER_SECRET = envx("EVERNOTE_CONSUMER_SECRET");

//secret used to encrypt botauth data
const BOTAUTH_SECRET = envx("BOTAUTH_SECRET");

// Setup Restify Server
var server = restify.createServer();
server.use(restify.bodyParser());
server.use(restify.queryParser());
server.use(session({ 
    secret : BOTAUTH_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}));

server.get("/", (req, res) => {
    res.send("botauth sample for evernote");
});

var connector = new builder.ChatConnector({
    appId : MICROSOFT_APP_ID,
    appPassword : MICROSOFT_APP_PASSWORD
});

var bot = new builder.UniversalBot(connector, { localizerSettings : { botLocalePath : path.join(__dirname, "./locale"), defaultLocale : "en" } });
server.post('/api/messages', connector.listen());

var ba = new botauth.BotAuthenticator(server, bot, { baseUrl: `https://${WEBSITE_HOSTNAME}`, secret : BOTAUTH_SECRET, session: true });
ba.provider("evernote", (options) => {
    return new EvernoteStrategy({
        requestTokenURL: 'https://sandbox.evernote.com/oauth',
        accessTokenURL: 'https://sandbox.evernote.com/oauth',
        userAuthorizationURL: 'https://sandbox.evernote.com/OAuth.action',

        consumerKey : EVERNOTE_CONSUMER_KEY,
        consumerSecret : EVERNOTE_CONSUMER_SECRET,
        callbackURL : options.callbackURL,
        session: false
    }, (token, tokenSecret, profile, done) => {
        profile.token = token;
        profile.tokenSecret = tokenSecret;

        done(null, profile);
    });
});

bot.dialog("/", new builder.IntentDialog()
    .matches(/logout/, "/logout")
    .matches(/hello/, "/hello")
    .onDefault((session, args) => {
            session.endDialog("welcome");
    })
);

bot.dialog("/logout", (session) => {
    ba.logout(session, "dropbox");
    session.endDialog("logged_out");
});

bot.dialog("/hello", [].concat(
    ba.authenticate("evernote"),
    (session, args, skip) => {
        let user = ba.profile(session, "evernote");
        
        session.endDialog("hello " + user.displayName );
    }
));

bot.dialog("/notebooks", [].concat(
    ba.authenticate("evernote"),
    (session, args, skip) => {
        let config = { sandbox : true, china : false };
        let user = ba.profile(session, "evernote");

        let client = new Evernote.Client({
            token: user.token,
            sandbox: config.SANDBOX,
            china: config.CHINA
        });

        var noteStore = client.getNoteStore();
        noteStore.listNotebooks(function(err, notebooks){
            session.endDialog(`you have ${ notebooks.length } notebooks`);
        });
    }
))

//start the server
server.listen(PORT, () => {
   console.log('%s listening to %s', server.name, server.url); 
});