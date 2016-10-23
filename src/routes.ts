import restify = require("restify");
import builder = require("botbuilder");
import passport = require("passport");
import crypto = require("crypto");

import { ICredentialStorage, ICredential, IUser } from "./storage";

export function add(server : restify.Server, bot : builder.UniversalBot, store : ICredentialStorage) {
    /**
     * Oauth redirect route
     */
    server.get('/botauth/:providerId', 
        (req : restify.Request, res: restify.Response, next : restify.Next) => {
            let providerId : string = req.params.providerId;
            let state : string = (<any>req.query).state;

            //this redirects to the authentication provider
            return passport.authenticate(providerId, { state : state, session : false })(<any>req, <any>res, <any>next);
        }
    );

    /**
     * Oauth callback route
     */
    server.get('/botauth/:providerId/callback',  
        //send request through passport to get access/refresh tokens
        (req : restify.Request, res: restify.Response, next : restify.RequestHandler) => {
            let providerId : string = req.params.providerId;
            return passport.authenticate(providerId) (<any> req, <any> res, <any> next);
        },
        //read the state query param and lookup stored authorization information
        (req : restify.Request, res: restify.Response, next : restify.Next) => {
            let cred : ICredential = {
                _id : crypto.randomBytes(32).toString('hex'),
                conversation : (<any>req.query).state,
                authToken : (<any>req).user.authToken,
                refreshToken : (<any>req).user.refreshToken
            };

            store.saveCredential(cred, (err, credential) => {
                if(err) {
                    res.send(403, "saving credential failed");       
                } else {
                    //todo: make this a real html page
                    res.send(`You're almost done. To complete your authentication, put '${ cred._id.slice(-6) }' in our chat.`);
                }
            });

            let botStorage : builder.IBotStorage = bot.get("storage");
            let botContext : builder.IBotStorageContext = { persistConversationData : true, persistUserData : false };
            let botData : builder.IBotStorageData = {};
            botData.conversationData.botauth = {};
            botData.conversationData.botauth[cred._id.slice(-6)] = cred;
            botStorage.saveData(botContext, botData, (err) => {});
        }

        // save tokens to bot storage data
        // (req : restify.Request, res: restify.Response, next: restify.Next) => {
        //     let providerId : string = req.params.providerId;
        //     console.log(`[botauth/${providerId}/callback]`);
            
        //     if(!(<any>req).locals.authorization || !(<any>req).locals.authorization.address) {
        //         res.send(403, "Authorization token is invalid or has expired.");
        //         return;
        //     }

        //     let addr : builder.IAddress = (<any>req).locals.authorization.address;

        //     let botStorage : builder.IBotStorage = bot.get("storage");
        //     let botContext : builder.IBotStorageContext = { address: addr, userId : addr.user.id, conversationId : addr.conversation.id, persistUserData : true, persistConversationData: true };
        //     botStorage.getData(botContext, (getErr : Error, data : builder.IBotStorageData) => {
        //         console.log("\n[rest:/botauth/auth(getData)]\n%j\n%j", getErr, data);
        //         if(!getErr) {
        //             //validate authentication request
        //             // var cs = data.privateConversationData["BotBuilder.Data.SessionState"].callstack;
        //             // var csi = cs.findIndex((el : any, ind : number, arr : any) => { return el.id === "botauth:auth";});        
        //             //cs[csi].state["BotAuth.Token"] = encodedAddr;

        //             let providerToken : any = {}; 
        //             providerToken[providerId] = (<any>req).user;

        //             if(!data.userData.botauth) data.userData.botauth = {};
        //             data.userData.botauth.tokens = Object.assign({}, data.userData.botauth.tokens, providerToken);

        //             console.log("**TOKENS**\n%j\n", data.userData);

        //             botStorage.saveData(botContext, data, function(saveError : any) {
        //                 if(saveError) {
        //                     console.log("error saving data %j", saveError); 
        //                 } else { 
        //                     console.log("success saving data");
        //                 }

        //                 //activate our auth dialog by sending a message into the bot pipeline
        //                 bot.receive({
        //                     type : "message",
        //                     agent: "botbuilder",
        //                     source : addr.channelId,
        //                     sourceEvent : {},
        //                     address : addr,
        //                     user : addr.user,
        //                     text : ""
        //                 } as builder.IMessage);

        //                 res.send("You successfully authenticated.  Close this browser and return to our chat.");
        //             });
        //         }
        //     });
        // }
    );
}