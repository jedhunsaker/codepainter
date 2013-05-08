var assert = require('assert');

SpaceAfterAnonymousFunctionsRule = {};

SpaceAfterAnonymousFunctionsRule.name = 'space_after_anonymous_functions';

SpaceAfterAnonymousFunctionsRule.infer = function (sample, callback) {
    var previousTokens = new Array(2),
        spacePresent = 0,
        spaceOmitted = 0,
        totalCount = 0; // FIXME: spacePresent + spaceOmitted + stuff this doesn't handle.

    sample.on('data', function (token) {
        if (previousTokens[0] &&
            previousTokens[0].type === 'Keyword' &&
            previousTokens[0].value === 'function') {
            if (previousTokens[1].type === 'Punctuator' &&
                previousTokens[1].value === '(') {
                spaceOmitted++;
                totalCount++;
            } else {
                assert(previousTokens[1].type === 'Whitespaces');
                if (token.type === 'Punctuator' && token.value === '(') {
                    // Anonymous function.
                    if (previousTokens[1].value === ' ')
                        spacePresent++;
                    totalCount++;
                } else {
                    // Named function.
                    assert(token.type === 'Identifier');
                }
            }
        }
        previousTokens[0] = previousTokens[1];
        previousTokens[1] = token;
    });
    sample.on('end', function () {
        var unknown = totalCount - spacePresent - spaceOmitted,
            max = Math.max(unknown, spacePresent, spaceOmitted),
            value = null;

        if (spacePresent === max)
            value = 'true';
        else if (spaceOmitted === max)
            value = 'false';
        callback(value);
    });
};

SpaceAfterAnonymousFunctionsRule.transform = function (input, value, output) {

    var enforceRule = value[ SpaceAfterAnonymousFunctionsRule.name ];

    assert(typeof enforceRule === 'boolean');

    var previousTokens = new Array(2),
        space = { type: 'Whitespaces', value: ' ' };

    input.on('data', function (token) {
        if (previousTokens[1] && previousTokens[1].type === 'Keyword' &&
            previousTokens[1].value === 'function') {
            if (token.type === 'Punctuator' && token.value === '(') {
                if (enforceRule)
                    output.write(space);
                output.write(token);
            } else {
                assert(token.type === 'Whitespaces');
                // Omit until we know if it's an anonymous function.
            }
        } else if (previousTokens[0] && previousTokens[0].type === 'Keyword' &&
                   previousTokens[0].value === 'function' &&
                   previousTokens[1].type === 'Whitespaces') {
            if (token.type === 'Punctuator' && token.value === '(') {
                // Anonymous function.
                if (enforceRule)
                    output.write(space);
            } else {
                // Named function.
                assert(token.type === 'Identifier');
                output.write(previousTokens[1]);
            }
            output.write(token);
        } else {
            output.write(token);
        }
        previousTokens[0] = previousTokens[1];
        previousTokens[1] = token;
    });
    input.on('end', function () {
        output.end();
    });
};

module.exports = SpaceAfterAnonymousFunctionsRule;
