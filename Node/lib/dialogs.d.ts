import builder = require("botbuilder");
export interface IAuthDialogOptions {
    providerId?: string;
    imageUrl?: string;
    buttonUrl?: string;
    cancelMatches?: RegExp;
    reloadMatches?: RegExp;
    secret?: string;
}
export declare class AuthDialog extends builder.Dialog {
    private options?;
    constructor(options?: IAuthDialogOptions);
    begin<T>(session: builder.Session, args?: IAuthDialogOptions): void;
    replyReceived(session: builder.Session): void;
}
