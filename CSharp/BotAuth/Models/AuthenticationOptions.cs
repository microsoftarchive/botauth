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
            // Default magic number use to yes just to be safe
            // making this an option for 1:1 chat bots only...
            // group chats should ALWAYS use the magic number
            UseMagicNumber = true;
        }
        public bool UseMagicNumber { get; set; }
        public string ClientType { get; set; }
        public string Authority { get; set; }
        public string ResourceId { get; set; }
        public string ClientId { get; set; }
        public string ClientSecret { get; set; }
        public string[] Scopes { get; set; }
        public string RedirectUrl { get; set; }
        public string Policy { get; set; }
    }
}
