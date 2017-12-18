using BotAuth.Models;
using Microsoft.Bot.Builder.Dialogs;
using Microsoft.IdentityModel.Clients.ActiveDirectory;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BotAuth.AADv1
{
    [Serializable]
    public class ADALAuthProvider : IAuthProvider
    {
        public string Name
        {
            get { return "ADALAuthProvider"; }
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
                    InMemoryTokenCacheADAL tokenCache = new InMemoryTokenCacheADAL(authResult.TokenCache);
                    AuthenticationContext authContext = new AuthenticationContext(authOptions.Authority, tokenCache);
                    var result = await authContext.AcquireTokenSilentAsync(authOptions.ResourceId, 
                        new ClientCredential(authOptions.ClientId, authOptions.ClientSecret), 
                        new UserIdentifier(authResult.UserUniqueId, UserIdentifierType.UniqueId));
                    authResult = result.FromADALAuthenticationResult(tokenCache);
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
            AuthenticationContext context = new AuthenticationContext(authOptions.Authority);
            var uri = await context.GetAuthorizationRequestUrlAsync(
                authOptions.ResourceId,
                authOptions.ClientId,
                redirectUri,
                Microsoft.IdentityModel.Clients.ActiveDirectory.UserIdentifier.AnyUser,
                $"state={state}");
            return uri.ToString();
        }

        public async Task<AuthResult> GetTokenByAuthCodeAsync(AuthenticationOptions authOptions, string authorizationCode)
        {
            InMemoryTokenCacheADAL tokenCache = new InMemoryTokenCacheADAL();
            AuthenticationContext context = new AuthenticationContext(authOptions.Authority, tokenCache);
            Uri redirectUri = new Uri(authOptions.RedirectUrl);
            var result = await context.AcquireTokenByAuthorizationCodeAsync(authorizationCode, redirectUri, new ClientCredential(authOptions.ClientId, authOptions.ClientSecret));
            AuthResult authResult = result.FromADALAuthenticationResult(tokenCache);
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
            AuthResult result;
            if (context.UserData.TryGetValue($"{this.Name}{ContextConstants.AuthResultKey}", out result))
            {
                try
                {
                    InMemoryTokenCacheADAL tokenCache = new InMemoryTokenCacheADAL(result.TokenCache);
                    AuthenticationContext authContext = new AuthenticationContext(options.Authority, tokenCache);
                    var r = await authContext.AcquireTokenSilentAsync(options.ResourceId,
                        new ClientCredential(options.ClientId, options.ClientSecret),
                        new UserIdentifier(result.UserUniqueId, UserIdentifierType.UniqueId));
                    result = r.FromADALAuthenticationResult(tokenCache);
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
