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
import * as passport from "passport";
import * as express from "express";

import { FlowRouter }  from "./flows/index";
import { FacebookAccountLinkingFlow } from "./flows/facebook-account-linking/index";
import { MagicCodeFlow } from "./flows/magic/index";
import { PassportOAuth2Provider } from "./providers/oauth2/provider";

import { AuthDialog, IAuthDialogOptions } from "./dialogs";
export { AuthDialog, IAuthDialogOptions };

import { CookieResumption } from "./resumption";
export { CookieResumption };

import { 
    IBotAuthenticator, 
    IChallengeResponse, 
    IUser, 
    IServer, 
    IServerRequest, 
    IServerResponse, 
    RequestHandler, 
    NextFunction, 
    IProvider, 
    IProviderOptions,
    IResumptionProvider,
    IBotAuthenticatorOptions,
    IStrategyOptions,
    IStrategy,
    IAuthenticateOptions
} from "./interfaces";
export { IBotAuthenticator, IStrategy, IStrategyOptions, IAuthenticateOptions, IChallengeResponse, IUser, IProvider, IProviderOptions, IResumptionProvider, IBotAuthenticatorOptions };

import { DIALOG_LIBRARY, DIALOG_ID, DIALOG_FULLNAME } from "./consts";

const defaultOptions: IBotAuthenticatorOptions = {
    basePath: "botauth",
    resumption: null,
    secret: null,
    baseUrl: null,
    session: false
};



/**
 * @public
 * @class
 */
export class BotAuthenticator implements IBotAuthenticator {
    
    private flows : FlowRouter;
    private providers : IProvider[] = [];

    /**
     * @public
     * @constructor
     */
    public constructor(public server: IServer, public bot: builder.UniversalBot, private options: IBotAuthenticatorOptions) {
        if (!bot) {
            throw new Error("BotAuthenticator constructor failed because 'bot' argument was null/undefined");
        }

        if (!server) {
            throw new Error("BotAuthenticator constructor failed because 'server' argument was null/undefined");
        }

        // override default options with options passed by caller
        this.options = Object.assign({}, defaultOptions, options);
        if (!this.options.baseUrl) {
            throw new Error("options.baseUrl can not be null");
        } else {
            let parsedUrl = url.parse(this.options.baseUrl);
            if (parsedUrl.protocol !== "https:" || !parsedUrl.slashes || !parsedUrl.hostname) {
                throw new Error("options.baseUrl must be a valid url and start with 'https://'.");
            }
        }

        if (!this.options.secret) {
            throw new Error("options.secret can not be null");
        }

        if (!this.options.resumption) {
            this.options.resumption = new CookieResumption(15 * 60, this.options.secret);
        }

        this.flows = new FlowRouter([
            new FacebookAccountLinkingFlow(this),
            new MagicCodeFlow(this, { secret : this.options.secret })
        ]);

        // configure restify/express to use passport
        this.server.use(passport.initialize());

        if (this.options.session) {
            this.server.use(passport.session());
            passport.serializeUser((user: any, done: any) => {
                done(null, user);
            });
            passport.deserializeUser((userId: any, done: any) => {
                done(null, userId);
            });
        }

        // add routes for handling oauth redirect and callbacks
        // this.server.get(`/${this.options.basePath}/:providerId`, this.options.resumption.persistHandler(), this.passport_redirect());
        // this.server.get(`/${this.options.basePath}/:providerId/callback`, this.passport_callback(), this.options.resumption.restoreHandler(), this.credential_callback());
        // this.server.post(`/${this.options.basePath}/:providerId/callback`, this.passport_callback(), this.options.resumption.restoreHandler(), this.credential_callback());

        // configure bot to save conversation and user scoped data
        // todo: should we use our own bot storage connection to avoid overwriting these??
        this.bot.set("persistConversationData", true);
        this.bot.set("persistUserData", true);

        // add auth dialogs to a library
        // let lib = new builder.Library(DIALOG_LIBRARY);
        // lib.localePath(path.join(__dirname, "../locale/"));
        // lib.dialog(DIALOG_ID, new AuthDialog({ secret: this.options.secret }));
        // this.bot.library(lib);
    }

    /**
     * Registers a provider with passportjs and may start monitoring for auth requests
     * @param {String} name
     * @param {Strategy} strategy
     * @param {IBotAuthProviderOptions} options
     * @return {BotAuth} this
     */
    public provider(name: string, factory: (options: IStrategyOptions) => IStrategy): BotAuthenticator {
        let s: IStrategy = factory({
            callbackURL: this.callbackUrl(name)
        });

        if (!s) {
            throw new Error("The 'factory' method passed to BotAuthenticator.provider must return an instance of an authentication Strategy.");
        }

        this.providers.push(new PassportOAuth2Provider({
            strategy: s,
            baseUrl: this.callbackUrl(name),
            secret: this.options.secret,
            bot: this.bot,
            server : this.server,
            resumption : this.options.resumption
        }));

        // register this authentication strategy with passport
        passport.use(name, s);

        return this;
    }

    /**
     * Returns a DialogWaterfallStep which provides authentication for a specific dialog
     * @param {String} providerId
     * @return {IDialogWaterfallStep[]}
     */
    public authenticate(providerId: string, options: IAuthenticateOptions): builder.IDialogWaterfallStep[] {
        let authSteps: builder.IDialogWaterfallStep[] = [
            // step 1: check if user is authenticated, if not start the auth dialog
            (session: builder.Session, args: builder.IDialogResult<any>, skip: (results?: builder.IDialogResult<any>) => void) => {
                let user = this.profile(session, providerId);
                if (user) {
                    // user is already authenticated, forward the
                    skip({ response: (args || {}).response, resumed: builder.ResumeReason.forward });
                } else {
                    
                    let dialogName = this.flows.loginDialog(session);
                    console.log(dialogName);

                    // pass context to redirect
                    let cxt = new Buffer(JSON.stringify(session.message.address)).toString("base64");
                    session.beginDialog(dialogName, {
                        providerId: providerId,
                        buttonUrl: this.authUrl(providerId, cxt),
                        originalArgs: (args || {}).response
                    });
                }
            },
            (session: builder.Session, args: builder.IDialogResult<any>, skip: (results?: builder.IDialogResult<any>) => void) => {
                if (args) {
                    if (args.resumed === builder.ResumeReason.completed || args.resumed === builder.ResumeReason.forward) {
                        skip({ response: args.response, resumed: builder.ResumeReason.forward });
                        return;
                    } else if (args.resumed === builder.ResumeReason.back || args.resumed === builder.ResumeReason.canceled || args.resumed === builder.ResumeReason.notCompleted) {
                        // todo: should we end the conversation or just the dialog on auth failure?
                        session.endDialogWithResult({ response: false, resumed: args.resumed });
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
    public profile(session: builder.Session, providerId: string): IUser {
        // todo: add setter

        if (session && session.userData && session.userData.botauth && session.userData.botauth.user && session.userData.botauth.user.hasOwnProperty(providerId)) {
            let encryptedProfile: string = session.userData.botauth.user[providerId];

            // decrypt
            let decipher = crypto.createDecipher("aes192", this.options.secret);
            let json = decipher.update(encryptedProfile, "base64", "utf8") + decipher.final("utf8");

            return JSON.parse(json);
        } else {
            return null;
        }
    }

    public logout(session: builder.Session, providerId: string): void {
        if (session && session.userData && session.userData.botauth && session.userData.botauth.user && session.userData.botauth.user.hasOwnProperty(providerId)) {
            delete session.userData.botauth.user[providerId];
            session.save();
        }
    }

    private callbackUrl(providerName: string) {
        return `${this.options.baseUrl}/${this.options.basePath}/${providerName}/callback`;
    }

    private authUrl(providerName: string, state: string) {
        return `${this.options.baseUrl}/${this.options.basePath}/${providerName}?state=${ encodeURIComponent(state) }`;
    }

    /**
     * use the passport strategy to redirect to the authentication provider
     */
    // private passport_redirect() {
    //     let session = this.options.session;

    //     return (req: IServerRequest, res: IServerResponse, next: NextFunction) => {
    //         let providerId: string = (<any>req.params).providerId;

    //         // this redirects to the authentication provider
    //         return passport.authenticate(providerId, { session: session })(req, res, next);
    //     };
    // }

    /**
     * send callback through passport to get access/refresh tokens
     */
    // private passport_callback() {
    //     let session = this.options.session;

    //     return (req: IServerRequest, res: IServerResponse, next: NextFunction): any => {
    //         let providerId: string = (<any>req.params).providerId;
    //         return passport.authenticate(providerId, { session: session }) (req, res, next);
    //     };
    // }

    /**
     *  read the state query param and lookup stored authorization information
     */
    // private credential_callback() {
    //     let bot = this.bot;
    //     let options = this.options;

    //     return (req: IServerRequest, res: IServerResponse, next: NextFunction) => {
    //         let providerId: string = (<any>req.params).providerId;
    //         let user: any = (<any>req).user;

    //         if (!user) {
    //             res.status(403);
    //             res.send("verify function yielded no user");
    //             res.end();
    //             return;
    //         }

    //         // decode the resumption token into an address
    //         let addr: builder.IAddress = <any>JSON.parse(new Buffer((<any>req).locals.resumption, "base64").toString("utf8"));
    //         if (!addr) {
    //             // fail because we don"t have a valid bot address to resume authentication
    //             res.status(403);
    //             res.send("resumption token has expired or is invalid");
    //             res.end();
    //             return next();
    //         }

    //         // generate magic number
    //         let magic: string = crypto.randomBytes(3).toString("hex");

    //         // package up the data we need for the challenge response
    //         let response: IChallengeResponse = {
    //             providerId: providerId,
    //             user: user,
    //             timestamp: new Date()
    //         };

    //         // encrypt response data with the magic number (and secret) so that only user with magic number can decrypt later
    //         let cipher = crypto.createCipher("aes192", magic + options.secret);
    //         let encryptedResponse = cipher.update(JSON.stringify(response), "utf8", "base64") + cipher.final("base64");

    //         // temporarily store this in conversationData until user enters the magic code
    //         let botStorage: builder.IBotStorage = bot.get("storage");
    //         let botContext: builder.IBotStorageContext = { persistConversationData: true, persistUserData: false, address: addr, conversationId: addr.conversation.id };
    //         botStorage.getData(botContext, (err: Error, data: builder.IBotStorageData) => {
    //             // check for error getting bot state
    //             if (err) {
    //                 console.error(err);
    //                 res.status(403);
    //                 res.send("failed to get bot state");
    //                 res.end();
    //                 return;
    //             }

    //             // save response data to bot conversation data
    //             let magicKey = crypto.createHmac("sha256", options.secret).update(magic).digest("hex");
    //             data.conversationData.botauth = data.conversationData.botauth || {};
    //             data.conversationData.botauth.responses = data.conversationData.botauth.responses || {};
    //             data.conversationData.botauth.responses[magicKey] = encryptedResponse;

    //             // save updated data back to bot storage
    //             botStorage.saveData(botContext, data, (err) => {
    //                 if (err) {
    //                     res.status(403);
    //                     res.send("saving credential failed");
    //                     res.end();
    //                 } else {
    //                     if (this.options.successRedirect) {
    //                         res.status(302);
    //                         res.header("Location", `${options.successRedirect}#${encodeURIComponent(magic)}`);
    //                         res.send("redirecting...");
    //                         res.end();
    //                     } else {
    //                         // show the user the magic number they need to enter in the chat window
    //                         res.end(`You're almost done. To complete your authentication, put "${ magic }" in our chat.`);
    //                     }
    //                 }
    //             });
    //         });
    //     };
    // }
}