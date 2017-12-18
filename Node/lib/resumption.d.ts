export interface IResumptionProvider {
    persistHandler(): (req: any, res: any, next: any) => void;
    restoreHandler(): (req: any, res: any, next: any) => void;
}
export declare class CookieResumption implements IResumptionProvider {
    private maxAge;
    private secret;
    constructor(maxAge: number, secret: string);
    persistHandler(): (req: any, res: any, next: any) => void;
    restoreHandler(): (req: any, res: any, next: any) => void;
}
