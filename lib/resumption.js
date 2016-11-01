"use strict";
const crypto = require("crypto");
const cookie = require("cookie");
class CookieResumption {
    constructor(maxAge, secret) {
        this.maxAge = maxAge;
        this.secret = secret;
    }
    persistHandler() {
        let maxAge = Math.floor(this.maxAge);
        let secret = this.secret;
        return (req, res, next) => {
            let cypher = crypto.createCipher("aes192", secret);
            let cookieValue = cypher.update(req.query.state, "utf8", "base64") + cypher.final("base64");
            if (res.header("Set-Cookie")) {
            }
            else {
                let c = cookie.serialize("botauth", cookieValue, { maxAge: maxAge, httpOnly: true, secure: true });
                res.header("Set-Cookie", c);
            }
            next();
        };
    }
    restoreHandler() {
        let secret = this.secret;
        return (req, res, next) => {
            let cookies = cookie.parse(req.headers.cookie || "");
            if (cookies && cookies.botauth) {
                let decypher = crypto.createDecipher("aes192", secret);
                let cookieValue = decypher.update(cookies.botauth, "base64", "utf8") + decypher.final("utf8");
                req.locals = req.locals || {};
                req.locals.resumption = cookieValue;
                res.header("Set-Cookie", cookie.serialize("botauth", "", { maxAge: 0, httpOnly: true, secure: true }));
            }
            next();
        };
    }
    ;
}
exports.CookieResumption = CookieResumption;
