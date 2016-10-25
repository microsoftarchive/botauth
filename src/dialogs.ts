import builder = require("botbuilder");
import crypto = require("crypto");

import { IChallengeResponse } from "./interfaces";

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
        let response : IChallengeResponse;

        let clearResponse = (mk : string) => {
            if(mk && session.conversationData.botauth && session.conversationData.responses) {
                //clear the challenge information
                delete session.conversationData.botauth.responses[mk];
                session.save();
            }
        };

        //helper function for errors
        let wrongCode = (mk : string) => {
            clearResponse(mk);

            //tell the user that the magic code was wrong and to try again
            session.send(this.options.unauthorizedText);
        };

        let magicKey = crypto.createHmac("sha256", this.options.secret).update(userEntered).digest("hex");
        if(!session.conversationData.botauth || !session.conversationData.botauth.responses || !session.conversationData.botauth.responses.hasOwnProperty(magicKey)) {
            //wrong magic code provided.
            return wrongCode(magicKey);
        } 

        let encryptedResponse = session.conversationData.botauth.responses[magicKey];
        try {
            //response data is encrypted with magic number, so decrypt it.
            let decipher = crypto.createDecipher("aes192", userEntered + this.options.secret);
            let json = decipher.update(encryptedResponse, 'base64', 'utf8') + decipher.final('utf8');

            //decrypted plain-text is json, so parse it
            response = JSON.parse(json);            
        } catch (error) {
            //decryption failure means that the user provided the wrong magic number
            console.error(error);
            return wrongCode(magicKey);
        }

        //successfully decrypted, but no response or user. should not happen
        if(!response || !response.user) {
            return wrongCode(magicKey);
        }
        
        //success!!

        //clear the challenge/response data
        clearResponse(magicKey);

        let cipher = crypto.createCipher("aes192", this.options.secret);
        let encryptedUser = cipher.update(JSON.stringify(response.user), 'utf8', 'base64') + cipher.final('base64');

        //save user profile to userData
        session.userData.botauth = session.userData.botauth || {};
        session.userData.botauth.user = session.userData.botauth.user || {};
        session.userData.botauth.user[response.providerId] = encryptedUser;
        session.save();

        //return success to the parent dialog, and include the user.
        session.endDialogWithResult({ response : response.user, resumed : builder.ResumeReason.completed });
    }
}