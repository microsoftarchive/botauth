"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
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
            req.session.resumption = cookieValue;
            next();
        };
    }
    restoreHandler() {
        let secret = this.secret;
        return (req, res, next) => {
            let encryptedValue = req.session.resumption;
            if (encryptedValue) {
                let decypher = crypto.createDecipher("aes192", secret);
                let cookieValue = decypher.update(encryptedValue, "base64", "utf8") + decypher.final("utf8");
                req.session.resumption = cookieValue;
            }
            next();
        };
    }
    ;
}
exports.CookieResumption = CookieResumption;
//# sourceMappingURL=resumption.js.map