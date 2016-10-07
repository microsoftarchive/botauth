# Overview 

	botauth is still pre-release and under active development. APIs may change until we get to v1.0.

*botauth* is authentication middleware for bots built using the [botframework](http://botframework.com) and nodejs. *botauth* is leverages [passportjs](http://passportjs.org) authentication strategies to help bot developers connect to 3rd party oauth providers. You can use *botauth* to connect your bot's users to their Facebook, Dropbox, or any other API protected by OAuth 2.0. 

# Setup
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

	// Create the storage connector for BotAuth
	var storage = new Storage(DB_URI);

	// Initialize with the strategies we want to use
	var auth = new botauth.Authenticator(server, bot, storage, { baseUrl : "https://" + WEBSITE_HOSTNAME })
    .provider("dropbox", { 
        strategy : DropboxOAuth2Strategy,
        args : {
            clientID : DROPBOX_APP_ID,
            clientSecret : DROPBOX_APP_SECRET
        }
    });
		
	//start the server
	server.listen(PORT, function () {
	   console.log('%s listening to %s', server.name, server.url); 
	});

# Authenticated Dialog
Use the *authenticate* method to make sure that the user has authenticated with a OAuth provider before continuing the dialog waterfall steps.  *botauth* puts the user profile from the passport strategy in `session.userData.botauth`

	bot.dialog('/dropbox', auth.authenticate("dropbox", [ 
  	function(session, results) {
    	session.endDialog("Welcome " + session.userData.botauth.dropbox.displayName);
 		}
	]));

# Storage Provider
The *botauth* framework needs a place to store state, and instead of embedding this storage mechanism within *botauth*, the framework requires the developer to provide a object which stores *botauth* state in whatever way you want.  For convenience an implementation is provided in the [authbot-mongoose](https://github.com/mattdot/authbot-mongoose) project which allows you to use mongodb or documentdb without having to write your own storage provider.

	npm install --save authbot-mongoose

The storage provider accepts a mongo style uri connection string. `mongodb://user:password@ds123456.mlab.com:46345/mydb`

	const Storage = require('authbot-mongoose');

	// Create the storage connector for BotAuth
	var storage = new Storage(DB_URI);
