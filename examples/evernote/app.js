"use strict";

const url = require("url");
const path = require("path");
const https = require("https");
const envx = require("envx");
const restify = require("restify");
const builder = require("botbuilder");
const botauth = require("botauth");
const clientSessions = require("client-sessions");
const Evernote = require("evernote");
const escapeHtml = require("escape-html");

const EvernoteStrategy = require("passport-evernote").Strategy;

//contextual service information
const WEBSITE_HOSTNAME = envx("WEB_HOSTNAME", envx("WEBSITE_HOSTNAME"));
const PORT = envx("PORT", 3998);

//bot application identity
const MICROSOFT_APP_ID = envx("MICROSOFT_APP_ID");
const MICROSOFT_APP_PASSWORD = envx("MICROSOFT_APP_PASSWORD");

//oauth details for evernote
const EVERNOTE_CONSUMER_KEY = envx("EVERNOTE_CONSUMER_KEY");
const EVERNOTE_CONSUMER_SECRET = envx("EVERNOTE_CONSUMER_SECRET");

//secret used to encrypt botauth data
const BOTAUTH_SECRET = envx("BOTAUTH_SECRET");

//Evernote Config
let config = { sandbox : true, china : false };

// Setup Restify Server
var server = restify.createServer();
server.use(restify.bodyParser());
server.use(restify.queryParser());
server.use(clientSessions({ cookieName: 'session', secret: BOTAUTH_SECRET, duration: 5*60*1000 }));

// routes for static content for showing the magic code at the end of authentication
server.get("/styles.css", restify.serveStatic({ directory : path.join(__dirname, "public"), file : "styles.css", maxAge: 0 }));
server.get("/code", restify.serveStatic({ directory : path.join(__dirname, "public"), file : "code.html", maxAge: 0 }));

// create the bot
var connector = new builder.ChatConnector({
    appId : MICROSOFT_APP_ID,
    appPassword : MICROSOFT_APP_PASSWORD
});

var bot = new builder.UniversalBot(connector, { localizerSettings : { botLocalePath : path.join(__dirname, "./locale"), defaultLocale : "en" } });
server.post('/api/messages', connector.listen());

// create the evernote authentication provider
var ba = new botauth.BotAuthenticator(server, bot, { baseUrl: `https://${WEBSITE_HOSTNAME}`, secret : BOTAUTH_SECRET, session: true, successRedirect : "/code" });
ba.provider("evernote", (options) => {
    let strategyOptions = {
        consumerKey : EVERNOTE_CONSUMER_KEY,
        consumerSecret : EVERNOTE_CONSUMER_SECRET,
        callbackURL : options.callbackURL
    }; 

    if(config.sandbox) {
        // override the oauth endpoints if we're using the evernote sandbox environment
        strategyOptions.requestTokenURL = 'https://sandbox.evernote.com/oauth';
        strategyOptions.accessTokenURL = 'https://sandbox.evernote.com/oauth';
        strategyOptions.userAuthorizationURL = 'https://sandbox.evernote.com/OAuth.action';
    }

    return new EvernoteStrategy(strategyOptions, (token, tokenSecret, profile, done) => {
            // add token information to profile so we can get access to it from our bot code
            profile.token = token;
            profile.tokenSecret = tokenSecret;

            done(null, profile);
        }
    );
});

// very simple bot to show functionality.  In a real bot, use LUIS to create a more human interaction
bot.dialog("/", new builder.IntentDialog()
    .matches(/logout/, "/logout")
    .matches(/take((\s+a)?\s+note(s)?)?/, "/takeNote")
    .onDefault((session, args) => {
        session.endDialog("welcome");
    })
);

bot.dialog("/logout", (session) => {
    ba.logout(session, "evernote");
    session.endDialog("logged_out");
});

bot.dialog("/takeNote", [].concat(
    ba.authenticate("evernote"),
    (session, args, skip) => {
        builder.Prompts.text(session, "What would you like the note to say?");
    },
    (session, args, skip) => {
        session.dialogData.noteContent = args.response;
        builder.Prompts.text(session, "What should the title of the note be?");
    },
    (session, args, skip) => {
        session.dialogData.noteTitle = args.response;

        let user = ba.profile(session, "evernote");
        let client = new Evernote.Client({
            token: user.token,
            sandbox: config.SANDBOX,
            china: config.CHINA
        });

        var noteStore = client.getNoteStore();
        noteStore.listNotebooks().then((notebooks) => {
            session.dialogData.notebookOptions = notebooks.reduce((p, c) => {
                p[c.name] = c;
                return p;
            }, {});

            builder.Prompts.choice(session, "Which notebook shall I put this in?", session.dialogData.notebookOptions);
        }).catch((error)=> {
            //useful for debugging but don't actually send raw error details to user
            session.endDialog("error accessing evernote: " + error);
        });
    },
    (session, args, skip) => {
        let notebook = session.dialogData.notebookOptions[args.response.entity];

        let user = ba.profile(session, "evernote");
        let client = new Evernote.Client({
            token: user.token,
            sandbox: config.SANDBOX,
            china: config.CHINA
        });
        let note = {
            title : session.dialogData.noteTitle,
            content : `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>${ escapeHtml(session.dialogData.noteContent) }</en-note>`, //make sure to html encode user generated content
            notebookGuid: notebook.guid
        };

        let noteStore = client.getNoteStore();
        noteStore.createNote(note).then((result)=> {
            session.endDialog(`I successfully saved your note to '${ notebook.name }'`);
        }).catch((error)=> {
            session.endDialog(`I encountered an error while trying to save your note: ${ JSON.stringify(error) }`);
        });
    }
));

//start the server
server.listen(PORT, () => {
   console.log('%s listening to %s', server.name, server.url); 
});
