import { FacebookAccountLinkingFlow } from "./facebook-account-linking";
import { MagicCodeFlow } from "./magic";
import { IFlow } from "../interfaces";

import * as builder from "botbuilder";

export { FacebookAccountLinkingFlow, MagicCodeFlow };

/**
 * The FlowRouter launches the right Flow depending on the channel or configuration
 */
export class FlowRouter {
    constructor(private flows : IFlow[] = []) {

    }

    register(flow : IFlow) : void {
        this.flows.push(flow);
    }

    unregister(flow : IFlow) : void {
        let i = this.flows.indexOf(flow);
        if(i >= 0) {
            delete this.flows[i];
        }
    }

    loginDialog(session : builder.Session) : string {
        if(session.message.source == "facebook") {
            return "fb:link";
        } else {
            return "botauth:auth";
        }
    }

    logoutDialog(session : builder.Session) : string {
        return "botauth:logout";
    }
}