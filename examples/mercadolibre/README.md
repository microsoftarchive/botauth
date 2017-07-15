
## MercadoLibre botauth sample

Shows MercadoLibre oauth flow from a bot.  Uses the passport-mercadolibre oauth strategy.

## Configuration
* **MICROSOFT_APP_ID** - The Microsoft App ID used to register the bot with the botframework (https://dev.botframework.com/bots/new)
* **MICROSOFT_APP_PASSWORD** - The Microsoft App Password for the App ID used to register the bot with the botframework (https://dev.botframework.com/bots/new)
* **MERCADOLIBRE_APP_ID** -
* **MERCADOLIBRE_SECRET_KEY** -
* **WEB_HOSTNAME && WEBSITE_HOSTNAME** - the domain your bot is hosted on (i.e. mybot.azurewebsites.net).
* **BOTAUTH_SECRET** - any random string (used to encrypt user data in bot storage)

The bot must be hosted on an https endpoint.
