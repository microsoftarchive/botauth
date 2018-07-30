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

import builder = require("botbuilder");
import crypto = require("crypto");

import { IChallengeResponse } from "./interfaces";
import { DIALOG_LIBRARY } from "./consts";

export interface IAuthDialogOptions {
    providerId?: string;
    imageUrl?: string;
    buttonUrl?: string;
    cancelMatches?: RegExp;
    reloadMatches?: RegExp;
    secret?: string;
    skypeSignIn?: string;
}

const defaultOptions: IAuthDialogOptions = {
    cancelMatches: /cancel/,
    reloadMatches: /try again/,
    secret: null
} as IAuthDialogOptions;

/**
 * Dialog which authenticates a user
 */
export class AuthDialog extends builder.Dialog {

    /**
     * Creates a new AuthDialog.
     *
     * @param {ICredentialStorage} store
     * @param {IAuthDialogOptions} options
     */
    constructor(private options?: IAuthDialogOptions) {
        super();

        this.options = Object.assign({}, defaultOptions, options);

        this.cancelAction("cancel", "cancelled", { matches: this.options.cancelMatches });
        this.reloadAction("restart", "restarted", { matches : this.options.reloadMatches});
    }

    /**
     * Dialog begins by presenting the user with a card.
     *
     * @param {builder.Session} session
     * @param {IAuthDialogOptions} args
     */
    public begin<T>(session: builder.Session, args?: IAuthDialogOptions): void {
        // persist original args to session in case we get restarted.
        if(!session.dialogData.savedArgs) {
            session.dialogData. savedArgs = args || {};
            session.save();
        }

        let opt = Object.assign({}, this.options, session.dialogData.savedArgs);
        let msg : builder.Message;

        // send the signin card to the user
        // todo: hero card vs signincard???
        switch (session.message.source) {
            case 'cortana':
            case 'msteams':
                // Teams does not support SigninCard yet.
                msg = new builder.Message(session)
                    .attachments([
                        new builder.ThumbnailCard(session)
                            .text("connect_prompt")
                            .buttons([
                                new builder.CardAction(session)
                                    .type("openUrl")
                                    .value(opt.buttonUrl)
                                    .title("connect_button")
                            ])
                    ]);
                break;
            case 'emulator':
            case 'skype':
            case 'slack':
            default:
                msg = new builder.Message(session)
                    .attachments([
                        new builder.SigninCard(session)
                        .text(args.providerId === 'azuread-openidconnect' ? args.skypeSignIn : "connect_prompt")
                            .button("connect_button", opt.buttonUrl)
                    ]);
        }

        session.send(msg);
    }

    /**
     * The user replied after being presented with the SignInCard
     *
     * @param {builder.Session} session
     */
    public replyReceived(session: builder.Session): void {
        let challenge: string = session.conversationData.challenge;
        let userEntered: string = session.message.text;
        let response: IChallengeResponse;

        let clearResponse = (mk: string) => {
            if (mk && session.conversationData.botauth && session.conversationData.responses) {
                // clear the challenge information
                delete session.conversationData.botauth.responses[mk];
                session.save();
            }
        };

        // helper function for errors
        let wrongCode = (mk: string) => {
            clearResponse(mk);

            // tell the user that the magic code was wrong and to try again
            session.send(session.localizer.gettext(session.preferredLocale(), "unauthorized", DIALOG_LIBRARY));
        };

        let magicKey = crypto.createHmac("sha256", this.options.secret).update(userEntered).digest("hex");
        if (!session.conversationData.botauth || !session.conversationData.botauth.responses || !session.conversationData.botauth.responses.hasOwnProperty(magicKey)) {
            // console.log("botauth data not found in conversationData: %j", session.conversationData);
            // wrong magic code provided.
            return wrongCode(magicKey);
        }

        let encryptedResponse = session.conversationData.botauth.responses[magicKey];
        try {
            // response data is encrypted with magic number, so decrypt it.
            let decipher = crypto.createDecipher("aes192", userEntered + this.options.secret);
            let json = decipher.update(encryptedResponse, "base64", "utf8") + decipher.final("utf8");

            // decrypted plain-text is json, so parse it
            response = JSON.parse(json);
        } catch (error) {
            // decryption failure means that the user provided the wrong magic number
            return wrongCode(magicKey);
        }

        // successfully decrypted, but no response or user. should not happen
        if (!response || !response.user) {
            return wrongCode(magicKey);
        }

        // success!!

        // clear the challenge/response data
        clearResponse(magicKey);

        let cipher = crypto.createCipher("aes192", this.options.secret);
        let encryptedUser = cipher.update(JSON.stringify(response.user), "utf8", "base64") + cipher.final("base64");

        // save user profile to userData
        session.userData.botauth = session.userData.botauth || {};
        session.userData.botauth.user = session.userData.botauth.user || {};
        session.userData.botauth.user[response.providerId] = encryptedUser;
        session.save();

        // return success to the parent dialog, and include the user.
        session.endDialogWithResult({ response : response.user, resumed : builder.ResumeReason.completed });
    }
}