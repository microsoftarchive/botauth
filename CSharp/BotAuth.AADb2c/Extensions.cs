using BotAuth.Models;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BotAuth.AADb2c
{
    public static class Extensions
    {
        public static AuthResult ToAuthResult(this JObject json)
        {
            var idTokenInfo = json.Value<string>("id_token").Split('.')[1];
            idTokenInfo = Base64UrlEncoder.Decode(idTokenInfo);
            var idTokenJson = JObject.Parse(idTokenInfo);

            var result = new AuthResult
            {
                AccessToken = json.Value<string>("access_token"),
                UserName = idTokenJson.Value<string>("name"),
                UserUniqueId = idTokenJson.Value<string>("oid"),
                ExpiresOnUtcTicks = DateTime.UtcNow.AddSeconds(3600).Ticks, //HACK???
                RefreshToken = json.Value<string>("refresh_token"),
                IdentityProvider = idTokenJson.Value<string>("idp")
            };

            return result;
        }
    }

    public static class Base64UrlEncoder
    {
        public static Encoding TextEncoding = Encoding.UTF8;

        private static char Base64PadCharacter = '=';
        private static char Base64Character62 = '+';
        private static char Base64Character63 = '/';
        private static char Base64UrlCharacter62 = '-';
        private static char Base64UrlCharacter63 = '_';

        private static byte[] DecodeBytes(string arg)
        {
            if (String.IsNullOrEmpty(arg))
            {
                throw new ApplicationException("String to decode cannot be null or empty.");
            }

            StringBuilder s = new StringBuilder(arg);
            s.Replace(Base64UrlCharacter62, Base64Character62);
            s.Replace(Base64UrlCharacter63, Base64Character63);

            int pad = s.Length % 4;
            s.Append(Base64PadCharacter, (pad == 0) ? 0 : 4 - pad);

            return Convert.FromBase64String(s.ToString());
        }

        public static string Decode(string arg)
        {
            return TextEncoding.GetString(DecodeBytes(arg));
        }
    }
}
