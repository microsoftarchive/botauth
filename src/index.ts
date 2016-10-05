/// <reference path="typings/index.d.ts" />

import crypto = require('crypto');
import builder = require('botbuilder');
import passport = require('passport');
import restify = require('restify');

import library = require('./library');
import routes = require('./routes');

export interface IBotAuthOptions {
    baseUrl : string,
    basePath : string
}

export interface IBotAuthProviderOptions {
    args : any
}

export class Authenticator {

    private _options : IBotAuthOptions;
    private _bot : builder.UniversalBot;
    private _server : restify.Server;

    public constructor(server : restify.Server, bot : builder.UniversalBot, options : IBotAuthOptions) {
        this._bot = bot;
        this._server = server;

        //override default options with options passed by caller
        this._options = Object.assign( { basePath : "botauth" }, options);

        //add routes for handling oauth redirect and callbacks
        routes.add(this._server, this._bot);

        //add auth dialogs to a library
        this._bot.library(library.build());
    }

    /**
     * Registers a provider with passportjs and may start monitoring for auth requests 
     * @param {String} name 
     * @param {Strategy} strategy
     * @param {IBotAuthProviderOptions} options
     * @return {BotAuth} this
     */
    public provider(name : string, strategy : any, options : IBotAuthProviderOptions) : Authenticator { 

        var args = {
            callbackURL : this.callbackUrl(name)
        };
        console.log("callbackURL:%s", args.callbackURL);

        args = Object.assign(args, options.args);
        //todo: set callback url
        let s : passport.Strategy = new strategy(args, function(accessToken : string, refreshToken : string, profile : any, done : any) {
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
    public authenticate(providerId : string) : builder.IDialogWaterfallStep {
        return (session : builder.Session, args : builder.IDialogResult<any>, skip : (results?: builder.IDialogResult<any>) => void) => {
            if(args) {
                if(args.resumed === builder.ResumeReason.completed) {
                    skip();
                    return;
                } else if(args.resumed === builder.ResumeReason.back || args.resumed === builder.ResumeReason.canceled || args.resumed === builder.ResumeReason.forward || args.resumed === builder.ResumeReason.notCompleted) {
                    session.endConversation("auth failed, ending conversation");
                    return;
                } 
            } else {
                session.beginDialog(library.name, { 
                    providerId : providerId, 
                    authUrl : this.authUrl(providerId) 
                });
            }
        };
    }

    // botauth.prototype.middleware = function(filters) {
//     var self = this;

//     //make sure that filters isn't null
//     filters = filters || {};
    
//     return { 
//         botbuilder: function(session, next) {
//             console.log("[botbuilder]");
//             console.log("dialogId = %s", session.options.dialogId);

//             for(var prop in filters) {
//                 var rx = filters[prop];
//                 if(rx && rx.test(session.options.dialogId)) {
//                     console.log("%s provider should authenticate");
//                 } else {
                    
//                 }
//             }

//             if(!session.userData["authData"]) {
//                 //session.beginDialog("botauth:auth");
//                 next();
//             } else {
//                 next();
//             }
//         }
//     };
// }

    private callbackUrl(providerName : string) {
        return `${this._options.baseUrl}/${this._options.basePath}/${providerName}/callback`;
    }

    private authUrl(providerName : string) {
        return `${this._options.baseUrl}/${this._options.basePath}/${providerName}`;
    }

}
