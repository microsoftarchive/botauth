using BotAuth.Models;
using Microsoft.Bot.Builder.Dialogs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BotAuth
{
    public interface IAuthProvider
    {
        //void Init();
        Task<string> GetAuthUrlAsync(AuthenticationOptions authOptions, string state);
        Task<AuthResult> GetTokenByAuthCodeAsync(AuthenticationOptions authOptions, string authorizationCode);
        Task<AuthResult> GetAccessToken(AuthenticationOptions authOptions, IDialogContext context);
        Task<AuthResult> GetAccessTokenSilent(AuthenticationOptions options, IDialogContext context);
        Task Logout(AuthenticationOptions authOptions, IDialogContext context);
        string Name
        {
            get;
        }
    }
}
