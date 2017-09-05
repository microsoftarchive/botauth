## Evernote BotAuth Sample

Shows how to create a nodejs bot which connects the user to their Evernote account using BotAuth OAuth.

## Requirements
There are a few things you need to do before you can setup this sample on your own server
* Go to https://dev.botframework.com and register your bot
* Go to https://dev.evernote.com and create a new API Key for your Evernote app

## Configuration
To setup the sample you need to configure the following environment variables

| Environment Variable       | Description                                                        | Required  | Default Value |
|----------------------------|--------------------------------------------------------------------|:---------:|:-------------:|
| PORT                       | the port your network server is hosted on                          | no        | 3998          |
| WEB_HOSTNAME               | the hostname of your server                                        | yes       |               |
| BOTAUTH_SECRET             | your own random string used to encrypt session and bot state       | yes       |               |
| MICROSOFT_APP_ID           | the App Id of your bot (from https://dev.botframework.com/)        | yes       |               |
| MICROSOFT_APP_PASSWORD     | the App Password of your bot (from https://dev.botframework.com/)  | yes       |               |
| EVERNOTE_CONSUMER_KEY      | the consumer key from your evernote app https://dev.evernote.com/  | yes       |               |
| EVERNOTE_CONSUMER_SECRET   | the consumer secret from your evernote app https://dev.evernote.com/  | yes    |               |

## Try it out

| Channel     | Join Url |
|-------------|----------|
| Skype       | [![add to skype](https://secure.skypeassets.com/content/dam/scom/images/add-bot-button/add-to-skype-buttons02-36px.png "")](https://join.skype.com/bot/87421e86-cd30-4817-8651-99ba663c2664) |
