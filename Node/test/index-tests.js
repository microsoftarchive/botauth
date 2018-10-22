"use strict";
const assert = require('assert');
const botauth = require('../lib/index');

const mockServer = {
    use : () => {},
    get : () => {},
    post : () => {}
};

const mockBot = {
    set : () => {},
    library : () => {}
}

describe('BotAuthenticator', function() {
    describe('#constructor', function() {
        it('should create an instance if required parameters are provided', function() {
            let ba = new botauth.BotAuthenticator(mockServer, mockBot, { baseUrl : "https://botauth.azurewebsites.net", secret : "shhhhh" });
        });

        it('should error if bot is null', function() {
            assert.throws(function() {
                let ba = new botauth.BotAuthenticator(null, {}, { baseUrl : "https://botauth.azurewebsites.net", secret : "shhhhh" });
            });
        });

        it('should error if baseUrl is null', function() {
            assert.throws(function() {
                let ba = new botauth.BotAuthenticator({}, {}, { secret : "shhhhh" });
            });
        });

        it('should error if baseUrl protocol is not https', function() {
            assert.throws(function() {
                let ba = new botauth.BotAuthenticator({}, {}, { baseUrl : "http://botauth.azurewebsites.net", secret : "shhhhh" });
            });
        });
        
        it('should error if baseUrl is does not have a protocol', function() {
            assert.throws(function() {
                let ba = new botauth.BotAuthenticator({}, {}, { baseUrl : "//botauth.azurewebsites.net", secret : "shhhhh" });
            });
        });

        it('should default servicePath to botauth', function() {
          let server = {
            use : () => {},
            get : (route,b,c) => {assert(route.startsWith('/botauth')) },
            post : (route,b,c,e) => {assert(route.startsWith('/botauth'))}
          };
          let ba = new botauth.BotAuthenticator(server, mockBot,  { baseUrl : "https://botauth.azurewebsites.net", secret : "shhhhh" });
          assert.equal(ba.options.servicePath, 'botauth')
        });

        it('should override servicePath when set', function() {
          let server = {
            use : () => {},
            get : (route,b,c) => {assert(route.startsWith('/servicePath')) },
            post : (route,b,c,e) => {assert(route.startsWith('/servicePath'))}
          };
          let ba = new botauth.BotAuthenticator(server, mockBot,  { baseUrl : "https://botauth.azurewebsites.net", secret : "shhhhh", servicePath: "servicePath" });
          assert.equal(ba.options.servicePath, 'servicePath')
        });
    });
});