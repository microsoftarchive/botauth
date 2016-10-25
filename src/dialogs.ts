import builder = require("botbuilder");
import crypto = require("crypto");

//import { ICredentialStorage, ICredential } from "./storage"

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
    unauthorizedText : string,
    secret : string
}

const defaultOptions : IAuthDialogOptions = {
    text : "Connect to OAuth Provider. You can say 'cancel' to go back without signing in.",
    buttonText : "connect",
    cancelText : "cancelling authentication...",
    cancelMatches : /cancel/,
    reloadText : "starting over",
    reloadMatches : /try again/,
    unauthorizedText : "The code you entered an invalid code or your authorization has expired.  Please try again.",
    secret : null
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
    constructor(private options? : IAuthDialogOptions) {
        super();

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

        // let state = session.conversationData.botauth.challenge = crypto.randomBytes(32).toString('hex');
        // session.save();

        //send the signin card to the user
        //todo: hero card vs signincard???
        var msg = new builder.Message(session)
            .attachments([
                new builder.SigninCard(session)
                    .text(opt.text) 
                    .button(opt.buttonText, opt.buttonUrl)
            ]);
        session.send(msg);
    }

    /**
     * The user replied after being presented with the SignInCard
     * 
     * @param {builder.Session} session
     */
    public replyReceived(session : builder.Session) : void {
        let challenge : string = session.conversationData.challenge;
        let userEntered : string = session.message.text;

        let user : any;

        try {
            let decipher = crypto.createDecipher("aes192", userEntered + this.options.secret);
            let json = decipher.update(session.conversationData.botauth.response, 'base64', 'utf8') + decipher.final('utf8');
            user = JSON.parse(json);            
        } catch (error) {
            //decryption failure means that the user provided the wrong magic number
            console.error(error);
            user = null;
        }

        if(!user) {
            //clear the challenge information
            session.conversationData.botauth.response = null;
            session.save();

            //tell the user that the magic code was wrong and to try again
            session.send(this.options.unauthorizedText);
            return;
        } else {
            //clear the challenge information
            session.conversationData.botauth.response = null;

            //save user profile to userData
            session.userData.botauth = session.userData.botauth || {};
            session.userData.botauth.user = session.userData.botauth.user || {};
            session.userData.botauth.user[user.provider] = user;
            session.save();

            console.log(session.userData.botauth.user);

            //return success to the parent dialog, and include the user.
            session.endDialogWithResult({ response : user, resumed : builder.ResumeReason.completed });
        }
    }
}