using Autofac;
using BotAuth.Models;
using Microsoft.Bot.Builder.ConnectorEx;
using Microsoft.Bot.Builder.Dialogs;
using Microsoft.Bot.Builder.Dialogs.Internals;
using Microsoft.Bot.Connector;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Web;

namespace BotAuth.Dialogs
{
    [Serializable]
    public class AuthDialog : IDialog<AuthResult>
    {
        protected IAuthProvider authProvider;
        protected AuthenticationOptions authOptions;
        protected string prompt { get; }

        public AuthDialog(IAuthProvider AuthProvider, AuthenticationOptions AuthOptions, string Prompt = "Please click to sign in: ")
        {
            this.prompt = Prompt;
            this.authProvider = AuthProvider;
            this.authOptions = AuthOptions;
        }

        public async Task StartAsync(IDialogContext context)
        {
            context.Wait(MessageReceivedAsync);
        }

        public async Task MessageReceivedAsync(IDialogContext context, IAwaitable<IMessageActivity> argument)
        {
            var msg = await argument;

            AuthResult authResult;
            string validated = "";
            int magicNumber = 0;
            if (context.UserData.TryGetValue($"{this.authProvider.Name}{ContextConstants.AuthResultKey}", out authResult))
            {
                try
                {
                    //IMPORTANT: DO NOT REMOVE THE MAGIC NUMBER CHECK THAT WE DO HERE. THIS IS AN ABSOLUTE SECURITY REQUIREMENT
                    //REMOVING THIS WILL REMOVE YOUR BOT AND YOUR USERS TO SECURITY VULNERABILITIES. 
                    //MAKE SURE YOU UNDERSTAND THE ATTACK VECTORS AND WHY THIS IS IN PLACE.
                    context.UserData.TryGetValue<string>($"{this.authProvider.Name}{ContextConstants.MagicNumberValidated}", out validated);
                    if (validated == "true" || !this.authOptions.UseMagicNumber)
                    {
                        // Try to get token to ensure it is still good
                        var token = await this.authProvider.GetAccessToken(this.authOptions, context);
                        if (token != null)
                            context.Done(token);
                        else
                        {
                            // Save authenticationOptions in UserData
                            context.UserData.SetValue<AuthenticationOptions>($"{this.authProvider.Name}{ContextConstants.AuthOptions}", this.authOptions);

                            // Get ConversationReference and combine with AuthProvider type for the callback
                            var conversationRef = context.Activity.ToConversationReference();
                            var state = getStateParam(conversationRef);
                            string authenticationUrl = await this.authProvider.GetAuthUrlAsync(this.authOptions, state);
                            await PromptToLogin(context, msg, authenticationUrl);
                            context.Wait(this.MessageReceivedAsync);
                        }
                    }
                    else if (context.UserData.TryGetValue<int>($"{this.authProvider.Name}{ContextConstants.MagicNumberKey}", out magicNumber))
                    {
                        if (msg.Text == null)
                        {
                            await context.PostAsync($"Please paste back the number you received in your authentication screen.");

                            context.Wait(this.MessageReceivedAsync);
                        }
                        else
                        {
                            // handle at mentions in Teams
                            var text = msg.Text;
                            if (text.Contains("</at>"))
                                text = text.Substring(text.IndexOf("</at>") + 5).Trim();

                            if (text.Length >= 6 && magicNumber.ToString() == text.Substring(0, 6))
                            {
                                context.UserData.SetValue<string>($"{this.authProvider.Name}{ContextConstants.MagicNumberValidated}", "true");
                                await context.PostAsync($"Thanks {authResult.UserName}. You are now logged in. ");
                                context.Done(authResult);
                            }
                            else
                            {
                                context.UserData.RemoveValue($"{this.authProvider.Name}{ContextConstants.AuthResultKey}");
                                context.UserData.SetValue<string>($"{this.authProvider.Name}{ContextConstants.MagicNumberValidated}", "false");
                                context.UserData.RemoveValue($"{this.authProvider.Name}{ContextConstants.MagicNumberKey}");
                                await context.PostAsync($"I'm sorry but I couldn't validate your number. Please try authenticating once again. ");
                                context.Wait(this.MessageReceivedAsync);
                            }
                        }
                    }
                }
                catch
                {
                    context.UserData.RemoveValue($"{this.authProvider.Name}{ContextConstants.AuthResultKey}");
                    context.UserData.SetValue($"{this.authProvider.Name}{ContextConstants.MagicNumberValidated}", "false");
                    context.UserData.RemoveValue($"{this.authProvider.Name}{ContextConstants.MagicNumberKey}");
                    await context.PostAsync($"I'm sorry but something went wrong while authenticating.");
                    context.Done<AuthResult>(null);
                }
            }
            else
            {
                // Try to get token
                var token = await this.authProvider.GetAccessToken(this.authOptions, context);
                if (token != null)
                    context.Done(token);
                else
                {
                    if (msg.Text != null &&
                        CancellationWords.GetCancellationWords().Contains(msg.Text.ToUpper()))
                    {
                        context.Done<AuthResult>(null);
                    }
                    else
                    {
                        // Save authenticationOptions in UserData
                        context.UserData.SetValue<AuthenticationOptions>($"{this.authProvider.Name}{ContextConstants.AuthOptions}", this.authOptions);

                        // Get ConversationReference and combine with AuthProvider type for the callback
                        var conversationRef = context.Activity.ToConversationReference();
                        var state = getStateParam(conversationRef);
                        string authenticationUrl = await this.authProvider.GetAuthUrlAsync(this.authOptions, state);
                        await PromptToLogin(context, msg, authenticationUrl);
                        context.Wait(this.MessageReceivedAsync);
                    }
                }
            }
        }

        private string getStateParam(ConversationReference conversationRef)
        {
            var queryString = HttpUtility.ParseQueryString(string.Empty);
            queryString["conversationRef"] = UrlToken.Encode(conversationRef);
            queryString["providerassembly"] = this.authProvider.GetType().Assembly.FullName;
            queryString["providertype"] = this.authProvider.GetType().FullName;
            queryString["providername"] = this.authProvider.Name;
            return HttpServerUtility.UrlTokenEncode(Encoding.UTF8.GetBytes(queryString.ToString()));
        }

        /// <summary>
        /// Prompts the user to login. This can be overridden inorder to allow custom prompt messages or cards per channel.
        /// </summary>
        /// <param name="context">Chat context</param>
        /// <param name="msg">Chat message</param>
        /// <param name="authenticationUrl">OAuth URL for authenticating user</param>
        /// <returns>Task from Posting or prompt to the context.</returns>
        protected virtual Task PromptToLogin(IDialogContext context, IMessageActivity msg, string authenticationUrl)
        {
            Attachment plAttachment = null;
            SigninCard plCard;
            if (msg.ChannelId == "msteams")
                plCard = new SigninCard(this.prompt, GetCardActions(authenticationUrl, "openUrl"));
            else
                plCard = new SigninCard(this.prompt, GetCardActions(authenticationUrl, "signin"));
            plAttachment = plCard.ToAttachment();

            IMessageActivity response = context.MakeMessage();
            response.Recipient = msg.From;
            response.Type = "message";

            response.Attachments = new List<Attachment>();
            response.Attachments.Add(plAttachment);

            return context.PostAsync(response);
        }

        private List<CardAction> GetCardActions(string authenticationUrl, string actionType)
        {
            List<CardAction> cardButtons = new List<CardAction>();
            CardAction plButton = new CardAction()
            {
                Value = authenticationUrl,
                Type = actionType,
                Title = "Authentication Required"
            };
            cardButtons.Add(plButton);
            return cardButtons;
        }
    }
}
