import restify = require("restify");
import builder = require("botbuilder");
import passport = require("passport");

export function add(server : restify.Server, bot : builder.UniversalBot) {
    server.get('/botauth/:providerId/auth', function(req : restify.Request, res: restify.Response, next : restify.RequestHandler) {
        let providerId : string = req.params.providerId;
        let state : string = (<any>req.query).state;
        //todo: scrub provider
        return passport.authenticate(providerId, { state : state })(<any>req, <any>res, <any>next);
    });

    server.get('/botauth/:providerId/auth/callback',  
        function(req : restify.Request, res: restify.Response, next : restify.RequestHandler) {
            let providerId : string = req.params.providerId;
            return passport.authenticate(providerId) (<any> req, <any> res, <any> next);
        },
        function(req : restify.Request, res: restify.Response) {
            let providerId : string = req.params.providerId;
            let state : string = (<any>req.query).state;

            //todo: get addr from state
            let encodedAddr : string = (<any>req.query).address;

            var addr = JSON.parse(Buffer.from(encodedAddr, 'base64').toString('utf-8'));
            var botStorage = bot.get("storage");
            var botContext = {address: addr, userId : addr.user.id, conversationId : addr.conversation.id, persistUserData : true, persistConversationData: true};
            botStorage.getData(botContext, function(err : Error, data : builder.IBotStorageData) {
                console.log("\n[rest:/botauth/auth(getData)]\n%j", data);
        
                //validate authentication request
                var cs = data.privateConversationData["BotBuilder.Data.SessionState"].callstack;
                var csi = cs.findIndex(function(el : any, ind : number, arr : any) { return el.id === "botauth:authd";});        
                //cs[csi].state["BotAuth.Token"] = encodedAddr;

                if(!data.userData.botauth) data.userData.botauth = {};
                data.userData.botauth.tokens = Object.assign({}, data.userData.botauth.tokens, (<any>{})[providerId] = { accessToken : encodedAddr });

                botStorage.saveData(botContext, data, function(saveError : any) {
                    if(saveError) {
                        console.log("error saving data %j", saveError); 
                    } else { 
                        console.log("success saving data");
                    }

                    bot.receive({
                        type : "message",
                        agent: "botbuilder",
                        source : addr.channelId,
                        sourceEvent : {},
                        address : addr,
                        user : addr.user,
                        text : ""
                    } as builder.IMessage);

                    res.send(addr);
                });
            });
    });
}