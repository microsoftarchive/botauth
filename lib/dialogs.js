"use strict";
const builder = require("botbuilder");
const crypto = require("crypto");
const defaultOptions = {
    text: "Connect to OAuth Provider. You can say 'cancel' to go back without signing in.",
    buttonText: "connect",
    cancelText: "cancelling authentication...",
    cancelMatches: /cancel/,
    reloadText: "starting over",
    reloadMatches: /try again/,
    unauthorizedText: "The code you entered an invalid code or your authorization has expired.  Please try again.",
    secret: null
};
class AuthDialog extends builder.Dialog {
    constructor(options) {
        super();
        this.options = options;
        this.options = Object.assign({}, defaultOptions, options);
        this.cancelAction("cancel", this.options.cancelText, { matches: this.options.cancelMatches, dialogArgs: false });
        this.reloadAction("restart", this.options.reloadText, { matches: this.options.reloadMatches });
    }
    begin(session, args) {
        let opt = Object.assign({}, this.options, args);
        var msg = new builder.Message(session)
            .attachments([
            new builder.SigninCard(session)
                .text(opt.text)
                .button(opt.buttonText, opt.buttonUrl)
        ]);
        session.send(msg);
    }
    replyReceived(session) {
        let challenge = session.conversationData.challenge;
        let userEntered = session.message.text;
        let response;
        let clearResponse = (mk) => {
            if (mk && session.conversationData.botauth && session.conversationData.responses) {
                delete session.conversationData.botauth.responses[mk];
                session.save();
            }
        };
        let wrongCode = (mk) => {
            clearResponse(mk);
            session.send(this.options.unauthorizedText);
        };
        let magicKey = crypto.createHmac("sha256", this.options.secret).update(userEntered).digest("hex");
        if (!session.conversationData.botauth || !session.conversationData.botauth.responses || !session.conversationData.botauth.responses.hasOwnProperty(magicKey)) {
            return wrongCode(magicKey);
        }
        let encryptedResponse = session.conversationData.botauth.responses[magicKey];
        try {
            let decipher = crypto.createDecipher("aes192", userEntered + this.options.secret);
            let json = decipher.update(encryptedResponse, 'base64', 'utf8') + decipher.final('utf8');
            response = JSON.parse(json);
        }
        catch (error) {
            console.error(error);
            return wrongCode(magicKey);
        }
        if (!response || !response.user) {
            return wrongCode(magicKey);
        }
        clearResponse(magicKey);
        let cipher = crypto.createCipher("aes192", this.options.secret);
        let encryptedUser = cipher.update(JSON.stringify(response.user), 'utf8', 'base64') + cipher.final('base64');
        session.userData.botauth = session.userData.botauth || {};
        session.userData.botauth.user = session.userData.botauth.user || {};
        session.userData.botauth.user[response.providerId] = encryptedUser;
        session.save();
        session.endDialogWithResult({ response: response.user, resumed: builder.ResumeReason.completed });
    }
}
exports.AuthDialog = AuthDialog;
