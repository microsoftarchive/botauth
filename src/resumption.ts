/// <reference path="typings/index.d.ts" />
import crypto = require("crypto");
import cookie = require("cookie");

export interface IResumptionProvider {
    persistHandler() : (req : any, res : any, next : any) => void;
    restoreHandler() : (req : any, res : any, next : any) => void;
}

/**
 * Default implementation of IResumptionProvider uses cookies to store state
 * between redirect and callback of authentication.
 */
export class CookieResumption implements IResumptionProvider {
    constructor(private maxAge : number, private secret : string) {
    }

    public persistHandler() : (req : any, res : any, next : any) => void {
        let maxAge = Math.floor(this.maxAge);
        let secret = this.secret;

        return (req, res, next) => {
            let cypher = crypto.createCipher('aes192', secret);
            let cookieValue = cypher.update(req.query.state, 'utf8', 'base64') + cypher.final('base64');

            if(res.header("Set-Cookie")) {
                //todo: append cookie
            } else {
                let c = cookie.serialize("botauth", cookieValue, { maxAge : maxAge, httpOnly : true, secure : true });
                res.header("Set-Cookie", c);
            }
            next();
        };
    }

    public restoreHandler() : (req : any, res : any, next : any) => void {
        let secret = this.secret;

        return (req, res, next) => {
            console.log(req.headers.cookie);
            let cookies : any = cookie.parse(req.headers.cookie || '');

            if(cookies && cookies.botauth) {
                let decypher = crypto.createDecipher('aes192', secret);
                let cookieValue = decypher.update(cookies.botauth, 'base64', 'utf8') + decypher.final('utf8');
                
                //set the resumption token to decrypted cookie value
                req.locals = req.locals || {};
                req.locals.resumption = cookieValue;

                //delete the cookie
                res.header("Set-Cookie", cookie.serialize("botauth", "", { maxAge : 0, httpOnly : true, secure : true }));
            }

            next();
        };
    };
}