
## Pinterest botauth sample

Shows Pinterest oauth flow from a bot on a platform which is not facebook messenger such as Skype.  Uses the passport-pinterest oauth strategy.

## Configuration
* **MICROSOFT_APP_ID** - The Microsoft App ID used to register the bot with the botframework (https://dev.botframework.com/bots/new)
* **MICROSOFT_APP_PASSWORD** - The Microsoft App Password for the App ID used to register the bot with the botframework (https://dev.botframework.com/bots/new)
* **PINTEREST_APP_ID** -
* **PINTEREST_APP_SECRET** -
* **WEB_HOSTNAME && WEBSITE_HOSTNAME** - the domain your bot is hosted on (i.e. mybot.azurewebsites.net).
* **BOTAUTH_SECRET** - any random string (used to encrypt user data in bot storage)

The bot must be hosted on an https endpoint.
