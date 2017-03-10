import { FacebookAccountLinkingDialog } from "./account-linking-dialog";
import { FacebookAccountUnlinkingDialog } from "./account-unlinking-dialog";
import { IBotAuthenticator, IServerRequest, IServerResponse, IFlow } from "../../interfaces";

import * as builder from "botbuilder";
import * as crypto from "crypto";

export class FacebookAccountLinkingFlow implements IFlow {
    constructor(authenticator : IBotAuthenticator) {
        // configure bot hooks

        // add dialogs
        let fb = new builder.Library("fb");
        fb.dialog("link", new FacebookAccountLinkingDialog());
        fb.dialog("unlink", new FacebookAccountUnlinkingDialog());
        authenticator.bot.library(fb);

        // setup http routes
        authenticator.server.get("/account_linking", function (req : IServerRequest, res : IServerResponse) {
            console.log(req.query.account_linking_token);
            console.log(req.query.redirect_uri);

            //var redirectUri = url.parse(req.query.redirect_uri);
            var authCode = encodeURIComponent(crypto.randomBytes(54).toString("base64"));
            res.status(302);
            res.header("Location", `${req.query.redirect_uri}&authorization_code=${authCode}`);
            res.send("redirecting");
            res.end();
        });
    }

    get id() : string {
        return "facebook-account-linking";
    }

    supported(session : builder.Session) : boolean {
        return (session.message.source === "facebook");
    }

    login(session : builder.Session) : void {

    }

    logout(session : builder.Session) : void {

    }

    loginCallback(error : Error, user : any, state : any, req : IServerRequest, res : IServerResponse) : Promise<any> {
        return new Promise(() => true); 
    }
}