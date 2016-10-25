/// <reference path="typings/index.d.ts" />

import crypto = require('crypto');
import builder = require('botbuilder');
import passport = require('passport');
import restify = require('restify');

import { AuthDialog, IAuthDialogOptions } from "./dialogs";
export { AuthDialog, IAuthDialogOptions };

import { IResumptionProvider, CookieResumption } from "./resumption";
export { IResumptionProvider, CookieResumption };

import { IChallengeResponse, IUser } from "./interfaces";
export { IChallengeResponse, IUser };

const DIALOG_LIBRARY : string = "botauth";
const DIALOG_ID : string = "auth";
const DIALOG_FULLNAME : string = `${DIALOG_LIBRARY}:${DIALOG_ID}`;

export interface IBotAuthenticatorOptions {
    baseUrl : string,
    basePath : string,
    secret : string,
    resumption : IResumptionProvider,
    successRedirect? : string
}

const defaultOptions : IBotAuthenticatorOptions = {
    basePath : "botauth",
    resumption : null,
    secret : null,
    baseUrl : null
};

export interface IStrategyOptions {
    callbackURL : string
}

export interface IStrategy {
    authenticate(req : any, options : any) : void;
}

export interface IAuthenticateOptions {

}

/**
 * @public
 * @class
 */
export class BotAuthenticator {

    /**
     * @public
     * @constructor
     */
    public constructor(private server : restify.Server, private bot : builder.UniversalBot, private options : IBotAuthenticatorOptions) {
        if(!bot || !server) { 
            throw new Error("Autenticator constructor failed because required parameters were null/undefined");
        }

        //override default options with options passed by caller
        this.options = Object.assign({}, defaultOptions, options);

        if(!this.options.secret) {
            throw new Error("options.secret can not be null");
        }

        if(!this.options.resumption) {
            this.options.resumption = new CookieResumption(15*60, this.options.secret);
        }

        //configure restify/express to use passport
        this.server.use(<any>passport.initialize());

        //add routes for handling oauth redirect and callbacks
        this.server.get(`/${this.options.basePath}/:providerId`, this.options.resumption.persistHandler(), this.passport_redirect);
        this.server.get(`/${this.options.basePath}/:providerId/callback`, this.passport_callback, this.options.resumption.restoreHandler(), this.credential_callback.bind(this));

        //configure bot to save conversation and user scoped data
        //todo: should we use our own bot storage connection to avoid overwriting these??
        this.bot.set("persistConversationData", true);
        this.bot.set("persistUserData", true);

        //add auth dialogs to a library
        let lib = new builder.Library(DIALOG_LIBRARY);
        lib.dialog(DIALOG_ID, new AuthDialog(<any>{ secret : this.options.secret }));
        this.bot.library(lib);
    }

    /**
     * Registers a provider with passportjs and may start monitoring for auth requests 
     * @param {String} name 
     * @param {Strategy} strategy
     * @param {IBotAuthProviderOptions} options
     * @return {BotAuth} this
     */
    public provider(name : string, factory : (options : IStrategyOptions) => IStrategy) : BotAuthenticator { 
        let s : passport.Strategy = factory({
            callbackURL : this.callbackUrl(name)
        });

        passport.use(name, s);

        return this;
    }

    /**
     * Returns a DialogWaterfallStep which provides authentication for a specific dialog 
     * @param {String} providerId 
     * @return {IDialogWaterfallStep[]} 
     */
    public authenticate(providerId : string, options : IAuthenticateOptions) : builder.IDialogWaterfallStep[] {
        let authSteps : builder.IDialogWaterfallStep[] = [
            (session : builder.Session, args : builder.IDialogResult<any>, skip : (results?: builder.IDialogResult<any>) => void) => {
                let user = this.profile(session, providerId);
                if(user) {
                    //user is already authenticated
                    skip(<any>{ response : user });
                } else {
                    //pass context to redirect
                    let cxt = new Buffer(JSON.stringify(session.message.address)).toString('base64'); 
                    session.beginDialog(DIALOG_FULLNAME, {
                        providerId : providerId, 
                        buttonUrl : this.authUrl(providerId, cxt)
                    });
                }
            },
            (session : builder.Session, args : builder.IDialogResult<any>, skip : (results?: builder.IDialogResult<any>) => void) => {
                if(args) {
                    if(args.resumed === builder.ResumeReason.completed || args.resumed === builder.ResumeReason.forward) {
                        skip(<any>{ response: args.response });
                        return;
                    } else if(args.resumed === builder.ResumeReason.back || args.resumed === builder.ResumeReason.canceled || args.resumed === builder.ResumeReason.notCompleted) {
                        //todo: should we end the conversation or just the dialog on auth failure?
                        session.endConversation("auth failed, ending conversation");
                        return;
                    } 
                }
            }
        ];
        
        return authSteps;
    }

    /**
     * Gets user profile from session state
     * @param {Session} bot session
     * @param {string} botauth provider id of the profile
     * @return {IUser} user profile if it exists; otherwise null
     **/
    public profile(session : builder.Session, providerId : string) : IUser {
        //todo: add setter

        if(session && session.userData && session.userData.botauth && session.userData.botauth.user && session.userData.botauth.user.hasOwnProperty(providerId)) {
            let encryptedProfile : string = session.userData.botauth.user[providerId];
            
            //decrypt
            let decipher = crypto.createDecipher("aes192", this.options.secret);
            let json = decipher.update(encryptedProfile, 'base64', 'utf8') + decipher.final('utf8');
            
            return JSON.parse(json);
        } else {
            return null;
        }
    }

    public logout(session : builder.Session, providerId : string) : void {
        if(session && session.userData && session.userData.botauth && session.userData.botauth.user && session.userData.botauth.user.hasOwnProperty(providerId)) {
            delete session.userData.botauth.user[providerId];
            session.save();
        }
    }

    private callbackUrl(providerName : string) {
        return `${this.options.baseUrl}/${this.options.basePath}/${providerName}/callback`;
    }

    private authUrl(providerName : string, state : string) {
        return `${this.options.baseUrl}/${this.options.basePath}/${providerName}?state=${ encodeURIComponent(state) }`;
    }

    /**
     * use the passport strategy to redirect to the authentication provider
     */
    private passport_redirect(req : restify.Request, res: restify.Response, next : restify.Next) {
        let providerId : string = req.params.providerId;

        //this redirects to the authentication provider
        return passport.authenticate(providerId, { session : false })(<any>req, <any>res, <any>next);
    }

    /**
     * send callback through passport to get access/refresh tokens
     */
    private passport_callback(req : restify.Request, res: restify.Response, next : restify.RequestHandler) : any {
        let providerId : string = req.params.providerId;
        return passport.authenticate(providerId, { session: false }) (<any> req, <any> res, <any> next);
    }

    /**
     *  read the state query param and lookup stored authorization information
     */
    private credential_callback(req : restify.Request, res: restify.Response, next : restify.Next) {
        let providerId : string = req.params.providerId;

        //decode the resumption token into an address
        let addr : builder.IAddress = <any>JSON.parse(new Buffer((<any>req).locals.resumption, "base64").toString());;
        if(!addr) {
            //fail because we don't have a valid bot address to resume authentication
            res.send(403, "resumption token has expired or is invalid");
            res.end();
            return next();    
        }

        //generate magic number
        let magic : string = crypto.randomBytes(3).toString('hex');

        //package up the data we need for the challenge response
        let response : IChallengeResponse = {
            providerId : providerId,
            user : (<any>req).user,
            timestamp : new Date()
        };

        //encrypt response data with the magic number (and secret) so that only user with magic number can decrypt later
        let cipher = crypto.createCipher("aes192", magic + this.options.secret);
        let encryptedResponse = cipher.update(JSON.stringify(response), 'utf8', 'base64') + cipher.final('base64');

        //temporarily store this in conversationData until user enters the magic code
        let botStorage : builder.IBotStorage = this.bot.get("storage");
        let botContext : builder.IBotStorageContext = { persistConversationData : true, persistUserData : false, address : addr, conversationId : addr.conversation.id };
        botStorage.getData(botContext, (err:Error, data : builder.IBotStorageData) => {        
            //check for error getting bot state
            if(err) {
                console.error(err);
                res.send(403, "failed to get bot state");
                res.end();
                return;
            }
            
            //save response data to bot conversation data 
            let magicKey = crypto.createHmac("sha256", this.options.secret).update(magic).digest("hex");
            data.conversationData.botauth = data.conversationData.botauth || {};
            data.conversationData.botauth.responses = data.conversationData.botauth.responses || {};
            data.conversationData.botauth.responses[magicKey] = encryptedResponse;

            //save updated data back to bot storage
            botStorage.saveData(botContext, data, (err) => {
                if(err) {
                    res.send(403, "saving credential failed");
                    res.end();
                } else {
                    if(this.options.successRedirect) {
                        res.send("302", "redirecting...", { "Location" : `${this.options.successRedirect}#${encodeURIComponent(magic)}`});
                        res.end();
                    } else {
                        //show the user the magic number they need to enter in the chat window
                        res.end(`You're almost done. To complete your authentication, put '${ magic }' in our chat.`);
                    }
                }
            });
        });
    }
}