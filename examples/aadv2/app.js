'use strict';

const path = require('path');
const botauth = require('botauth');
const restify = require('restify');
const builder = require('botbuilder');
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const envx = require("envx");
const expressSession = require('express-session');
const https = require('https');
const request = require('request');

const WEBSITE_HOSTNAME = envx("WEBSITE_HOSTNAME");
const PORT = envx("PORT", 3998);
const BOTAUTH_SECRET = envx("BOTAUTH_SECRET");

//bot application identity
const MICROSOFT_APP_ID = envx("MICROSOFT_APP_ID");
const MICROSOFT_APP_PASSWORD = envx("MICROSOFT_APP_PASSWORD");

//oauth details for dropbox
const AZUREAD_APP_ID = envx("AZUREAD_APP_ID");
const AZUREAD_APP_PASSWORD = envx("AZUREAD_APP_PASSWORD");
const AZUREAD_APP_REALM = envx("AZUREAD_APP_REALM");

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(PORT, function () {
  console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
  appId: MICROSOFT_APP_ID,
  appPassword: MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());
server.get('/code', restify.serveStatic({
  'directory': path.join(__dirname, 'public'),
  'file': 'code.html'
}));

//=========================================================
// Auth Setup
//=========================================================

server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(expressSession({ secret: BOTAUTH_SECRET, resave: true, saveUninitialized: false }));
//server.use(passport.initialize());

var ba = new botauth.BotAuthenticator(server, bot, { session: true, baseUrl: `https://${WEBSITE_HOSTNAME}`, secret : BOTAUTH_SECRET, successRedirect: '/code' });

ba.provider("aadv2", (options) => {
    // Use the v2 endpoint (applications configured by apps.dev.microsoft.com)
    // For passport-azure-ad v2.0.0, had to set realm = 'common' to ensure authbot works on azure app service
    let oidStrategyv2 = {
      redirectUrl: options.callbackURL, //  redirect: /botauth/aadv2/callback
      realm: AZUREAD_APP_REALM,
      clientID: AZUREAD_APP_ID,
      clientSecret: AZUREAD_APP_PASSWORD,
      identityMetadata: 'https://login.microsoftonline.com/' + AZUREAD_APP_REALM + '/v2.0/.well-known/openid-configuration',
      skipUserProfile: false,
      validateIssuer: false,
      //allowHttpForRedirectUrl: true,
      responseType: 'code',
      responseMode: 'query',
      scope: ['email', 'profile', 'offline_access', 'https://outlook.office.com/mail.read'],
      passReqToCallback: true
    };

    let strategy = oidStrategyv2;

    return new OIDCStrategy(strategy,
        (req, iss, sub, profile, accessToken, refreshToken, done) => {
          if (!profile.displayName) {
            return done(new Error("No oid found"), null);
          }
          profile.accessToken = accessToken;
          profile.refreshToken = refreshToken;
          done(null, profile);
    });
});


//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog("/", new builder.IntentDialog()
    .matches(/logout/, "/logout")
    .matches(/signin/, "/signin")
    .onDefault((session, args) => {
        session.endDialog("welcome");
    })
);

bot.dialog("/logout", (session) => {
    ba.logout(session, "aadv2");
    session.endDialog("logged_out");
});

bot.dialog("/signin", [].concat(
    ba.authenticate("aadv2"),
    (session, args, skip) => {
        let user = ba.profile(session, "aadv2");
        session.endDialog(user.displayName);
        session.userData.accessToken = user.accessToken;
        session.userData.refreshToken = user.refreshToken;
        session.beginDialog('workPrompt');
    }
));

bot.dialog('workPrompt', [
  (session) => {
    getUserLatestEmail(session.userData.accessToken,
        function (requestError, result) {
          if (result && result.value && result.value.length > 0) {
            const responseMessage = 'Your latest email is: "' + result.value[0].Subject + '"';
            session.send(responseMessage);
            builder.Prompts.confirm(session, "Retrieve the latest email again?");
          }else{
            console.log('no user returned');
            if(requestError){
              console.error(requestError);
              session.send(requestError);
              // Get a new valid access token with refresh token
              getAccessTokenWithRefreshToken(session.userData.refreshToken, (err, body, res) => {

                if (err || body.error) {
                  session.send("Error while getting a new access token. Please try logout and login again. Error: " + err);
                  session.endDialog();
                }else{
                  session.userData.accessToken = body.accessToken;
                  getUserLatestEmail(session.userData.accessToken,
                    function (requestError, result) {
                      if (result && result.value && result.value.length > 0) {
                        const responseMessage = 'Your latest email is: "' + result.value[0].Subject + '"';
                        session.send(responseMessage);
                        builder.Prompts.confirm(session, "Retrieve the latest email again?");
                      }
                    }
                  );
                }
                
              });
            }
          }
        }
      );
  },
  (session, results) => {
    var prompt = results.response;
    if (prompt) {
      session.replaceDialog('workPrompt');
    } else {
      session.endDialog();
    }
  }
]);


function getAccessTokenWithRefreshToken(refreshToken, callback){
  var data = 'grant_type=refresh_token'
        + '&refresh_token=' + refreshToken
        + '&client_id=' + AZUREAD_APP_ID
        + '&client_secret=' + encodeURIComponent(AZUREAD_APP_PASSWORD)

  var options = {
      method: 'POST',
      url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      body: data,
      json: true,
      headers: { 'Content-Type' : 'application/x-www-form-urlencoded' }
  };

  request(options, function (err, res, body) {
      if (err) return callback(err, body, res);
      if (parseInt(res.statusCode / 100, 10) !== 2) {
          if (body.error) {
              return callback(new Error(res.statusCode + ': ' + (body.error.message || body.error)), body, res);
          }
          if (!body.access_token) {
              return callback(new Error(res.statusCode + ': refreshToken error'), body, res);
          }
          return callback(null, body, res);
      }
      callback(null, {
          accessToken: body.access_token,
          refreshToken: body.refresh_token
      }, res);
  }); 
}

function getUserLatestEmail(accessToken, callback) {
  var options = {
    host: 'outlook.office.com', //https://outlook.office.com/api/v2.0/me/messages
    path: '/api/v2.0/me/MailFolders/Inbox/messages?$top=1',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    }
  };
  https.get(options, function (response) {
    var body = '';
    response.on('data', function (d) {
      body += d;
    });
    response.on('end', function () {
      var error;
      if (response.statusCode === 200) {
        callback(null, JSON.parse(body));
      } else {
        error = new Error();
        error.code = response.statusCode;
        error.message = response.statusMessage;
        // The error body sometimes includes an empty space
        // before the first character, remove it or it causes an error.
        body = body.trim();
        error.innerError = body;
        callback(error, null);
      }
    });
  }).on('error', function (e) {
    callback(e, null);
  });
}