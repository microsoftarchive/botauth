import builder = require("botbuilder");

export interface IAuthorization {
    _id : string,
    address : builder.IAddress
   // expires : Date
}

export interface IUser {
    _id:number,
    provider: string,
    displayName:string,
    name: {
        familyName: string,
        givenName: string,
        middleName: string
    },
    emails: [{ value: string, type: string }],
    accessToken: string,
    refreshToken: string
}

export interface IAuthorizationStore {
    findAuthorization(id : string, callback : (err : Error, auth : IAuthorization) => void) : void;
    saveAuthorization(auth : IAuthorization, callback : (err : Error, id : string) => void) : void;
    findUser(id: string, callback : (err : Error, user : IUser) => void) : void;
    saveUser(user : IUser, callback : (err : Error, id : string) => void) : void;
}