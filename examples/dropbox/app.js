"use strict";

const url = require("url");
const path = require("path");
const https = require("https");
const restify = require("restify");
const builder = require("botbuilder");
const envx = require("envx");
// const botauth = require("botauth"); //use this one
const botauth = require("../../lib");
const Dropbox = require("dropbox");

const upload = require("./upload");
const UploadRecognizer = require("./recognizer");

const DropboxOAuth2Strategy = require("passport-dropbox-oauth2").Strategy;

//contextual service information
const WEBSITE_HOSTNAME = envx("WEBSITE_HOSTNAME");
const PORT = envx("PORT", 3998);

//bot application identity
const MICROSOFT_APP_ID = envx("MICROSOFT_APP_ID");
const MICROSOFT_APP_PASSWORD = envx("MICROSOFT_APP_PASSWORD");

//oauth details for dropbox
const DROPBOX_APP_ID = envx("DROPBOX_APP_ID");
const DROPBOX_APP_SECRET = envx("DROPBOX_APP_SECRET");

//secret used to encrypt botauth data
const BOTAUTH_SECRET = envx("BOTAUTH_SECRET");

// Setup Restify Server
var server = restify.createServer();
server.use(restify.bodyParser());
server.use(restify.queryParser());

server.get("/", (req, res) => {
    res.send("botauth sample for dropbox");
});

var connector = new builder.ChatConnector({
    appId : MICROSOFT_APP_ID,
    appPassword : MICROSOFT_APP_PASSWORD
});

var bot = new builder.UniversalBot(connector, { localizerSettings : { botLocalePath : path.join(__dirname, "./locale"), defaultLocale : "en" } });
server.post('/api/messages', connector.listen());

var ba = new botauth.BotAuthenticator(server, bot, { baseUrl: `https://${WEBSITE_HOSTNAME}`, secret : BOTAUTH_SECRET });
ba.provider("dropbox", (options) => {
    return new DropboxOAuth2Strategy({
        clientID : DROPBOX_APP_ID,
        clientSecret : DROPBOX_APP_SECRET,
        callbackURL : options.callbackURL
    }, (accessToken, refreshToken, profile, done) => {
        profile.accessToken = accessToken;
        profile.refreshToken = refreshToken;

        done(null, profile);
    });
});

bot.library("BotAuth").localePath(path.join(__dirname, "./locale"));

var recog = new UploadRecognizer("upload");

bot.dialog("/", new builder.IntentDialog({ recognizers : [ recog ]})
    .matches(/logout/, "/logout")
    .matches("upload", "/upload")
    .onDefault((session, args) => {
            session.endDialog("welcome");
    })
);

bot.dialog("/logout", (session) => {
    ba.logout(session, "dropbox");
    session.endDialog("logged_out");
});

bot.dialog("/upload", [].concat(
    (session, args, skip) => {
        //check if user is already connected or show a message
        if(!ba.profile(session, "dropbox")) {
            session.send("not_connected");
        }

        //save uploaded file information so we can get back to it         
        session.dialogData.attachments = session.message.attachments;
        session.save();

        skip();
    },
    ba.authenticate("dropbox"),
    (session, args, skip) => {
        let user = ba.profile(session, "dropbox");
        if(!(session.dialogData.attachments && session.dialogData.attachments.length > 0)) {
            return skip();
        }

        let attachmentUrl = session.dialogData.attachments[0].contentUrl;
        let filePath = "/bot.png"; // todo: how to get the file name from attachments???

        upload({ sourceUrl : attachmentUrl, dropboxToken : user.accessToken, path : filePath }, (err, result) => {
            session.endDialog(`uploaded your file to '${ result.path_display }' in your dropbox.`);
        });
    }
));

//start the server
server.listen(PORT, () => {
   console.log('%s listening to %s', server.name, server.url); 
});