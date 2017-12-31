using System;
using System.Net;
using System.Net.Http;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;
using System.Threading;
using System.Security.Cryptography;
using System.Reflection;
using Microsoft.Bot.Builder.Dialogs;
using Microsoft.Bot.Builder.Dialogs.Internals;
using Microsoft.Bot.Connector;
using Autofac;
using BotAuth.Models;
using Microsoft.Rest;

namespace BotAuth.Controllers
{
    public class CallbackController : ApiController
    {
        private static RNGCryptoServiceProvider rngCsp = new RNGCryptoServiceProvider();
        private static readonly uint MaxWriteAttempts = 5;

        [HttpGet]
        [Route("Callback")]
        public async Task<HttpResponseMessage> Callback()
        {
            return Request.CreateErrorResponse(HttpStatusCode.BadRequest, new Exception());
        }

        [HttpGet]
        [Route("Callback")]
        public async Task<HttpResponseMessage> Callback([FromUri] string code, [FromUri] string state, CancellationToken cancellationToken)
        {
            try
            {
                // Use the state parameter to get correct IAuthProvider and ResumptionCookie
                var decoded = Encoding.UTF8.GetString(HttpServerUtility.UrlTokenDecode(state));
                var queryString = HttpUtility.ParseQueryString(decoded);
                var assembly = Assembly.Load(queryString["providerassembly"]);
                var type = assembly.GetType(queryString["providertype"]);
                var providername = queryString["providername"];
                IAuthProvider authProvider;
                if (type.GetConstructor(new Type[] { typeof(string) }) != null)
                    authProvider = (IAuthProvider)Activator.CreateInstance(type, providername);
                else
                    authProvider = (IAuthProvider)Activator.CreateInstance(type);

                // Get the conversation reference
                var conversationRef = UrlToken.Decode<ConversationReference>(queryString["conversationRef"]);
                
                Activity message = conversationRef.GetPostToBotMessage();
                using (var scope = DialogModule.BeginLifetimeScope(Conversation.Container, message))
                {
                    // Get the UserData from the original conversation
                    IBotDataStore<BotData> stateStore = scope.Resolve<IBotDataStore<BotData>>();
                    var key = Address.FromActivity(message);
                    var userData = await stateStore.LoadAsync(key, BotStoreType.BotUserData, CancellationToken.None);
                    
                    // Get Access Token using authorization code
                    var authOptions = userData.GetProperty<AuthenticationOptions>($"{authProvider.Name}{ContextConstants.AuthOptions}");
                    var token = await authProvider.GetTokenByAuthCodeAsync(authOptions, code);

                    // Generate magic number and attempt to write to userdata
                    int magicNumber = GenerateRandomNumber();
                    bool writeSuccessful = false;
                    uint writeAttempts = 0;
                    while (!writeSuccessful && writeAttempts++ < MaxWriteAttempts)
                    {
                        try
                        {
                            userData.SetProperty($"{authProvider.Name}{ContextConstants.AuthResultKey}", token);
                            if (authOptions.UseMagicNumber)
                            {
                                userData.SetProperty($"{authProvider.Name}{ContextConstants.MagicNumberKey}", magicNumber);
                                userData.SetProperty($"{authProvider.Name}{ContextConstants.MagicNumberValidated}", "false");
                            }
                            await stateStore.SaveAsync(key, BotStoreType.BotUserData, userData, CancellationToken.None);
                            await stateStore.FlushAsync(key, CancellationToken.None);
                            writeSuccessful = true;
                        }
                        catch (Exception)
                        {
                            writeSuccessful = false;
                        }
                    }
                    var resp = new HttpResponseMessage(HttpStatusCode.OK);
                    if (!writeSuccessful)
                    {
                        message.Text = String.Empty; // fail the login process if we can't write UserData
                        await Conversation.ResumeAsync(conversationRef, message);
                        resp.Content = new StringContent("<html><body>Could not log you in at this time, please try again later</body></html>", System.Text.Encoding.UTF8, @"text/html");
                    }
                    else
                    {
                        await Conversation.ResumeAsync(conversationRef, message);
                        if (authOptions.UseMagicNumber)
                        {
                            resp.Content = new StringContent($"<html><body>Almost done! Please copy this number and paste it back to your chat so your authentication can complete:<br/> <h1>{magicNumber}</h1>.</body></html>", System.Text.Encoding.UTF8, @"text/html");
                        }
                        else
                        {
                            resp.Content = new StringContent($"<html><body>Your authentication is complete!</body></html>", System.Text.Encoding.UTF8, @"text/html");
                        }
                    }
                    return resp;
                }
            }
            catch (Exception ex)
            {
                // Callback is called with no pending message as a result the login flow cannot be resumed.
                return Request.CreateErrorResponse(HttpStatusCode.BadRequest, ex);
            }
        }

        private int GenerateRandomNumber()
        {
            int number = 0;
            byte[] randomNumber = new byte[1];
            do
            {
                rngCsp.GetBytes(randomNumber);
                var digit = randomNumber[0] % 10;
                number = number * 10 + digit;
            } while (number.ToString().Length < 6);
            return number;
        }
    }
}
