"use strict";
const builder = require("botbuilder");
const consts_1 = require("../../consts");
const defaultOptions = {
    cancelMatches: /cancel/,
    reloadMatches: /try again/,
    secret: null
};
class FacebookAccountLinkingDialog extends builder.Dialog {
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
        let msg = new builder.Message(session).sourceEvent({
            "facebook": {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": [{
                                "title": session.localizer.gettext(session.preferredLocale(), "account_link_title", consts_1.DIALOG_LIBRARY),
                                "image_url": opt.imageUrl,
                                "buttons": [{
                                        "type": "account_link",
                                        "url": opt.buttonUrl
                                    }]
                            }]
                    }
                }
            }
        });
        session.send(msg);
    }
    replyReceived(session) {
        console.log("***LINK RESPONSE***\n%j", session.message);
        if (session.message.source === "facebook"
            && session.message.sourceEvent
            && session.message.sourceEvent.account_linking) {
            let user = {};
            if (session.message.sourceEvent.account_linking.status === "linked") {
                let code = session.message.sourceEvent.account_linking.authorization_code;
                session.endDialogWithResult({ response: user, resumed: builder.ResumeReason.completed });
            }
            else {
                session.endDialogWithResult({ resumed: builder.ResumeReason.canceled });
            }
        }
        else {
        }
    }
}
exports.FacebookAccountLinkingDialog = FacebookAccountLinkingDialog;
