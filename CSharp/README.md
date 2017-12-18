# BotAuth for C#
BotAuth for C# is a package for handling authentication in a bot built using the Bot Framework and BotBuilder libraries. It contains a core library that handles authentication, a set of providers that are dependency injected into the core library, and samples that leverage the providers. More specific details are listed below:

## [BotAuth](/CSharp/BotAuth)
BotAuth is the core library that contains the following important files:
- [**Dialogs/AuthDialog.cs**](/CSharp/BotAuth/Dialogs/AuthDialog.cs): the dialog class for initiating the OAuth flow
- [**Controllers/CallbackController.cs**](/CSharp/BotAuth/Controllers/CallbackController.cs): the callback controller for getting access tokens from an authorization code
- [**IAuthProvider.cs**](/CSharp/BotAuth/IAuthProvider.cs): the interface that all providers need to implement
- [**Models/AuthenticationOptions.cs**](/CSharp/BotAuth/Models/AuthenticationOptions.cs): class used to initialize app details (ex: app id, app secret, scopes, redirect, etc) and passed into the AuthDialog
- [**Models/AuthResult.cs**](/CSharp/BotAuth/Models/AuthResult.cs): the result passed back from the AuthDialog

## Using BotAuth
To use BotAuth, you should install the NuGet package of the provider(s) you want to use (see NuGet section for more information on packages). Currently, BotAuth has providers for Azure AD v1, v2, and B2C applications as well as a generic [OAuth2](https://github.com/titarenko/OAuth2) provider that supports a number of other identities (Facebook, Google, LinkedIn, etc).

BotAuth is invoked by initializing an instance of AuthenticationOptions with your app details and passing that into the AuthDialog with a provider instance (implementing IAuthProvider). In the sample below, the MSALAuthProvider is used, which is a provider for Azure AD v2 applications. The AuthDialog returns an access token when the dialog resumes.

```CSharp
        public virtual async Task MessageReceivedAsync(IDialogContext context, IAwaitable<IMessageActivity> item)
        {
            var message = await item;

            // Initialize AuthenticationOptions and forward to AuthDialog for token
            AuthenticationOptions options = new AuthenticationOptions()
            {
                Authority = ConfigurationManager.AppSettings["aad:Authority"],
                ClientId = ConfigurationManager.AppSettings["aad:ClientId"],
                ClientSecret = ConfigurationManager.AppSettings["aad:ClientSecret"],
                Scopes = new string[] { "User.Read" },
                RedirectUrl = ConfigurationManager.AppSettings["aad:Callback"]
            };
            await context.Forward(new AuthDialog(new MSALAuthProvider(), options), async (IDialogContext authContext, IAwaitable<AuthResult> authResult) =>
            {
                var result = await authResult;

                // Use token to call into service
                var json = await new HttpClient().GetWithAuthAsync(result.AccessToken, "https://graph.microsoft.com/v1.0/me");
                await authContext.PostAsync($"I'm a simple bot that doesn't do much, but I know your name is {json.Value<string>("displayName")} and your UPN is {json.Value<string>("userPrincipalName")}");
            }, message, CancellationToken.None);
        }
```

Each of the providers have slight differences (largely in the use of AuthenticationOptions), so refer to the samples for provider-specific logic.

## Magic Numbers
BotAuth implements a magic number to provide additional security in group chats. This is an important addition to securing user-specific tokens in the correct user data and is defaulted to ON. In 1:1 chatbots, the magic number can be turned off by setting the **AuthenticationOptions** property for **UseMagicNumber** to false. All of the samples use the magic number, but can easily be disabled with this UseMagicNumber property.

## Samples
The repo contains 5 working bot samples. All are published with app details so that can immediately be debugged locally. There is a sample for each provider type and a sample that shows how to implement multiple providers in the same bot.

## Creating custom providers
To build a custom provider, you most install the BotAuth core package into your project and create a class that implements the IAuthProvider interface. This interface has 4 functions and a propery you need to implement so the provider can be dependency injected into the BotAuth core library at runtime. Refer to the existing providers if you want more information on how to implement this interface.

## NuGet
Each of the providers is and the core library is published to NuGet. If you are using a provider, the core library comes in automatically as a dependency. You should only leverage the core library directly if you are building a provider.