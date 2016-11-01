import builder = require("botbuilder");
export interface IAuthDialogOptions {
    providerId?: string;
    text?: string;
    imageUrl?: string;
    buttonText?: string;
    buttonUrl?: string;
    cancelText?: string;
    cancelMatches?: RegExp;
    reloadText?: string;
    reloadMatches?: RegExp;
    unauthorizedText?: string;
    secret?: string;
}
export declare class AuthDialog extends builder.Dialog {
    private options;
    constructor(options?: IAuthDialogOptions);
    begin<T>(session: builder.Session, args?: IAuthDialogOptions): void;
    replyReceived(session: builder.Session): void;
}
