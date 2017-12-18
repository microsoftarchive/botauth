"use strict";

let UploadRecognizer = function(intent) {
    this.uploadIntent = intent || "upload"; 
};

UploadRecognizer.prototype.recognize = function(context, callback) {
    let result = { score : 0.0, intent: null };
    if(context.message && context.message.attachments && context.message.attachments.length > 0) {
        result.score = 1.0;
        result.intent = this.uploadIntent;
    }

    console.log(result);

    callback(null, result);
}

module.exports = UploadRecognizer;