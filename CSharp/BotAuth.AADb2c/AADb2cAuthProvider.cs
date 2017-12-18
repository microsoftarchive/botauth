using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using BotAuth.Models;
using Microsoft.Bot.Builder.Dialogs;
using System.Diagnostics;
using System.Net.Http;
using Newtonsoft.Json.Linq;
using System.Web;

namespace BotAuth.AADb2c
{
    [Serializable]
    public class AADb2cAuthProvider : IAuthProvider
    {
        public string Name
        {
            get { return "AADb2cAuthProvider"; }
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
                    // Check for expired token
                    if (authResult.ExpiresOnUtcTicks > DateTime.UtcNow.Ticks)
                        return authResult;
                    else
                    {
                        // Use refresh token to get new token
                        HttpClient client = new HttpClient();
                        HttpContent content = new StringContent($"grant_type=refresh_token" +
                            $"&client_id={authOptions.ClientId}" +
                            $"&client_secret={HttpUtility.UrlEncode(authOptions.ClientSecret)}" +
                            $"&scope={String.Join("%20", authOptions.Scopes)}" +
                            $"&refresh_token={authResult.RefreshToken}" +
                            $"&redirect_uri={authOptions.RedirectUrl}");
                        content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/x-www-form-urlencoded");
                        using (var response = await client.PostAsync($"{authOptions.Authority}/oauth2/v2.0/token?p={authOptions.Policy}", content))
                        {
                            if (response.IsSuccessStatusCode)
                            {
                                var json = JObject.Parse(await response.Content.ReadAsStringAsync());
                                return json.ToAuthResult();
                            }
                            else
                            {
                                return null;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Trace.TraceError("Failed to renew token: " + ex.Message);
                    await context.PostAsync("Your credentials expired and could not be renewed automatically!");
                    await Logout(authOptions, context);
                    return null;
                }
            }
            else
                return null;
        }

        public async Task<string> GetAuthUrlAsync(AuthenticationOptions authOptions, string state)
        {
            // Build manually as MSAL does not provide a method for getting this
            var redirectUri = $"{authOptions.Authority}/oauth2/v2.0/authorize?" +
                $"client_id={authOptions.ClientId}&" +
                $"response_type=code&" +
                $"redirect_uri={authOptions.RedirectUrl}&" +
                $"response_mode=query&" +
                $"scope={String.Join("%20", authOptions.Scopes)}&" +
                $"state={state}&" +
                $"p={authOptions.Policy}";
            return redirectUri;
        }

        public async Task<AuthResult> GetTokenByAuthCodeAsync(AuthenticationOptions authOptions, string authorizationCode)
        {
            //TODO: manual
            HttpClient client = new HttpClient();
            HttpContent content = new StringContent($"grant_type=authorization_code" +
                $"&client_id={authOptions.ClientId}" +
                $"&client_secret={HttpUtility.UrlEncode(authOptions.ClientSecret)}" +
                $"&scope={String.Join("%20", authOptions.Scopes)}" +
                $"&code={authorizationCode}" + 
                $"&redirect_uri={authOptions.RedirectUrl}");
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/x-www-form-urlencoded");
            using (var response = await client.PostAsync($"{authOptions.Authority}/oauth2/v2.0/token?p={authOptions.Policy}", content))
            {
                if (response.IsSuccessStatusCode)
                {
                    var json = JObject.Parse(await response.Content.ReadAsStringAsync());
                    return json.ToAuthResult();
                }
                else
                {
                    return null;
                }
            }
        }

        public async Task Logout(AuthenticationOptions authOptions, IDialogContext context)
        {
            context.UserData.RemoveValue($"{this.Name}{ContextConstants.AuthResultKey}");
            context.UserData.RemoveValue($"{this.Name}{ContextConstants.MagicNumberKey}");
            context.UserData.RemoveValue($"{this.Name}{ContextConstants.MagicNumberValidated}");
            string signoutURl = $"{authOptions.Authority}/oauth2/logout?post_logout_redirect_uri={System.Net.WebUtility.UrlEncode(authOptions.RedirectUrl)}";
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
                    // Use refresh token to get new token
                    HttpClient client = new HttpClient();
                    HttpContent content = new StringContent($"grant_type=refresh_token" +
                        $"&client_id={options.ClientId}" +
                        $"&client_secret={HttpUtility.UrlEncode(options.ClientSecret)}" +
                        $"&scope={String.Join("%20", options.Scopes)}" +
                        $"&refresh_token={result.RefreshToken}" +
                        $"&redirect_uri={options.RedirectUrl}");
                    content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/x-www-form-urlencoded");
                    using (var response = await client.PostAsync($"{options.Authority}/oauth2/v2.0/token?p={options.Policy}", content))
                    {
                        if (response.IsSuccessStatusCode)
                        {
                            var json = JObject.Parse(await response.Content.ReadAsStringAsync());
                            result = json.ToAuthResult();
                            return result;
                        }
                        else
                            return null;
                    }
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
