import builder = require("botbuilder");
import crypto = require("crypto");

import { ICredentialStorage, ICredential } from "./storage"

export interface IAuthDialogOptions {
    providerId : string,
    text : string,
    imageUrl : string,
    buttonText : string,
    buttonUrl : string,
    cancelText : string,
    cancelMatches : RegExp
    reloadText : string,
    reloadMatches : RegExp,
    unauthorizedText : string
}

const defaultOptions : IAuthDialogOptions = {
    text : "Connect to OAuth Provider. You can say 'cancel' to go back without signing in.",
    buttonText : "connect",
    cancelText : "cancelling authentication...",
    cancelMatches : /cancel/,
    reloadText : "starting over",
    reloadMatches : /try again/,
    unauthorizedText : "The code you entered an invalid code or your authorization has expired.  Please try again."
} as IAuthDialogOptions;

/**
 * Dialog which authenticates a user
 */
export class AuthDialog extends builder.Dialog {

    /**
     * Creates a new AuthDialog.
     * 
     * @param {ICredentialStorage} store
     * @param {IAuthDialogOptions} options
     */
    constructor(private store : ICredentialStorage, private options? : IAuthDialogOptions) {
        super();

        if(!store) {
            throw new Error("ICredentialStorage should not be null");
        }

        this.options = Object.assign({}, defaultOptions, options);

        this.cancelAction("cancel", this.options.cancelText, { matches: this.options.cancelMatches, dialogArgs : false });
        this.reloadAction("restart", this.options.reloadText, { matches : this.options.reloadMatches});
    }

    /**
     * Dialog begins by presenting the user with a card.
     * 
     * @param {builder.Session} session
     * @param {IAuthDialogOptions} args
     */
    public begin<T>(session: builder.Session, args? : IAuthDialogOptions) : void {
        let opt = Object.assign({}, this.options, args);

        let state = session.conversationData.authContext = crypto.randomBytes(32).toString('hex');
        session.save();

        //send the signin card to the user
        var msg = new builder.Message(session)
            .attachments([
                new builder.SigninCard(session)
                    .text(opt.text) 
                    .button(opt.buttonText, opt.buttonUrl + '?state=' + encodeURIComponent(state))
            ]);
        session.send(msg); 
    }

    /**
     * The user replied after being presented with the SignInCard
     * 
     * @param {builder.Session} session
     */
    public replyReceived(session : builder.Session) : void {

        let convoId : string = session.conversationData.authContext;
        let userEntered : string = session.message.text;

        console.log(userEntered, session.conversationData);

        //lookup magic code
        this.store.findCredential(userEntered, convoId, (err : Error, cred : ICredential) => {
            if(err) {
                //end the dialog because of an error
                session.endDialogWithResult({ response : false, resumed : builder.ResumeReason.notCompleted, error: err });
            } else if(cred) {
                console.log(cred);
                let magicCode : string = cred._id.slice(-6);
                if(session.message.text === magicCode && convoId === cred.conversation) {
                    //authentication successful, return result to calling  
                    session.endDialogWithResult({ response : true, resumed : builder.ResumeReason.completed });
                } else {
                    //magic number is wrong
                    session.send(this.options.unauthorizedText);
                }
            } else {
                session.endDialogWithResult({response:false, resumed: builder.ResumeReason.canceled});
            }
        }); 
    }
}