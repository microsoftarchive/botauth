# Overview 

	botauth is still pre-release and under active development. APIs may change until we get to v1.0.

*botauth* is authentication middleware for bots built using the [botframework](http://botframework.com) and nodejs. *botauth* is leverages [passportjs](http://passportjs.org) authentication strategies to help bot developers connect to 3rd party oauth providers. You can use *botauth* to connect your bot's users to their Facebook, Dropbox, or any other API protected by OAuth 2.0. 

# Setup
*botauth* is available as an npm package 
```bash
npm install --save botauth
```	
# Getting Started
```javascript
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
var auth = new botauth.Authenticator(server, bot, storage, { baseUrl : "https://" + WEBSITE_HOSTNAME })
.provider("dropbox", function(options) { 
	return new DropboxOAuth2Strategy({
    		clientID : DROPBOX_APP_ID,
    		clientSecret : DROPBOX_APP_SECRET,
		callbackURL : options.callbackURL
	}, function(accessToken, refreshToken, profile, done) {
		profile.accessToken = accessToken;
		profile.refreshToken = refreshToken;
		done(null, profile);
	});
});

//start the server
server.listen(PORT, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
```
More sample code is available at https://github.com/mattdot/botauth-sample/

# Authenticated Dialog
Use the *authenticate* method to make sure that the user has authenticated with a OAuth provider before continuing the dialog waterfall steps.  *botauth* puts the user profile from the passport strategy in `session.userData.botauth`.  *authenticate* returns an array of dialog steps which can be combined with your own dialog steps.  Anything after *authenticate* will only be reached if the user successfully authenticates.

```javascript
bot.dialog('/dropbox', [].concat(
	auth.authenticate("dropbox"),
	function(session, results) {
		session.endDialog("Welcome " + session.userData.botauth.dropbox.displayName);
	}
));
```
