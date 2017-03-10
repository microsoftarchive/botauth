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

import { IChallengeResponse } from "../../interfaces";
import { DIALOG_LIBRARY } from "../../consts";

export interface IAuthDialogOptions {
    providerId?: string;
    imageUrl?: string;
    buttonUrl?: string;
    cancelMatches?: RegExp;
    reloadMatches?: RegExp;
    secret?: string;
}

const defaultOptions: IAuthDialogOptions = {
    cancelMatches: /cancel/,
    reloadMatches: /try again/,
    secret: null
} as IAuthDialogOptions;

/**
 * Dialog which authenticates a user
 */
export class FacebookAccountLinkingDialog extends builder.Dialog {

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

        let msg = new builder.Message(session).sourceEvent({
            "facebook": {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": [{
                            "title": session.localizer.gettext(session.preferredLocale(), "account_link_title", DIALOG_LIBRARY),
                            "image_url": opt.imageUrl,
                            "buttons": [{
                                "type": "account_link",
                                "url": opt.buttonUrl
                            }]
                        }]
                    }
                }
            }
        });

        session.send(msg);
    }

    /**
     * The user replied after being presented with the SignInCard
     *
     * @param {builder.Session} session
     */
    public replyReceived(session: builder.Session): void {
        console.log("***LINK RESPONSE***\n%j", session.message);
//         { type: 'message',
//   timestamp: '2017-01-06T19:37:12.3821378Z',
//   sourceEvent:
//    { 
//      sender: { id: '' },
//      recipient: { id: '' },
//      timestamp: 1483731432411,
//      account_linking: { authorization_code: '', status: 'linked' } 
//    },
//   text: '',
//   attachments: [],
//   entities: [],
//   address:
//    { id: '',
//      channelId: 'facebook',
//      user: { id: '', name: '' },
//      conversation: { isGroup: false, id: '' },
//      bot: { id: '', name: 'botauthsampledev' },
//      serviceUrl: 'https://facebook.botframework.com',
//      useAuth: true },
//   source: 'facebook',
//   agent: 'botbuilder',
//   user: { id: '', name: '' } }
        if(session.message.source === "facebook" 
            && session.message.sourceEvent 
            && session.message.sourceEvent.account_linking) 
        {
            let user = {};

            //is an account linking message.        
            if(session.message.sourceEvent.account_linking.status === "linked") {
                let code = session.message.sourceEvent.account_linking.authorization_code;

                // return success to the parent dialog, and include the user.
                session.endDialogWithResult({ response : user, resumed : builder.ResumeReason.completed });
            } else {
                session.endDialogWithResult({ resumed : builder.ResumeReason.canceled });
            }
        } else {
            //what to do here?
        }
    }
}