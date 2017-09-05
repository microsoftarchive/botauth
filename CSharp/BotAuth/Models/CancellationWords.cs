using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BotAuth.Models
{
    public class CancellationWords
    {
        public static List<string> GetCancellationWords()
        {
            return AuthText.CancellationWords.Split(',').ToList();
        }
    }
}
