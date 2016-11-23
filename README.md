# BotAuth [![Build Status](https://travis-ci.org/mattdot/botauth.svg?branch=master)](https://travis-ci.org/mattdot/botauth)

	botauth is still pre-release and under active development. Please evaluate and provide feedback.

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
var auth = new botauth.BotAuthenticator(server, bot, { secret : "something secret",  baseUrl : "https://" + WEBSITE_HOSTNAME })
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

## Examples
* [Facebook](https://github.com/mattdot/botauth/tree/master/examples/facebook)
* [Dropbox](https://github.com/mattdot/botauth/tree/master/examples/dropbox)
* [Rakuten](https://github.com/mattdot/botauth/tree/master/examples/rakuten)
* [Azure AD v1](https://github.com/mattdot/botauth/tree/master/examples/aadv1) (coming soon)
* [Azure AD v2](https://github.com/mattdot/botauth/tree/master/examples/aadv2) (coming soon)
* [Visual Studio Online](https://github.com/mattdot/botauth/tree/master/examples/vso) (coming soon)

More sample code is available at https://github.com/mattdot/botauth/tree/master/examples/

# Authenticated Dialog
Use the *authenticate* method to make sure that the user has authenticated with a OAuth provider before continuing the dialog waterfall steps.  *botauth* puts the user profile from the passport strategy in `session.userData.botauth`.  *authenticate* returns an array of dialog steps which can be combined with your own dialog steps.  Anything after *authenticate* will only be reached if the user successfully authenticates.

```javascript
bot.dialog('/dropbox', [].concat(
	auth.authenticate("dropbox"),
	function(session, results) {
		var user = auth.profile(session, "dropbox");
		session.endDialog("Welcome " + user.displayName);
	}
));
```

This project has adopted the [Microsoft Open Source Code of
Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct
FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com)
with any additional questions or comments.
