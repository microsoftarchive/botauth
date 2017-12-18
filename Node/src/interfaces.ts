// 
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
// 
// Bot Auth Github:
// https://github.com/mattdot/BotAuth
// 
// Copyright (c) Microsoft Corporation
// All rights reserved.
// 
// MIT License:
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
// 
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED ""AS IS"", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import express = require("express");

export interface IUser {
    id: string;
    provider: string;
    displayName: string;
    name: {
        familyName: string,
        givenName: string,
        middleName: string
    };
    emails: [{ value: string, type: string }];
    accessToken: string;
    refreshToken: string;
};

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