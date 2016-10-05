/// <reference path="typings/index.d.ts" />

import crypto = require('crypto');
import builder = require('botbuilder');
import passport = require('passport');
import restify = require('restify');

import library = require('./library');

export interface IBotAuthOptions {
    baseUrl : string
}

export interface IBotAuthProviderOptions {
    args : any
}

export class BotAuth {

    private _options : IBotAuthOptions;

    public constructor(server : restify.Server, bot : builder.UniversalBot, options : IBotAuthOptions) {

        server.get('/botauth/:providerId/auth', function(req : restify.Request, res: restify.Response) {
        });

        server.get('/botauth/:providerId/auth/callback', function(req : restify.Request, res: restify.Response) {
        });
    }

    public provider(strategy : any, options : IBotAuthProviderOptions) : BotAuth { 


        // if(!_server) {
        //     throw Error("must call configure before calling provider");
        // }

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
}
