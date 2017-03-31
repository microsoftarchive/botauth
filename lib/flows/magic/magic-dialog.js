"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const builder = require("botbuilder");
const crypto = require("crypto");
const consts_1 = require("../../consts");
const defaultOptions = {
    cancelMatches: /cancel/,
    reloadMatches: /try again/,
    secret: null
};
class MagicDialog extends builder.Dialog {
    constructor(options) {
        super();
        this.options = options;
        this.options = Object.assign({}, defaultOptions, options);
        this.cancelAction("cancel", "cancelled", { matches: this.options.cancelMatches });
        this.reloadAction("restart", "restarted", { matches: this.options.reloadMatches });
    }
    begin(session, args) {
        if (!session.dialogData.savedArgs) {
            session.dialogData.savedArgs = args || {};
            session.save();
        }
        let opt = Object.assign({}, this.options, session.dialogData.savedArgs);
        let msg = new builder.Message(session)
            .attachments([
            new builder.SigninCard(session)
                .text("connect_prompt")
                .button("connect_button", opt.buttonUrl)
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
            session.send(session.localizer.gettext(session.preferredLocale(), "unauthorized", consts_1.DIALOG_LIBRARY));
        };
        let magicKey = crypto.createHmac("sha256", this.options.secret).update(userEntered).digest("hex");
        if (!session.conversationData.botauth || !session.conversationData.botauth.responses || !session.conversationData.botauth.responses.hasOwnProperty(magicKey)) {
            return wrongCode(magicKey);
        }
        let encryptedResponse = session.conversationData.botauth.responses[magicKey];
        try {
            let decipher = crypto.createDecipher("aes192", userEntered + this.options.secret);
            let json = decipher.update(encryptedResponse, "base64", "utf8") + decipher.final("utf8");
            response = JSON.parse(json);
        }
        catch (error) {
            return wrongCode(magicKey);
        }
        if (!response || !response.user) {
            return wrongCode(magicKey);
        }
        clearResponse(magicKey);
        let cipher = crypto.createCipher("aes192", this.options.secret);
        let encryptedUser = cipher.update(JSON.stringify(response.user), "utf8", "base64") + cipher.final("base64");
        session.userData.botauth = session.userData.botauth || {};
        session.userData.botauth.user = session.userData.botauth.user || {};
        session.userData.botauth.user[response.providerId] = encryptedUser;
        session.save();
        session.endDialogWithResult({ response: response.user, resumed: builder.ResumeReason.completed });
    }
}
exports.MagicDialog = MagicDialog;
