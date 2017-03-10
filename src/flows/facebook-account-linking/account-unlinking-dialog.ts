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

export class FacebookAccountUnlinkingDialog extends builder.Dialog {

    /**
     * Creates a new FacebookAccountUnlinkingDialog.
     *
     */
    constructor() {
        super();
    }

    /**
     * Dialog begins by presenting the user with a card.
     *
     * @param {builder.Session} session
     * @param {IAuthDialogOptions} args
     */
    public begin<T>(session: builder.Session): void {
        let msg = new builder.Message(session).sourceEvent({
            "facebook": {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": [{
                            "title": session.localizer.gettext(session.preferredLocale(), "account_unlink_title", DIALOG_LIBRARY),
                            "buttons": [{
                                "type": "account_unlink"
                            }]
                        }]
                    }
                }
            }
        });

        session.send(msg);
    }

    public replyReceived(session: builder.Session): void {

        console.log("***UNLINK RESPONSE***\n%j", session.message);
    }
}