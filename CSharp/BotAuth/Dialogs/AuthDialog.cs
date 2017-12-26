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
        protected string loginButtonText { get; }
        protected string pasteNumberTip { get; }
        protected string loggedInTip { get; }
        protected string numberValidationErrorText { get; }
        protected string authenticationErrorText { get; }
        protected string signInCardReplaceText { get; }

        /// <summary>
        /// Create an instance of AuthDialog object.
        /// </summary>
        /// <param name="authProvider">Authentication provider.</param>
        /// <param name="authOptions">Authentication options.</param>
        /// <param name="prompt">Prompt text on sign in card. Default value is "Please click to sign in: ".</param>
        /// <param name="loginButtonText">Text on login button. Default value is "Authentication Required".</param>
        /// <param name="pasteNumberTip">Text of the tip to let user paste back the number. Default value is "Please paste back the number you received in your authentication screen.".</param>
        /// <param name="loggedInTip">Text after user logged. Default value is "Thanks {0}. You are now logged in. ". "{0}" is the placeholder for user name.</param>
        /// <param name="numberValidationErrorText">Text for number validation error. Default value is "I'm sorry but I couldn't validate your number. Please try authenticating once again. ".</param>
        /// <param name="authenticationErrorText">Text for authentication error. Default value is "I'm sorry but something went wrong while authenticating.".</param>
        /// <param name="signInCardReplaceText">Replace the sign in card with text for channel doesn't support sign in card. "{0}" is the placeholder for authentication url. Will use sign in card if it is set to null or string.Empty. Default value is null. </param>
        public AuthDialog(IAuthProvider authProvider, AuthenticationOptions authOptions,
                string prompt = "Please click to sign in: ",
                string loginButtonText = "Authentication Required",
                string pasteNumberTip = "Please paste back the number you received in your authentication screen.",
                string loggedInTip = "Thanks {0}. You are now logged in. ",
                string numberValidationErrorText = "I'm sorry but I couldn't validate your number. Please try authenticating once again. ",
                string authenticationErrorText = "I'm sorry but something went wrong while authenticating.",
                string signInCardReplaceText = null)
        {
            this.authProvider = authProvider;
            this.authOptions = authOptions;
            this.prompt = prompt;
            this.loginButtonText = loginButtonText;
            this.pasteNumberTip = pasteNumberTip;
            this.loggedInTip = loggedInTip;
            this.numberValidationErrorText = numberValidationErrorText;
            this.authenticationErrorText = authenticationErrorText;
            this.signInCardReplaceText = signInCardReplaceText;
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
                            await context.PostAsync(pasteNumberTip);

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
                                await context.PostAsync(string.Format(loggedInTip, authResult.UserName));
                                context.Done(authResult);
                            }
                            else
                            {
                                context.UserData.RemoveValue($"{this.authProvider.Name}{ContextConstants.AuthResultKey}");
                                context.UserData.SetValue<string>($"{this.authProvider.Name}{ContextConstants.MagicNumberValidated}", "false");
                                context.UserData.RemoveValue($"{this.authProvider.Name}{ContextConstants.MagicNumberKey}");
                                await context.PostAsync(numberValidationErrorText);
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
                    await context.PostAsync(authenticationErrorText);
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
            if (string.IsNullOrEmpty(signInCardReplaceText))
            {
                Attachment plAttachment = null;
                SigninCard plCard;
                if (msg.ChannelId == "msteams")
                    plCard = new SigninCard(prompt, GetCardActions(authenticationUrl, "openUrl"));
                else
                    plCard = new SigninCard(prompt, GetCardActions(authenticationUrl, "signin"));
                plAttachment = plCard.ToAttachment();

                IMessageActivity response = context.MakeMessage();
                response.Recipient = msg.From;
                response.Type = "message";

                response.Attachments = new List<Attachment>();
                response.Attachments.Add(plAttachment);

                return context.PostAsync(response); 
            }
            else
            {
                return context.PostAsync(string.Format(signInCardReplaceText, authenticationUrl));
            }
        }

        private List<CardAction> GetCardActions(string authenticationUrl, string actionType)
        {
            List<CardAction> cardButtons = new List<CardAction>();
            CardAction plButton = new CardAction()
            {
                Value = authenticationUrl,
                Type = actionType,
                Title = loginButtonText
            };
            cardButtons.Add(plButton);
            return cardButtons;
        }
    }
}
