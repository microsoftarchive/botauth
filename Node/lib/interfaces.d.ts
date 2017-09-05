import express = require("express");
export interface IUser {
    id: string;
    provider: string;
    displayName: string;
    name: {
        familyName: string;
        givenName: string;
        middleName: string;
    };
    emails: [{
        value: string;
        type: string;
    }];
    accessToken: string;
    refreshToken: string;
}
export interface IChallengeResponse {
    providerId: string;
    user: IUser;
    timestamp: Date;
}
export interface IServer extends express.Application {
}
export interface IServerRequest extends express.Request {
}
export interface IServerResponse extends express.Response {
}
export { RequestHandler, NextFunction } from "express";
