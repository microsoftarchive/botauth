const assert = require('assert');
const builder = require('botbuilder');
const library = require('../lib/library');

describe('library', function() {
    describe('#auth', function() {
        it('should register auth dialog', function() {
            var bot = new builder.UniversalBot();
            bot.library(library);

            // assert(bot.dialog("auth"), "botauth:auth dialog not found");
            // assert(bot.dialog("botauth:auth"), "botauth:auth dialog not found");
        });
    });
});