/// <reference path="typings/index.d.ts" />

import crypto = require('crypto');
import builder = require('botbuilder');
import passport = require('passport');
import restify = require('restify');

import library = require('./library');
import routes = require('./routes');

export interface IBotAuthOptions {
    baseUrl : string
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
        this._options = options;

        routes.add(this._server, this._bot);
    }

    /**
     * Registers a provider with passportjs and may start monitoring for auth requests 
     * @param {String} name 
     * @param {Strategy} strategy
     * @param {IBotAuthProviderOptions} options
     * @return {BotAuth} this
     */
    public provider(strategy : any, options : IBotAuthProviderOptions) : Authenticator { 

        var args = {
            callbackURL : `${this._options.baseUrl}/auth/${name}/callback`
        };
        console.log("callbackURL:%s", args.callbackURL);

        args = Object.assign(args, options.args);
        //todo: set callback url

        passport.use(name, new strategy(args, function(accessToken : string, refreshToken : string, profile : any, done : any) {
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            return done(null, profile);
        }));

        return this;
    }

    /**
     * Returns a DialogWaterfallStep which provides authentication for a specific dialog 
     * @param {String} providerId 
     * @return {IDialogWaterfallStep} 
     */
    public authenticate(providerId : string) : builder.IDialogWaterfallStep {
        return (session : builder.Session, args : any, skip : (results?: builder.IDialogResult<any>) => void) => {
            session.beginDialog(library.name);
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

}
