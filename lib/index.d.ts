import builder = require("botbuilder");
import { AuthDialog, IAuthDialogOptions } from "./dialogs";
export { AuthDialog, IAuthDialogOptions };
import { IResumptionProvider, CookieResumption } from "./resumption";
export { IResumptionProvider, CookieResumption };
import { IChallengeResponse, IUser, IServer } from "./interfaces";
export { IChallengeResponse, IUser };
export interface IBotAuthenticatorOptions {
    baseUrl: string;
    basePath?: string;
    secret: string;
    resumption?: IResumptionProvider;
    successRedirect?: string;
    session?: boolean;
}
export interface IStrategyOptions {
    callbackURL: string;
}
export interface IStrategy {
    authenticate(req: any, options: any): void;
}
export interface IAuthenticateOptions {
}
export declare class BotAuthenticator {
    private server;
    private bot;
    private options;
    constructor(server: IServer, bot: builder.UniversalBot, options: IBotAuthenticatorOptions);
    provider(name: string, factory: (options: IStrategyOptions) => IStrategy): BotAuthenticator;
    authenticate(providerId: string, options: IAuthenticateOptions): builder.IDialogWaterfallStep[];
    profile(session: builder.Session, providerId: string): IUser;
    logout(session: builder.Session, providerId: string): void;
    private callbackUrl(providerName);
    private authUrl(providerName, state);
    private passport_redirect();
    private passport_callback();
    private credential_callback(req, res, next);
}
