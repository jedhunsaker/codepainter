var assert = require('assert');

SpacesInParensRule = {};

SpacesInParensRule.name = 'spaces_in_parens';

function isPunctuatorValue( token, value ){
    return token && token.type === 'Punctuator' && token.value === value;
}

function isOpeningParen(token) {
    return isPunctuatorValue( token, '(' );
}

function isClosingParen(token) {
    return isPunctuatorValue( token, ')' );
}

function isOpeningBrace( token ){
    return isPunctuatorValue( token, '{' );
}

function isClosingBrace( token ){
    return isPunctuatorValue( token, '}' );
}

function isWhitespace( token ){
    return token && token.type == 'Whitespaces';
}

function isOpeningBraceAfterParen( token, previousTokens ){
    return isOpeningBrace( token ) && (
           isOpeningParen( previousTokens[ 1 ] ) ||
           isOpeningParen( previousTokens[ 0 ] ) && isWhitespace( previousTokens[ 1 ] ) );
}

function isClosingParenAfterBrace( token, previousTokens ){
    return isClosingParen( token ) && (
           isClosingBrace( previousTokens[ 1 ] ) ||
           isClosingBrace( previousTokens[ 0 ] ) && isWhitespace( previousTokens[ 1 ] ) );
}

SpacesInParensRule.infer = function (sample, callback) {
    var previousTokens = new Array( 2 ),
        trendTrue = 0,
        trendFalse = 0,
        trendIdiomatic = 0;

    sample.on('data', function (token) {

        if( isOpeningParen( previousTokens[ 1 ] ) && isWhitespace( token ) ||
            isWhitespace( previousTokens[ 1 ] ) && isClosingParen( token ) ){
            trendTrue++;
        } else if ( ! isOpeningParen( previousTokens[ 1 ] ) && isClosingParen( token ) ||
            isOpeningParen( previousTokens[ 1 ] ) && !isClosingParen( token ) ){
            trendFalse++;
        }

        var checks = [ isOpeningBraceAfterParen, isClosingParenAfterBrace ];
        for( var i = 0; i < checks.length; i++ ){
            if( checks[ i ]( token, previousTokens ) && ! isWhitespace( previousTokens[ 1 ] ) ){
                trendIdiomatic++;
            }
        }

        previousTokens.shift();
        previousTokens.push( token );
    });

    sample.on('end', function () {
        if( trendTrue >= trendFalse ){
            callback( ( trendIdiomatic > 1 ) ? 'idiomatic' : 'true' );
        } else {
            callback( 'false' );
        }
    });
};

SpacesInParensRule.transform = function (input, value, output) {

    var ruleValue = value[ SpacesInParensRule.name ],
        previousTokens = new Array( 2 ),
        space = {
            type: 'Whitespaces',
            value: ' '
        };

    assert(typeof ruleValue === 'boolean' || ruleValue === 'idiomatic');

    function shiftTokens( token ){
        previousTokens.shift();
        previousTokens.push( token );
    }

    input.on('data', function (token) {

        do {

            if( isOpeningParen( previousTokens[ 1 ] ) ){
                if( isWhitespace( token ) ){
                    return shiftTokens( token );
                } else if( ruleValue === 'idiomatic' && ! isClosingParen( token ) ){
                    output.write( space );
                }
            } else if( isClosingParen( token ) ){
                if( ruleValue === 'idiomatic' && ! isOpeningParen( previousTokens[ 1 ] ) ){
                    if( ! isWhitespace( previousTokens[ 1 ] ) ){
                        output.write( space );
                    }
                }
            } else if( isClosingBrace( previousTokens[ 1 ] ) && isWhitespace( token ) ){
                return shiftTokens( token );
            } else if( isClosingBrace( previousTokens[ 0 ] ) &&
                       isWhitespace( previousTokens[ 1 ] ) &&
                       ! isClosingParen( token ) ){
                output.write( previousTokens[ 1 ] );
            } else if( ( isOpeningBraceAfterParen( token, previousTokens ) ||
                         isClosingParenAfterBrace( token, previousTokens ) ) &&
                         ruleValue === 'idiomatic' ){
                previousTokens[ 1 ].value = '';
                output.write( previousTokens[ 1 ] );
            }

            output.write( token );
            shiftTokens( token );

        } while( false );

        previousTokens.shift();
        previousTokens.push( token );
    });

    input.on('end', function () {
        output.end();
    });
};

module.exports = SpacesInParensRule;
