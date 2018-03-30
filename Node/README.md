# BotAuth [![Build Status](https://travis-ci.org/MicrosoftDX/botauth.svg?branch=master)](https://travis-ci.org/MicrosoftDX/botauth)

	botauth is still pre-release and under active development. Please evaluate and provide feedback.

*botauth* is authentication middleware for bots built using the [botframework](http://botframework.com) and nodejs. *botauth* is leverages [passportjs](http://passportjs.org) authentication strategies to help bot developers connect to 3rd party oauth providers. You can use *botauth* to connect your bot's users to their Facebook, Dropbox, or any other API protected by OAuth 2.0.

# Setup
*botauth* is available as an npm package
```bash
npm install --save botauth
```
# Getting Started
Create a *BotAuthenticator* object to configure authentication for your bot.

```javascript
const botauth = require("botauth");
const DropboxOAuth2Strategy = require("passport-dropbox-oauth2").Strategy;

...

 // Initialize with the strategies we want to use
var auth = new botauth.BotAuthenticator(server, bot, {
	secret : "something secret",
	baseUrl : "https://" + WEBSITE_HOSTNAME }
);

// Configure the Dropbox authentication provider using the passport-dropbox strategy
auth.provider("dropbox",
	function(options) {
		return new DropboxOAuth2Strategy(
			{
    				clientID : DROPBOX_APP_ID,
    				clientSecret : DROPBOX_APP_SECRET,
					callbackURL : options.callbackURL
			},
			function(accessToken, refreshToken, profile, done) {
				profile.accessToken = accessToken;
				profile.refreshToken = refreshToken;
				done(null, profile);
			}
		);
	}
);

```

## Authenticated Dialog
Use the *authenticate* method to make sure that the user has authenticated with a OAuth provider before continuing the dialog waterfall steps.  *botauth* puts the user profile from the passport strategy in `session.userData.botauth`.  *authenticate* returns an array of dialog steps which can be combined with your own dialog steps.  Anything after *authenticate* will only be reached if the user successfully authenticates.

```javascript
bot.dialog('/dropbox', [].concat(
	auth.authenticate("dropbox"), //use authenticate as a waterfall step
	function(session, results) {
		// this waterfall step will only be reached if authentication succeeded

		var user = auth.profile(session, "dropbox");
		session.endDialog("Welcome " + user.displayName);
	}
));
```

# Examples
* [Facebook](https://github.com/MicrosoftDX/botauth/tree/master/Node/examples/facebook)
* [Pinterest](https://github.com/MicrosoftDX/botauth/tree/master/Node/examples/pinterest)
* [Dropbox](https://github.com/MicrosoftDX/botauth/tree/master/Node/examples/dropbox)
* [Rakuten](https://github.com/MicrosoftDX/botauth/tree/master/Node/examples/rakuten)
* [Evernote](https://github.com/MicrosoftDX/botauth/tree/master/Node/examples/evernote)
* [MercadoLibre](https://github.com/MicrosoftDX/botauth/tree/master/Node/examples/mercadolibre)
* [Azure AD v2](https://github.com/MicrosoftDX/botauth/tree/master/Node/examples/aadv2)
* [Visual Studio Online](https://github.com/MicrosoftDX/botauth/tree/master/Node/examples/vso) (coming soon)

More sample code is available at https://github.com/MicrosoftDX/botauth/tree/master/Node/examples/

# About this project
This project has adopted the [Microsoft Open Source Code of
Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct
FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com)
with any additional questions or comments.
