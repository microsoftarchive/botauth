using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BotAuth.Models
{
    [Serializable]
    public class AuthenticationOptions
    {
        public AuthenticationOptions()
        {
            // Default magic number to yes as disabling is a significant security vulnerability
            UseMagicNumber = true;
        }

        [System.Obsolete("UseMagicNumber is deprecated and is a significant security vulnerability to disable.", false)]
        public bool UseMagicNumber { get; set; }
        public string ClientType { get; set; }
        public string Authority { get; set; }
        public string ResourceId { get; set; }
        public string ClientId { get; set; }
        public string ClientSecret { get; set; }
        public string[] Scopes { get; set; }
        public string RedirectUrl { get; set; }
        public string Policy { get; set; }
        public string MagicNumberView { get; set; }
    }
}
