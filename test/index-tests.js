const assert = require('assert');
const botauth = require('../lib/index');

describe('botauth', function() {
    describe('#configure', function() {
        it('should error if bot is not passed', function() {
            assert.throws(function() {
                var ba = new botauth();
            });
        });

        
    });
});