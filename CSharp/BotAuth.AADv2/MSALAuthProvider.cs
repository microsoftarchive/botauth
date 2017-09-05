using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using BotAuth.Models;
using Microsoft.Bot.Builder.Dialogs;
using Microsoft.Identity.Client;
using System.Diagnostics;

namespace BotAuth.AADv2
{
    [Serializable]
    public class MSALAuthProvider : IAuthProvider
    {
        public string Name
        {
            get { return "MSALAuthProvider"; }
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

                try
                {
                    TokenCache tokenCache = new InMemoryTokenCacheMSAL(authResult.TokenCache).GetMsalCacheInstance();
                    ConfidentialClientApplication client = new ConfidentialClientApplication(authOptions.ClientId, 
                        authOptions.RedirectUrl, new ClientCredential(authOptions.ClientSecret), tokenCache, null);
                    var result = await client.AcquireTokenSilentAsync(authOptions.Scopes, client.GetUser(authResult.UserUniqueId));
                    authResult = result.FromMSALAuthenticationResult(tokenCache);
                    context.StoreAuthResult(authResult, this);
                }
                catch (Exception ex)
                {
                    Trace.TraceError("Failed to renew token: " + ex.Message);
                    await context.PostAsync("Your credentials expired and could not be renewed automatically!");
                    await Logout(authOptions, context);
                    return null;
                }
                return authResult;
            }
            else
                return null;
        }

        public async Task<string> GetAuthUrlAsync(AuthenticationOptions authOptions, string state)
        {
            Uri redirectUri = new Uri(authOptions.RedirectUrl);
            TokenCache tokenCache = new InMemoryTokenCacheMSAL().GetMsalCacheInstance();
            ConfidentialClientApplication client = new ConfidentialClientApplication(authOptions.ClientId, redirectUri.ToString(),
                new ClientCredential(authOptions.ClientSecret),
                tokenCache, null);
            var uri = await client.GetAuthorizationRequestUrlAsync(authOptions.Scopes, null, $"state={state}");
            return uri.ToString();
        }

        public async Task<AuthResult> GetTokenByAuthCodeAsync(AuthenticationOptions authOptions, string authorizationCode)
        {
            TokenCache tokenCache = new InMemoryTokenCacheMSAL().GetMsalCacheInstance();
            ConfidentialClientApplication client = new ConfidentialClientApplication(authOptions.ClientId, authOptions.RedirectUrl,
                new ClientCredential(authOptions.ClientSecret), tokenCache, null);
            Uri redirectUri = new Uri(authOptions.RedirectUrl);
            var result = await client.AcquireTokenByAuthorizationCodeAsync(authorizationCode, authOptions.Scopes);
            AuthResult authResult = result.FromMSALAuthenticationResult(tokenCache);
            return authResult;
        }

        public async Task Logout(AuthenticationOptions authOptions, IDialogContext context)
        {
            context.UserData.RemoveValue($"{this.Name}{ContextConstants.AuthResultKey}");
            context.UserData.RemoveValue($"{this.Name}{ContextConstants.MagicNumberKey}");
            context.UserData.RemoveValue($"{this.Name}{ContextConstants.MagicNumberValidated}");
            string signoutURl = "https://login.microsoftonline.com/common/oauth2/logout?post_logout_redirect_uri=" + System.Net.WebUtility.UrlEncode(authOptions.RedirectUrl);
            await context.PostAsync($"In order to finish the sign out, please click at this [link]({signoutURl}).");
        }

        public async Task<AuthResult> GetAccessTokenSilent(AuthenticationOptions options, IDialogContext context)
        {
            string validated = null;
            AuthResult result;
            if (context.UserData.TryGetValue($"{this.Name}{ContextConstants.AuthResultKey}", out result) &&
                context.UserData.TryGetValue($"{this.Name}{ContextConstants.MagicNumberValidated}", out validated) &&
                validated == "true")
            {

                try
                {
                    TokenCache tokenCache = new InMemoryTokenCacheMSAL(result.TokenCache).GetMsalCacheInstance();
                    ConfidentialClientApplication client = new ConfidentialClientApplication(options.ClientId,
                        options.RedirectUrl, new ClientCredential(options.ClientSecret), tokenCache, null);
                    var r = await client.AcquireTokenSilentAsync(options.Scopes, client.GetUser(result.UserUniqueId));
                    result = r.FromMSALAuthenticationResult(tokenCache);
                    context.StoreAuthResult(result, this);
                    return result;
                }
                catch (Exception)
                {
                    return null;
                }
            }
            else
                return null;
        }
    }
}
