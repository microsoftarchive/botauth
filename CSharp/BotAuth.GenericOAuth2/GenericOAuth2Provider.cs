using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using BotAuth.Models;
using Microsoft.Bot.Builder.Dialogs;
using OAuth2.Configuration;
using Config = System.Configuration;
using OAuth2;
using System.Collections.Specialized;

namespace BotAuth.GenericOAuth2
{
    [Serializable]
    public class GenericOAuth2Provider : IAuthProvider
    {
        public GenericOAuth2Provider(string name)
        {
            this.name = name;
        }

        private string name;
        public string Name
        {
            get { return this.name; }
        }

        public async Task<AuthResult> GetAccessToken(AuthenticationOptions authOptions, IDialogContext context)
        {
            AuthResult authResult;
            string validated = null;
            if (context.UserData.TryGetValue($"{this.Name}{ContextConstants.AuthResultKey}", out authResult) &&
                (!authOptions.UseMagicNumber ||
                (context.UserData.TryGetValue($"{this.Name}{ContextConstants.MagicNumberValidated}", out validated) &&
                validated == "true")))
            {
                AuthorizationRoot authRoot = new AuthorizationRoot();
                var client = authRoot.Clients.FirstOrDefault(i => i.Name == authOptions.ClientType);
                if (client != null)
                {
                    // Prepare the response
                    if (client is OAuth2.Client.OAuth2Client && !String.IsNullOrEmpty(((OAuth2.Client.OAuth2Client)client).AccessToken))
                    {
                        authResult.ExpiresOnUtcTicks = ((OAuth2.Client.OAuth2Client)client).ExpiresAt.ToUniversalTime().Ticks;
                        authResult.AccessToken = ((OAuth2.Client.OAuth2Client)client).AccessToken;
                    }
                    else if (client is OAuth2.Client.OAuthClient && !String.IsNullOrEmpty(((OAuth2.Client.OAuthClient)client).AccessToken))
                    {
                        authResult.AccessToken = ((OAuth2.Client.OAuthClient)client).AccessToken;
                    }
                    return authResult;
                }
                else
                    return null;
            }
            else
                return null;
        }

        public async Task<string> GetAuthUrlAsync(AuthenticationOptions authOptions, string state)
        {
            AuthorizationRoot authRoot = new AuthorizationRoot();
            var client = authRoot.Clients.FirstOrDefault(i => i.Name == authOptions.ClientType);
            return client.GetLoginLinkUri(state);
        }

        public async Task<AuthResult> GetTokenByAuthCodeAsync(AuthenticationOptions authOptions, string authorizationCode)
        {
            AuthorizationRoot authRoot = new AuthorizationRoot();
            var client = authRoot.Clients.FirstOrDefault(i => i.Name == authOptions.ClientType);
            NameValueCollection parameters = new NameValueCollection();
            parameters.Add("code", authorizationCode);
            var userInfo = client.GetUserInfo(parameters);

            // Prepare the response
            var authResult = new AuthResult();
            authResult.UserName = $"{userInfo.FirstName} {userInfo.LastName}";
            authResult.UserUniqueId = userInfo.Id;
            if (client is OAuth2.Client.OAuth2Client)
            {
                authResult.ExpiresOnUtcTicks = ((OAuth2.Client.OAuth2Client)client).ExpiresAt.ToUniversalTime().Ticks;
                authResult.AccessToken = ((OAuth2.Client.OAuth2Client)client).AccessToken;
            }
            else if (client is OAuth2.Client.OAuthClient)
            {
                authResult.AccessToken = ((OAuth2.Client.OAuthClient)client).AccessToken;
            }
            return authResult;
        }

        public async Task Logout(AuthenticationOptions authOptions, IDialogContext context)
        {
            context.UserData.RemoveValue($"{this.Name}{ContextConstants.AuthResultKey}");
            context.UserData.RemoveValue($"{this.Name}{ContextConstants.MagicNumberKey}");
            context.UserData.RemoveValue($"{this.Name}{ContextConstants.MagicNumberValidated}");
            await context.PostAsync($"Your sign in to {authOptions.ClientType} has been cleared.");
        }

        public async Task<AuthResult> GetAccessTokenSilent(AuthenticationOptions options, IDialogContext context)
        {
            return await GetAccessToken(options, context);
        }
    }
}
