"use strict";
const facebook_account_linking_1 = require("./facebook-account-linking");
exports.FacebookAccountLinkingFlow = facebook_account_linking_1.FacebookAccountLinkingFlow;
const magic_1 = require("./magic");
exports.MagicCodeFlow = magic_1.MagicCodeFlow;
class FlowRouter {
    constructor(flows = []) {
        this.flows = flows;
    }
    register(flow) {
        this.flows.push(flow);
    }
    unregister(flow) {
        let i = this.flows.indexOf(flow);
        if (i >= 0) {
            delete this.flows[i];
        }
    }
    loginDialog(session) {
        if (session.message.source == "facebook") {
            return "fb:link";
        }
        else {
            return "botauth:auth";
        }
    }
    logoutDialog(session) {
        return "botauth:logout";
    }
}
exports.FlowRouter = FlowRouter;
