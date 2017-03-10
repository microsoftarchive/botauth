"use strict";
exports.DIALOG_LIBRARY = "botauth";
exports.DIALOG_ID = "auth";
exports.DIALOG_FULLNAME = `${this.DIALOG_LIBRARY}:${this.DIALOG_ID}`;
const builder = require("botbuilder");
const path = require("path");
const magic_dialog_1 = require("./magic-dialog");
class MagicCodeFlow {
    constructor(authenticator, options) {
        let lib = new builder.Library(exports.DIALOG_LIBRARY);
        lib.localePath(path.join(__dirname, "../locale/"));
        lib.dialog(exports.DIALOG_ID, new magic_dialog_1.MagicDialog({ secret: options.secret }));
        authenticator.bot.library(lib);
    }
    get id() {
        return "magic-code";
    }
    login(session) {
    }
    logout(session) {
    }
}
exports.MagicCodeFlow = MagicCodeFlow;
