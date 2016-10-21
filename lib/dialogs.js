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
    unauthorizedText: "The code you entered an invalid code or your authorization has expired.  Please try again."
};
class AuthDialog extends builder.Dialog {
    constructor(store, options) {
        super();
        this.store = store;
        this.options = options;
        if (!store) {
            throw new Error("ICredentialStorage should not be null");
        }
        this.options = Object.assign({}, defaultOptions, options);
        this.cancelAction("cancel", this.options.cancelText, { matches: this.options.cancelMatches, dialogArgs: false });
        this.reloadAction("restart", this.options.reloadText, { matches: this.options.reloadMatches });
    }
    begin(session, args) {
        let opt = Object.assign({}, this.options, args);
        let state = session.conversationData.authContext = crypto.randomBytes(32).toString('hex');
        session.save();
        var msg = new builder.Message(session)
            .attachments([
            new builder.SigninCard(session)
                .text(opt.text)
                .button(opt.buttonText, opt.buttonUrl + '?state=' + encodeURIComponent(state))
        ]);
        session.send(msg);
    }
    replyReceived(session) {
        let convoId = session.conversationData.authContext;
        this.store.findCredential(session.message.text, convoId, (err, cred) => {
            let magicCode = cred._id.slice(-6);
            if (err) {
                session.endDialogWithResult({ response: false, resumed: builder.ResumeReason.notCompleted, error: err });
            }
            else if (cred && session.message.text === magicCode && convoId === cred.conversation) {
                session.endDialogWithResult({ response: true, resumed: builder.ResumeReason.completed });
            }
            else {
                session.send(this.options.unauthorizedText);
            }
        });
    }
}
exports.AuthDialog = AuthDialog;
