/// <reference path="store.ts" />
import restify = require("restify");
import builder = require("botbuilder");
import passport = require("passport");
import crypto = require("crypto");

import { IAuthorizationStore, IAuthorization } from "./store";

export function add(server : restify.Server, bot : builder.UniversalBot, store : IAuthorizationStore) {
    /**
     * Oauth redirect route
     */
    server.get('/botauth/:providerId', 
        (req : restify.Request, res: restify.Response, next : restify.Next) => {
            let providerId : string = req.params.providerId;
            let state : string = (<any>req.query).state;
            //todo: scrub provider
            return passport.authenticate(providerId, { state : state })(<any>req, <any>res, <any>next);
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
            let state : string = (<any>req.query).state;
            store.findAuthorization(state, (findErr : Error, authorization : IAuthorization) => {
                if(!findErr) {
                    //save authorization for next middleware to use
                    Object.assign((<any>req).locals, { authorization : authorization });
                    next()
                } else {
                    //did not find authorization.  may be expired, reused, or never there
                    next(findErr);
                }
            });
        },
        // save tokens to bot storage data
        (req : restify.Request, res: restify.Response, next: restify.Next) => {
            let providerId : string = req.params.providerId;
            console.log(`[botauth/${providerId}/callback]`);

            let addr : builder.IAddress = (<any>req).locals.authorization.address;
            let botStorage : builder.IBotStorage = bot.get("storage");
            let botContext : builder.IBotStorageContext = {address: addr, userId : addr.user.id, conversationId : addr.conversation.id, persistUserData : true, persistConversationData: true};
            botStorage.getData(botContext, (getErr : Error, data : builder.IBotStorageData) => {
                if(!getErr) {
                    console.log("\n[rest:/botauth/auth(getData)]\n%j", data);
            
                    //validate authentication request
                    // var cs = data.privateConversationData["BotBuilder.Data.SessionState"].callstack;
                    // var csi = cs.findIndex((el : any, ind : number, arr : any) => { return el.id === "botauth:auth";});        
                    //cs[csi].state["BotAuth.Token"] = encodedAddr;

                    if(!data.userData.botauth) data.userData.botauth = {};
                    data.userData.botauth.tokens = Object.assign({}, data.userData.botauth.tokens, (<any>{})[providerId] = (<any>req).user);

                    botStorage.saveData(botContext, data, function(saveError : any) {
                        if(saveError) {
                            console.log("error saving data %j", saveError); 
                        } else { 
                            console.log("success saving data");
                        }

                        //activate our auth dialog by sending a message into the bot pipeline
                        bot.receive({
                            type : "message",
                            agent: "botbuilder",
                            source : addr.channelId,
                            sourceEvent : {},
                            address : addr,
                            user : addr.user,
                            text : ""
                        } as builder.IMessage);

                        res.send(addr);
                    });
                }
            });
        }
    );
}