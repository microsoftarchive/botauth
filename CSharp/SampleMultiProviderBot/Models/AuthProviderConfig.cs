using OAuth2;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Web;

namespace SampleMultiProviderBot.Models
{
    [Serializable]
    public class AuthProviderConfig : BotAuth.Models.AuthenticationOptions
    {
        public string ProviderName { get; set; }
        public string PictureEndpoint { get; set; }
        public override string ToString()
        {
            return this.ProviderName;
        }

        public static List<AuthProviderConfig> GetAuthProviders()
        {
            List<AuthProviderConfig> list = new List<AuthProviderConfig>();

            // Start by adding AAD v2
            list.Add(new AuthProviderConfig()
            {
                ProviderName = "Microsoft",
                PictureEndpoint = "https://graph.microsoft.com/beta/me/photo/$value",
                Authority = ConfigurationManager.AppSettings["aad:Authority"],
                ClientId = ConfigurationManager.AppSettings["aad:ClientId"],
                ClientSecret = ConfigurationManager.AppSettings["aad:ClientSecret"],
                Scopes = new string[] { "User.Read" },
                RedirectUrl = ConfigurationManager.AppSettings["aad:Callback"]
            });

            // Load all dynamic ClientTypes
            AuthorizationRoot authRoot = new AuthorizationRoot();
            foreach (var client in authRoot.Clients)
            {
                list.Add(new AuthProviderConfig()
                {
                    ProviderName = client.Name,
                    ClientType = client.Name,
                    PictureEndpoint = getPictureEndpoint(client.Name)
                });
            }

            return list;
        }

        private static string getPictureEndpoint(string clientType)
        {
            switch (clientType)
            {
                case "Google":
                    return "https://www.googleapis.com/userinfo/v2/me";
                case "Facebook":
                    return "https://graph.facebook.com/v2.5/me?fields=picture";
                case "Twitter":
                    return "https://api.twitter.com/1.1/users/show.json?user_id={}";
                case "LinkedIn":
                    return "https://api.linkedin.com/v1/people/~:(id,first-name,last-name,picture-url)?format=json";
                case "Yahoo":
                    return "https://social.yahooapis.com/v1/user/{guid}/profile";
                default:
                    return "";
            }
        }
    }
}