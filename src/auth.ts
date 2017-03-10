import * as passport from "passport";
import { IBotAuthenticator } from "./interfaces";

export function setupPassport(authenticator: IBotAuthenticator) {

    passport.serializeUser((user : any, done: any)=>{
        //todo: serialize to bot state
        done(null, user);
    });

    passport.deserializeUser((user : any, done: any)=> {
        //todo: deserialize from bot state
        done(null, user);
    });

    authenticator.server.use(passport.initialize());
    authenticator.server.use(passport.session());
};