# Azure Active Directory v2 BotAuth Example

This bot retrieves the user's email with the user's access token after the user logs in with their AD or Microsoft account.  

## Setup Instructions

We assume you have already published your nodejs bot on a web service. 

### 1. Create AADv2 app (if you don't have one)

First, we will need to create a AADv2 app. Head over to the [app registration portal](https://apps.dev.microsoft.com/). Click on "Add an app" (under the "Converged Applications" section), give a name to your app and then click "create". 

Generate a password and make sure you save this password somewhere as you cannot go back to view it. Go down to the Platforms section, and click 'Add Platform'. Change the redirect url to 'https://YOUR_DOMAIN_GOES_HERE/botauth/aadv2/callback'. Scroll down and under the Profile section, change your home page URL to 'https://YOUR_DOMAIN_GOES_HERE/botauth/aadv2'. Save your changes at the bottom of the page. 

### 2. Setup AAD for web service in azure portal

Login to the [Azure portal](https://portal.azure.com) and go to your bot's service. Click on 'Authentication/Authorization' under the Settings section, and make sure App Service Authentiation is toggled to On. Make sure to leave the action to take to 'Allow Anonymous requests (no action)'. 

Click on Azure Active Directory, and click on 'Advanced'. Fill up the Client ID and Client Secret using the app ID and password that you generate from the app registration portal before. Click Ok, and then Save. 

### 3. Setup environment variables

Head over to the Application Settings of your app service in the portal. Scroll down till you see App Settings, which is where you will configure the environment variables needed. You will need to configure the following:

```
WEBSITE_HOSTNAME=YOUR_DOMAIN_NAME
BOTAUTH_SECRET=YOUR_BOT_SECRET
AZUREAD_APP_ID=YOUR_AD_APPID
AZUREAD_APP_PASSWORD=YOUR_AD_PASSWORD
AZUREAD_APP_REALM=common
```

Leave AZUREAD_APP_REALM to 'common', and replace everything else with your own values. The BOTAUTH_SECRET can be any value you'd like, but make it complex enough for it to be secure. 