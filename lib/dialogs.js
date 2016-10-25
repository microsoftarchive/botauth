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
        let user;
        try {
            let decipher = crypto.createDecipher("aes192", userEntered + this.options.secret);
            let json = decipher.update(session.conversationData.botauth.response, 'base64', 'utf8') + decipher.final('utf8');
            user = JSON.parse(json);
        }
        catch (error) {
            console.error(error);
            user = null;
        }
        if (!user) {
            session.conversationData.botauth.response = null;
            session.save();
            session.send(this.options.unauthorizedText);
            return;
        }
        else {
            session.conversationData.botauth.response = null;
            session.userData.botauth = session.userData.botauth || {};
            session.userData.botauth.user = session.userData.botauth.user || {};
            session.userData.botauth.user[user.provider] = user;
            session.save();
            console.log(session.userData.botauth.user);
            session.endDialogWithResult({ response: user, resumed: builder.ResumeReason.completed });
        }
    }
}
exports.AuthDialog = AuthDialog;
