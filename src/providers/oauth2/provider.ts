//
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
//
// Bot Auth Github:
// https://github.com/mattdot/BotAuth
//
// Copyright (c) Microsoft Corporation
// All rights reserved.
//
// MIT License:
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED ""AS IS"", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import url = require("url");
import path = require("path");
import crypto = require("crypto");
import builder = require("botbuilder");
import passport = require("passport");
import { Strategy } from "passport-strategy";

import { IBotAuthenticator, IProvider, IProviderOptions, IStrategy, IChallengeResponse, IUser, IServer, IServerRequest, IServerResponse, RequestHandler, NextFunction, IResumptionProvider } from '../../interfaces';
import { CookieResumption } from "../../resumption";

export interface IPassportProviderOptions extends IProviderOptions {
    strategy : IStrategy,
    baseUrl: string;
    basePath?: string;
    secret: string;
    resumption?: IResumptionProvider;
    successRedirect?: string;
    session?: boolean;
}

const defaultOptions : IPassportProviderOptions = {
    basePath: "botauth",
    resumption: null,
    secret: null,
    baseUrl: null,
    session: false,
    server : null,
    bot : null, 
    strategy : null
};

export class PassportOAuth2Provider implements IProvider
{
    constructor(private options : IPassportProviderOptions) {
        if (!options.strategy) {
            throw new Error("PassportProvider constructor failed because 'options.strategy' argument was null/undefined");
        }

        // override default options with options passed by caller
        this.options = Object.assign({}, defaultOptions, options);

        // add routes for handling oauth redirect and callbacks
        this.options.server.get(`/${this.options.basePath}/:providerId`, this.options.resumption.persistHandler(), this.passport_redirect());
        this.options.server.get(`/${this.options.basePath}/:providerId/callback`, this.passport_callback(), this.options.resumption.restoreHandler(), this.credential_callback());
        this.options.server.post(`/${this.options.basePath}/:providerId/callback`, this.passport_callback(), this.options.resumption.restoreHandler(), this.credential_callback());
    }

    authenticate(req : IServerRequest, options : any) : void {
         this.options.strategy.authenticate.bind(this.options.strategy)(req, options);
    }

    /**
     * use the passport strategy to redirect to the authentication provider
     */
    private passport_redirect() {
        let session = this.options.session;

        return (req: IServerRequest, res: IServerResponse, next: NextFunction) => {
            let providerId: string = (<any>req.params).providerId;

            // this redirects to the authentication provider
            return passport.authenticate(providerId, { session: session })(req, res, next);
        };
    }

    /**
     * send callback through passport to get access/refresh tokens
     */
    private passport_callback() {
        let session = this.options.session;

        return (req: IServerRequest, res: IServerResponse, next: NextFunction): any => {
            let providerId: string = (<any>req.params).providerId;
            return passport.authenticate(providerId, { session: session }) (req, res, next);
        };
    }

    /**
     *  read the state query param and lookup stored authorization information
     */
    private credential_callback() {
        let bot = this.options.bot;
        let options = this.options;

        return (req: IServerRequest, res: IServerResponse, next: NextFunction) => {
            let providerId: string = (<any>req.params).providerId;
            let user: any = (<any>req).user;

            if (!user) {
                res.status(403);
                res.send("verify function yielded no user");
                res.end();
                return;
            }

            //flow.loginCompleted(null, user, resumption);

            // decode the resumption token into an address
            let addr: builder.IAddress = <any>JSON.parse(new Buffer((<any>req).locals.resumption, "base64").toString("utf8"));
            if (!addr) {
                // fail because we don"t have a valid bot address to resume authentication
                res.status(403);
                res.send("resumption token has expired or is invalid");
                res.end();
                return next();
            }

            // generate magic number
            let magic: string = crypto.randomBytes(3).toString("hex");

            // package up the data we need for the challenge response
            let response: IChallengeResponse = {
                providerId: providerId,
                user: user,
                timestamp: new Date()
            };

            // encrypt response data with the magic number (and secret) so that only user with magic number can decrypt later
            let cipher = crypto.createCipher("aes192", magic + options.secret);
            let encryptedResponse = cipher.update(JSON.stringify(response), "utf8", "base64") + cipher.final("base64");

            // temporarily store this in conversationData until user enters the magic code
            let botStorage: builder.IBotStorage = bot.get("storage");
            let botContext: builder.IBotStorageContext = { persistConversationData: true, persistUserData: false, address: addr, conversationId: addr.conversation.id };
            botStorage.getData(botContext, (err: Error, data: builder.IBotStorageData) => {
                // check for error getting bot state
                if (err) {
                    console.error(err);
                    res.status(403);
                    res.send("failed to get bot state");
                    res.end();
                    return;
                }

                // save response data to bot conversation data
                let magicKey = crypto.createHmac("sha256", options.secret).update(magic).digest("hex");
                data.conversationData.botauth = data.conversationData.botauth || {};
                data.conversationData.botauth.responses = data.conversationData.botauth.responses || {};
                data.conversationData.botauth.responses[magicKey] = encryptedResponse;

                // save updated data back to bot storage
                botStorage.saveData(botContext, data, (err) => {
                    if (err) {
                        res.status(403);
                        res.send("saving credential failed");
                        res.end();
                    } else {
                        if (this.options.successRedirect) {
                            res.status(302);
                            res.header("Location", `${options.successRedirect}#${encodeURIComponent(magic)}`);
                            res.send("redirecting...");
                            res.end();
                        } else {
                            // show the user the magic number they need to enter in the chat window
                            res.end(`You're almost done. To complete your authentication, put "${ magic }" in our chat.`);
                        }
                    }
                });
            });
        };
    }
}