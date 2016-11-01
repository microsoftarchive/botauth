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

import crypto = require("crypto");
import cookie = require("cookie");

export interface IResumptionProvider {
    persistHandler(): (req: any, res: any, next: any) => void;
    restoreHandler(): (req: any, res: any, next: any) => void;
}

/**
 * Default implementation of IResumptionProvider uses cookies to store state
 * between redirect and callback of authentication.
 */
export class CookieResumption implements IResumptionProvider {
    /**
     * 
     */
    constructor(private maxAge: number, private secret: string) {
    }

    /**
     * 
     */
    public persistHandler(): (req: any, res: any, next: any) => void {
        let maxAge = Math.floor(this.maxAge);
        let secret = this.secret;

        return (req, res, next) => {
            let cypher = crypto.createCipher("aes192", secret);
            let cookieValue = cypher.update(req.query.state, "utf8", "base64") + cypher.final("base64");

            if (res.header("Set-Cookie")) {
                // todo: append cookie
            } else {
                let c = cookie.serialize("botauth", cookieValue, { maxAge : maxAge, httpOnly : true, secure : true });
                res.header("Set-Cookie", c);
            }
            next();
        };
    }

    /**
     * 
     */
    public restoreHandler(): (req: any, res: any, next: any) => void {
        let secret = this.secret;

        // return implementation of the handler
        return (req, res, next) => {
            let cookies: any = cookie.parse(req.headers.cookie || "");

            if (cookies && cookies.botauth) {
                let decypher = crypto.createDecipher("aes192", secret);
                let cookieValue = decypher.update(cookies.botauth, "base64", "utf8") + decypher.final("utf8");

                // set the resumption token to decrypted cookie value
                req.locals = req.locals || {};
                req.locals.resumption = cookieValue;

                // delete the cookie
                res.header("Set-Cookie", cookie.serialize("botauth", "", { maxAge: 0, httpOnly: true, secure: true }));
            }

            next();
        };
    };
}