var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var AuthorizationSchema = new Schema({
    id: { type: String, index: true },
    address: {
        id: { type: String },
        channelId: { type: String },
        user: {
            id: { type: String },
            name: { type: String },
            isGroup: { type: Boolean }
        },
        bot: {
            id: { type: String },
            name: { type: String },
            isGroup: { type: Boolean }
        },
        conversation: {
            id: { type: String },
            name: { type: String },
            isGroup: { type: Boolean }
        },
        serviceUrl: { type: String },
        useAuth: { type: Boolean }
    },
    createdAt: { type: Date, expires: 3600, default: Date.now }
});
module.exports = mongoose.model('Authorization', AuthorizationSchema);
