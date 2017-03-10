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

export const DIALOG_LIBRARY: string = "botauth";
export const DIALOG_ID: string = "auth";
export const DIALOG_FULLNAME : string = `${this.DIALOG_LIBRARY}:${this.DIALOG_ID}`;

import { IBotAuthenticator, IServerRequest, IServerResponse, IFlow } from "../../interfaces";
import * as builder from "botbuilder";
import * as path from "path";

import { MagicDialog, IMagicDialogOptions } from "./magic-dialog";

/**
 * 
 */
export class MagicCodeFlow implements IFlow {
    constructor(authenticator : IBotAuthenticator, options : any) {
        let lib = new builder.Library(DIALOG_LIBRARY);
        lib.localePath(path.join(__dirname, "../locale/"));
        lib.dialog(DIALOG_ID, new MagicDialog({ secret: options.secret }));
        authenticator.bot.library(lib);
    }

    /**
     * 
     */
    get id() {
        return "magic-code";
    }
    
    /**
     * 
     * @param session 
     */
    login(session : builder.Session) : void {
    }

    logout(session: builder.Session) : void {
    }
}