/// <reference path="typings/index.d.ts" />

import crypto = require('crypto');
import builder = require('botbuilder');
import passport = require('passport');
import restify = require('restify');

import * as routes from "./routes";
import * as library from "./library";
import { IAuthorizationStore, IAuthorization, IUser, IUserId } from "./store";
export { IAuthorization, IAuthorizationStore, IUser, IUserId };

export interface IBotAuthOptions {
    baseUrl : string,
    basePath : string
}

export interface IBotAuthProvider {
    strategy : passport.Strategy,
    args : any
}

export class Authenticator {

    private _options : IBotAuthOptions;
    private _bot : builder.UniversalBot;
    private _server : restify.Server;
    private _store : IAuthorizationStore;

    public constructor(server : restify.Server, bot : builder.UniversalBot, store : IAuthorizationStore, options : IBotAuthOptions) {
        this._bot = bot;
        this._server = server;
        this._store = store;

        //override default options with options passed by caller
        this._options = Object.assign( { basePath : "botauth" }, options);

        //configure restify/express to use passport
        this._server.use(<any>passport.initialize());

        //add routes for handling oauth redirect and callbacks
        routes.add(this._server, this._bot, this._store);

        //add auth dialogs to a library
        this._bot.library(library.build(this._store));

        //passportjs serialize user to data store so that we can later look them up from cookie
        passport.serializeUser((user, done) => {
            store.saveUser(user, (err : Error, id: IUserId) => {
                done(null, id);   
            });
        });

        //passportjs retrieve user data from data store when user has userId in cookie
        passport.deserializeUser((userId, done) => {
            store.findUser(userId, (err : Error, user : IUser) => {
                return done(null, user);
            });
        });
    }

    /**
     * Registers a provider with passportjs and may start monitoring for auth requests 
     * @param {String} name 
     * @param {Strategy} strategy
     * @param {IBotAuthProviderOptions} options
     * @return {BotAuth} this
     */
    public provider(name : string, options : IBotAuthProvider) : Authenticator { 
        let args = Object.assign({ 
            callbackURL : this.callbackUrl(name)
        }, options.args);

        let s : passport.Strategy = new (<any>options.strategy)(args, function(accessToken : string, refreshToken : string, profile : any, done : any) {
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
     * @return {IDialogWaterfallStep} 
     */
    public authenticate(providerId : string, steps : builder.IDialogWaterfallStep[]) : builder.IDialogWaterfallStep[] {
        let authSteps : builder.IDialogWaterfallStep[] = [
            (session : builder.Session, args : builder.IDialogResult<any>, skip : (results?: builder.IDialogResult<any>) => void) => {
                session.beginDialog(library.name, { 
                    providerId : providerId, 
                    authUrl : this.authUrl(providerId) 
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

        if(steps) {
            steps.forEach((step) => { authSteps.push(step); });
        }
        
        return authSteps;
    }



    private callbackUrl(providerName : string) {
        return `${this._options.baseUrl}/${this._options.basePath}/${providerName}/callback`;
    }

    private authUrl(providerName : string) {
        return `${this._options.baseUrl}/${this._options.basePath}/${providerName}`;
    }
}
