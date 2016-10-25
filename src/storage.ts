export interface ICredential {
    _id : string,
    conversation : string

    authToken : string,
    refreshToken : string,
    user : any
}

export interface ICredentialStorage {
    findCredential(magic : string, conversationId : string, callback : (error : Error, credential : ICredential) => void ) : void;
    saveCredential(credential : ICredential, callback : (error : Error, credential : ICredential) => void ) : void;
}

export interface IUserId {
    id : string, 
    provider : string
}

export interface IUser {
    id : string,
    provider : string,
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