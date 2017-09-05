using BotAuth;
using BotAuth.AADb2c;
using BotAuth.Dialogs;
using BotAuth.Models;
using Microsoft.Bot.Builder.Dialogs;
using Microsoft.Bot.Connector;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Web;

namespace SampleAADb2cBot.Dialogs
{
    [Serializable]
    public class RootDialog : IDialog<string>
    {
        public async Task StartAsync(IDialogContext context)
        {
            context.Wait(MessageReceivedAsync);
        }

        public virtual async Task MessageReceivedAsync(IDialogContext context, IAwaitable<IMessageActivity> item)
        {
            var message = await item;

            // Initialize AuthenticationOptions and forward to AuthDialog for token
            // NOTE: on scopes you must include the ClientId to get an access token
            AuthenticationOptions options = new AuthenticationOptions()
            {
                Authority = ConfigurationManager.AppSettings["aad:Authority"],
                ClientId = ConfigurationManager.AppSettings["aad:ClientId"],
                ClientSecret = ConfigurationManager.AppSettings["aad:ClientSecret"],
                Scopes = new string[] { ConfigurationManager.AppSettings["aad:ClientId"], "offline_access", "openid" },
                RedirectUrl = ConfigurationManager.AppSettings["aad:Callback"],
                Policy = ConfigurationManager.AppSettings["aad:Policy"]
            };
            await context.Forward(new AuthDialog(new AADb2cAuthProvider(), options), async (IDialogContext authContext, IAwaitable<AuthResult> authResult) =>
            {
                var result = await authResult;

                // Use token to call into service
                await authContext.PostAsync($"I'm a simple bot that doesn't do much, but I know your name is {result.UserName} and you are logged in using {result.IdentityProvider}");

                // Wait for another message
                authContext.Wait(MessageReceivedAsync);
            }, message, CancellationToken.None);
        }
    }
}