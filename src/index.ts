/// <reference path="typings/index.d.ts" />

import crypto = require('crypto');
import builder = require('botbuilder');
import passport = require('passport');
import restify = require('restify');

//import * as routes from "./routes";
import { ICredential, ICredentialStorage, IUser } from "./storage";
export { ICredential, ICredentialStorage, IUser };

import { AuthDialog, IAuthDialogOptions } from "./dialogs";
export { AuthDialog, IAuthDialogOptions };

const DIALOG_LIBRARY : string = "botauth";
const DIALOG_ID : string = "auth";
const DIALOG_FULLNAME : string = `${DIALOG_LIBRARY}:${DIALOG_ID}`;

export interface IBotAuthOptions {
    baseUrl : string,
    basePath : string
}

export interface IBotAuthProvider {
    strategy : passport.Strategy,
    args : any
}

export interface IAuthenticateOptions {

}

/**
 * 
 */
export class BotAuthenticator {

    /**
     * @public
     */
    public constructor(private server : restify.Server, private bot : builder.UniversalBot, private store : ICredentialStorage, private options : IBotAuthOptions) {
        if(!bot || !server || !store) { 
            throw new Error("Autenticator constructor failed because required parameters were null/undefined");
        }

        //override default options with options passed by caller
        this.options = Object.assign( { basePath : "botauth" }, options);

        //configure restify/express to use passport
        this.server.use(<any>passport.initialize());

        //add routes for handling oauth redirect and callbacks
        this.server.get(`/${this.options.basePath}/:providerId`, this.persistContext.bind(this), this.passport_redirect);
        this.server.get(`/${this.options.basePath}/:providerId/callback`, this.passport_callback, this.restoreContext.bind(this), this.credential_callback.bind(this));

        //add auth dialogs to a library
        let lib = new builder.Library(DIALOG_LIBRARY);
        lib.dialog(DIALOG_ID, new AuthDialog(this.store));
        this.bot.library(lib);

        //passportjs serialize user to data store so that we can later look them up from cookie
        passport.serializeUser((user, done) => {
            //store.saveUser(user, (err : Error, id: IUserId) => {
                //todo: encrypt
                done(null, user);   
            //});
        });

        //passportjs retrieve user data from data store when user has userId in cookie
        passport.deserializeUser((userId, done) => {
            //store.findUser(userId, (err : Error, user : IUser) => {
                //todo: decrypt
                return done(null, userId);
            //});
        });
    }

    /**
     * Registers a provider with passportjs and may start monitoring for auth requests 
     * @param {String} name 
     * @param {Strategy} strategy
     * @param {IBotAuthProviderOptions} options
     * @return {BotAuth} this
     */
    public provider(name : string, options : IBotAuthProvider) : BotAuthenticator { 
        let args = Object.assign({
            callbackURL : this.callbackUrl(name)
        }, options.args);

        let s : passport.Strategy = new (<any>options.strategy)(args, function(accessToken : string, refreshToken : string, profile : any, done : any) {
            profile = profile || {};
            profile.id = profile.id || crypto.randomBytes(32).toString('hex');   
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            
            return done(null, profile);
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
                session.beginDialog("botauth:auth", {
                    providerId : providerId, 
                    buttonUrl : this.authUrl(providerId) 
                });
            },
            (session : builder.Session, args : builder.IDialogResult<any>, skip : (results?: builder.IDialogResult<any>) => void) => {
                if(args) {
                    if(args.resumed === builder.ResumeReason.completed) {
                        skip();
                        return;
                    } else if(args.resumed === builder.ResumeReason.back || args.resumed === builder.ResumeReason.canceled || args.resumed === builder.ResumeReason.forward || args.resumed === builder.ResumeReason.notCompleted) {
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
        if(session && session.userData && session.userData.botauth && session.userData.botauth.tokens && session.userData.botauth.tokens.hasOwnProperty(providerId)) {
            return session.userData.botauth.tokens[providerId];
        } else {
            return null;
        }
    }

    private callbackUrl(providerName : string) {
        return `${this.options.baseUrl}/${this.options.basePath}/${providerName}/callback`;
    }

    private authUrl(providerName : string) {
        return `${this.options.baseUrl}/${this.options.basePath}/${providerName}`;
    }

    /**
     * use the passport strategy to redirect to the authentication provider
     */
    private passport_redirect(req : restify.Request, res: restify.Response, next : restify.Next) {
        let providerId : string = req.params.providerId;
        let state : string = (<any>req.query).state;

        //this redirects to the authentication provider
        return passport.authenticate(providerId, { state : state, session : false })(<any>req, <any>res, <any>next);
    }

    /**
     * send callback through passport to get access/refresh tokens
     */
    private passport_callback(req : restify.Request, res: restify.Response, next : restify.RequestHandler) : any {
        let providerId : string = req.params.providerId;
        return passport.authenticate(providerId) (<any> req, <any> res, <any> next);
    }

    /**
     * save user context before redirecting
     */
    private persistContext(req : restify.Request, res: restify.Response, next : restify.RequestHandler) : any {
        return (<any>next)();
    }

    /**
     * restore user bot context after callback
     */
    private restoreContext(req : restify.Request, res: restify.Response, next : restify.RequestHandler) : any {
        return (<any>next)();
    }

    /**
     *  read the state query param and lookup stored authorization information
     */
    private credential_callback(req : restify.Request, res: restify.Response, next : restify.Next) {
        let cred : ICredential = {
            _id : crypto.randomBytes(32).toString('hex'),
            conversation : (<any>req.query).state,
            authToken : (<any>req).user.authToken,
            refreshToken : (<any>req).user.refreshToken
        };

        this.store.saveCredential(cred, (err, credential) => {
            if(err) {
                res.send(403, "saving credential failed");
                res.end();       
            } else {
                //todo: make this a real html page
                res.end(`You're almost done. To complete your authentication, put '${ cred._id.slice(-6) }' in our chat.`);
            }
        });

        // let botStorage : builder.IBotStorage = bot.get("storage");
        // let botContext : builder.IBotStorageContext = { persistConversationData : true, persistUserData : false };
        // let botData : builder.IBotStorageData = {};
        // botData.conversationData.botauth = {};
        // botData.conversationData.botauth[cred._id.slice(-6)] = cred;
        // botStorage.saveData(botContext, botData, (err) => {});
    }
}
