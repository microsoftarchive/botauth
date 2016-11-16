"use strict";

const url = require("url");
const https = require("https");
const restify = require("restify");
const envx = require("envx");
const Dropbox = require("dropbox");

//bot application identity
const MICROSOFT_APP_ID = envx("MICROSOFT_APP_ID");
const MICROSOFT_APP_PASSWORD = envx("MICROSOFT_APP_PASSWORD");

/**
 * 
 */
function getSourceToken(callback) {
    restify.createStringClient({
        url : "https://login.microsoftonline.com"
    }).post({ 
        path : "/common/oauth2/v2.0/token" 
    }, {
        grant_type : "client_credentials",
        scope : "https://graph.microsoft.com/.default",
        client_id : MICROSOFT_APP_ID,
        client_secret : MICROSOFT_APP_PASSWORD
    },  (tokenErr, tokenRequest, tokenResponse, tokenData) => {
        let tokenResult = JSON.parse(tokenData);
        callback(tokenErr, tokenResult.access_token);
    });
}

function getSourceMeta(options, callback) {
    let u = url.parse(options.sourceUrl.replace("/views/original", ""));
    let token = options.sourceToken;

    let client = restify.createClient({
        url : url.resolve(u, "/"),
        headers : {
            Authorization : `Bearer ${token}`
        }
    });

    let cb = 0;
    
    client.get(u.path, (err, req) => {
        req.on("result", function(err, result) {
            if(err) {
                return callback(err);
            }

            var data = "";
            result.on("data", function(chunk) {
                data += chunk;
            });

            result.on("end", function() {
                callback(null, data);
            });
        });
    });
}

/**
 * 
 */
function getSourceData(options, callback) {
    let u = url.parse(options.sourceUrl);
    let token = options.sourceToken;

    let client = restify.createClient({
        url : url.resolve(u, "/"),
        headers : {
            Authorization : `Bearer ${token}`
        }
    });

    let cb = 0;
    
    client.get(u.path, (err, req) => {
        req.on("result", callback);
    });
}

/**
 * 
 */
function dropboxUpload(options, callback) {
    let args = {
        "path": options.path,
        "mode": "add",
        "autorename": true,
        "mute": false
    };

    let client = restify.createClient({
        url : "https://content.dropboxapi.com",
        headers : {
            Authorization : `Bearer ${options.dropboxToken}`,
            "Content-Type" : "application/octet-stream",
            "Dropbox-API-Arg" : JSON.stringify(args)
        }
    });

    client.post({ path : "/2/files/upload"}, (err, req) => {
        if(err) {
            //connection error
            return callback (err, null);
        }

        req.on("result", (resErr, res) => {
            if(resErr) {
                // http error
                return callback (resErr, null);
            }

            let buffs = [];

            res.on("data", (chunk) => {
                buffs.push(Buffer.from(chunk));
            });

            res.on("end", () => {
                let raw = Buffer.concat(buffs).toString("utf8");
                let json = JSON.parse(raw);

                return callback(null, json);
            });
        });

        options.sourceStream.pipe(req);
    });
}

/**
 * 
 */
function upload(options, callback) {
    getSourceToken((tokenErr, token) => {
        if(tokenErr) {
            callback(tokenErr, null);
        }

        getSourceMeta({ sourceUrl : options.sourceUrl, sourceToken : token }, (metaErr, meta) => {
            if(metaErr) {
                return callback(metaErr);
            }
            
            getSourceData({ sourceUrl : options.sourceUrl, sourceToken : token }, (sourceErr, sourceStream) => {
                if(sourceErr) {
                    return callback(sourceErr, null);
                }

                dropboxUpload({ dropboxToken : options.dropboxToken, path : options.path, sourceStream : sourceStream }, callback);
            });
        });
    });
}

module.exports = upload;