"use strict";
const builder = require("botbuilder");
const consts_1 = require("../../consts");
class FacebookAccountUnlinkingDialog extends builder.Dialog {
    constructor() {
        super();
    }
    begin(session) {
        let msg = new builder.Message(session).sourceEvent({
            "facebook": {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": [{
                                "title": session.localizer.gettext(session.preferredLocale(), "account_unlink_title", consts_1.DIALOG_LIBRARY),
                                "buttons": [{
                                        "type": "account_unlink"
                                    }]
                            }]
                    }
                }
            }
        });
        session.send(msg);
    }
    replyReceived(session) {
        console.log("***UNLINK RESPONSE***\n%j", session.message);
    }
}
exports.FacebookAccountUnlinkingDialog = FacebookAccountUnlinkingDialog;
