"use strict";

const restify = require("restify");
const builder = require("botbuilder");
const envx = require("envx");
const url = require("url");
const crypto = require("crypto");
//const botauth = require("botauth");
const botauth = require("../../../botauth");

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
const FACEBOOK_PAGE_ACCESS_TOKEN = envx("FACEBOOK_PAGE_ACCESS_TOKEN");

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
var ba = new botauth.BotAuthenticator(server, bot, {baseUrl: "https://" + WEBSITE_HOSTNAME, secret: BOTAUTH_SECRET})
    .provider("facebook", function (options) {
        return new FacebookStrategy({
            clientID: FACEBOOK_APP_ID,
            clientSecret: FACEBOOK_APP_SECRET,
            callbackURL: options.callbackURL
        }, function (accessToken, refreshToken, profile, done) {
            profile = profile || {};
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;

            return done(null, profile);
        });
    });

/**
 * Just a page to make sure the server is running
 */
server.get("/", function (req, res) {
    res.send("facebook");
});

server.get("/account_linking", function (req, res) {
    console.log(req.query.account_linking_token);
    console.log(req.query.redirect_uri);

    //var redirectUri = url.parse(req.query.redirect_uri);
    var authCode = encodeURIComponent(crypto.randomBytes(54).toString("base64"));
    res.status(302);
    res.header("Location", `${req.query.redirect_uri}&authorization_code=${authCode}`);
    res.send("redirecting");
    res.end();
});

//=========================================================
// Bot Dialogs
//=========================================================
var recog = new builder.LuisRecognizer(LUIS_URL);

bot.dialog('/', new builder.IntentDialog({recognizers: [recog]})
    .matches("SayHello", "/hello")
    .matches("GetProfile", "/profile")
    .matches("Logout", "/logout")
    .onDefault(function (session, args) {
        console.log(session.message);
        session.endDialog("I didn't understand that.  Try saying 'show my profile'.");
    }));

bot.dialog("/hello", function (session, args) {
    console.log("********USER*********");
    console.log(JSON.stringify(session.message.user));
    console.log("******ADDRESS******");
    console.log(session.message.address);
    session.endDialog("Hello. I can help you get information from facebook.  Try saying 'get profile'.");
});

bot.on("account_linking_callback", function (data) {
    console.log(data);
});

bot.dialog("/profile", function(session, args) {
    var client = restify.createJsonClient({url: 'https://graph.facebook.com'});
    client.get(`/v2.6/${encodeURI(session.message.address.user.id)}?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=${encodeURIComponent(FACEBOOK_PAGE_ACCESS_TOKEN)}`, function (err, req, res, obj) {
        console.log(obj);
        var msg = new builder.Message(session);
        msg.addAttachment(new builder.HeroCard(session).text(`${obj.first_name} ${obj.last_name}`).subtitle(obj.locale).images([new builder.CardImage(session).url(obj.profile_pic)]));
        session.endDialog(msg);
    });
});

// bot.dialog("/profile", function (session, args) {
//     var msg = new builder.Message(session).sourceEvent({
//         "facebook": {
//             "attachment": {
//                 "type": "template",
//                 "payload": {
//                     "template_type": "generic",
//                     "elements": [{
//                         "title": "Welcome to M-Bank",
//                         "image_url": "http://www.example.com/images/m-bank.png",
//                         "buttons": [{
//                             "type": "account_link",
//                             "url": "https://botauth.ngrok.io/account_linking"
//                         }]
//                     }]
//                 }
//             }
//         }
//     });
//     session.endDialog(msg);
// });

// bot.dialog("/profile", [].concat(
//     //ba.authenticate("facebook"),
//     function (session, results) {
//         //get the facebook profile
//         var user = ba.profile(session, "facebook");
//         //var user = results.response;

//         //call facebook and get something using user.accessToken 
//         var client = restify.createJsonClient({
//             url: 'https://graph.facebook.com',
//             accept: 'application/json',
//             headers: {
//                 "Authorization": `OAuth ${user.accessToken}`
//             }
//         });

//         client.get(`/v2.8/me/picture?redirect=0`, function (err, req, res, obj) {
//             if (!err) {
//                 console.log(obj);
//                 var msg = new builder.Message()
//                     .attachments([
//                         new builder.HeroCard(session)
//                             .text(user.displayName)
//                             .images([
//                                 new builder.CardImage(session).url(obj.data.url)
//                                 ]
//                             )
//                         ]
//                     );
//                 session.endDialog(msg);
//             } else {
//                 console.log(err);
//                 session.endDialog("error getting profile");
//             }
//         });
//     }
// ));

bot.dialog("/logout", [
    function (session, args, next) {
        builder.Prompts.confirm(session, "are you sure you want to logout");        
    }, function (session, args) {
        if (args.response) {
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