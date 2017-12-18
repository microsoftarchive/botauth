using Microsoft.Identity.Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BotAuth.AADv2
{
    public class InMemoryTokenCacheMSAL
    {
        string CacheId = string.Empty;
        private Dictionary<string, object> cacheData = new Dictionary<string, object>();
        TokenCache cache = new TokenCache();

        public InMemoryTokenCacheMSAL()
        {
            CacheId = "MSAL_TokenCache";
            cache.SetBeforeAccess(BeforeAccessNotification);
            cache.SetAfterAccess(AfterAccessNotification);
            Load();
        }

        public InMemoryTokenCacheMSAL(byte[] tokenCache)
        {
            CacheId = "MSAL_TokenCache";
            cache.SetBeforeAccess(BeforeAccessNotification);
            cache.SetAfterAccess(AfterAccessNotification);
            cache.Deserialize(tokenCache);
        }

        public TokenCache GetMsalCacheInstance()
        {
            cache.SetBeforeAccess(BeforeAccessNotification);
            cache.SetAfterAccess(AfterAccessNotification);
            Load();
            return cache;
        }

        public void SaveUserStateValue(string state)
        {
            cacheData[CacheId + "_state"] = state;
        }
        public string ReadUserStateValue()
        {
            string state = string.Empty;
            state = (string)cacheData[CacheId + "_state"];
            return state;
        }
        public void Load()
        {
            if (cacheData.ContainsKey(CacheId))
                cache.Deserialize((byte[])cacheData[CacheId]);
        }

        public void Persist()
        {
            // Optimistically set HasStateChanged to false. We need to do it early to avoid losing changes made by a concurrent thread.
            cache.HasStateChanged = false;

            // Reflect changes in the persistent store
            cacheData[CacheId] = cache.Serialize();
        }

        /*
        // Empties the persistent store.
        public override void Clear(string cliendId)
        {
            base.Clear(cliendId);
            cache.Remove(CacheId);
        }
        */

        // Triggered right before ADAL needs to access the cache.
        // Reload the cache from the persistent store in case it changed since the last access.
        void BeforeAccessNotification(TokenCacheNotificationArgs args)
        {
            Load();
        }

        // Triggered right after ADAL accessed the cache.
        void AfterAccessNotification(TokenCacheNotificationArgs args)
        {
            // if the access operation resulted in a cache update
            if (cache.HasStateChanged)
            {
                Persist();
            }
        }
    }
}
