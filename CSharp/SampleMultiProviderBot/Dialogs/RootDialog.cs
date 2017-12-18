using Microsoft.Bot.Builder.Dialogs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Threading.Tasks;
using Microsoft.Bot.Connector;
using System.Threading;
using BotAuth.Models;
using BotAuth.Dialogs;
using SampleMultiProviderBot.Models;
using BotAuth;
using BotAuth.AADv2;
using BotAuth.GenericOAuth2;
using System.Net.Http;

namespace SampleMultiProviderBot.Dialogs
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

            // Save the message for later
            context.ConversationData.SetValue<Activity>("OriginalMessage", (Activity)message);

            // Let the user chose a provider
            var providers = AuthProviderConfig.GetAuthProviders();
            PromptDialog.Choice(context, async (IDialogContext choiceContext, IAwaitable<AuthProviderConfig> choiceResult) =>
            {
                var providerConfig = await choiceResult;
                choiceContext.ConversationData.SetValue<AuthProviderConfig>("AuthProvider", providerConfig);
                IAuthProvider authProvider;
                if (providerConfig.ProviderName == "Microsoft")
                    authProvider = new MSALAuthProvider();
                else
                    authProvider = new GenericOAuth2Provider($"GenericOAuth2Provider{providerConfig.ClientType}");

                await choiceContext.Forward(new AuthDialog(authProvider, providerConfig), async (IDialogContext authContext, IAwaitable<AuthResult> authResult) =>
                {
                    var result = await authResult;

                    // Use token to call into service
                    var prov = authContext.ConversationData.Get<AuthProviderConfig>("AuthProvider");
                    if (prov.ProviderName == "Microsoft")
                    {
                        var bytes = await new HttpClient().GetStreamWithAuthAsync(result.AccessToken, prov.PictureEndpoint);
                        var pic = "data:image/png;base64," + Convert.ToBase64String(bytes);
                        var m = authContext.MakeMessage();
                        m.Attachments.Add(new Attachment("image/png", pic));
                        await authContext.PostAsync(m);
                    }
                    else
                    {
                        var json = await new HttpClient().GetWithAuthAsync(result.AccessToken, prov.PictureEndpoint);
                        var pic = "";
                        if (prov.ProviderName == "Google")
                            pic = json.Value<string>("picture");
                        else if (prov.ProviderName == "Facebook")
                            pic = json.SelectToken("picture.data").Value<string>("url");
                        else if (prov.ProviderName == "LinkedIn")
                            pic = json.Value<string>("pictureUrl");
                        var m = authContext.MakeMessage();
                        m.Attachments.Add(new Attachment("image/png", pic));
                        await authContext.PostAsync(m);
                    }

                    // Wait for another message
                    authContext.Wait(MessageReceivedAsync);
                }, choiceContext.ConversationData.Get<Activity>("OriginalMessage"), CancellationToken.None);
            }, providers, "Please select a provider we can use to look-up your information");
        }
    }
}