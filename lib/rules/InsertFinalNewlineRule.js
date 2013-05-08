var assert = require('assert');

InsertFinalNewlineRule = {};

InsertFinalNewlineRule.name = 'insert_final_newline';

InsertFinalNewlineRule.infer = function (sample, callback) {
    var previousToken = null;

    sample.on('data', function (token) {
        previousToken = token;
    });
    sample.on('end', function () {

        var value = null;

        if ((previousToken && previousToken.type === 'Whitespaces') &&
            (previousToken.value.indexOf('\n') !== -1) ) {

            value = 'true';
        } else {
            value = 'false';
        }

        callback(value);
    });
};

InsertFinalNewlineRule.transform = function (input, value, output) {

    var enforceRule = value[ InsertFinalNewlineRule.name ];

    assert(typeof enforceRule === 'boolean');

    var previousToken = null,
        newLine = { type: 'Whitespaces', value: '\n' };

    input.on('data', function (token) {

        if (previousToken){
            output.write(previousToken);
        }

        previousToken = token;
    });

    input.on('end', function () {

        if (previousToken && previousToken.type !== 'Whitespaces'){
            output.write(previousToken);
        }

        if (enforceRule){
            output.write(newLine);
        }

        output.end();
    });
};

module.exports = InsertFinalNewlineRule;
