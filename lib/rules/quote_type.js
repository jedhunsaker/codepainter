var assert = require( 'assert' ),
	string = require( '../util/string' );

QuoteTypeRule = {};

QuoteTypeRule.name = 'quote_type';

QuoteTypeRule.infer = function( sample, callback ) {
	var doubleQuotes = 0,
		totalCount = 0;

	sample.on( 'data', function( token ) {
		if( token.type === 'String' ) {
			totalCount++;
			if( token.value[ 0 ] === '"' ) {
				doubleQuotes++;
			}
		}
	} );

	sample.on( 'end', function() {
		var singleQuotes = totalCount - doubleQuotes;
		var style = {};
		style[ QuoteTypeRule.name ] = function() {
			if( doubleQuotes > 0 && singleQuotes === 0 ) {
				return 'double';
			} else if( singleQuotes > 0 && doubleQuotes === 0 ) {
				return 'single';
			} else {
				return 'auto';
			}
		}();
		callback( style );
	} );
};

var quoteMap = {
	'double': '"',
	'single': "'"
};
var typeMap = {
	'"': 'double',
	"'": 'single'
};
var regexpMap = {
	'double': {
		escaped: /"\\/g,
		unescaped: /("(\\\\)*)(?!\\)/g
	},
	'single': {
		escaped: /'\\/g,
		unescaped: /(\'(\\\\)*)(?!\\)/g
	}
};

QuoteTypeRule.transform = function( input, settings, output ) {
	var setting = settings[ this.name ];

	assert( ['single', 'double', 'auto'].indexOf( setting ) > -1 );

	input.on( 'data', function( token ) {
		if( token.type === 'String' )
			token.value = changeQuotes( token.value, setting );
		output.write( token );
	} );

	input.on( 'end', function() {
		output.end();
	} );

	function changeQuotes( string, settingType ) {
		var currentLiteral = string[ 0 ];
		var currentType = typeMap[ currentLiteral ];

		if( settingType === currentType ) {
			return string;
		}

		var value = string.substring( 1, string.length - 1 ).reverse();

		if( settingType === 'auto' ) {
			settingType = inferLiteral( value );
		}

		var settingLiteral = quoteMap[ settingType ];

		// Remove redundant escaping.
		value = value.replace( regexpMap[ currentType ].escaped, currentLiteral );
		// Add new escaping.
		value = value.replace( regexpMap[ settingType ].unescaped, settingLiteral + '\\' );
		return settingLiteral + value.reverse() + settingLiteral;
	}

	function inferLiteral( string ) {
		var m = string.match( /"/g );
		var doubles = m && m.length;
		m = string.match( /'/g );
		var singles = m && m.length;
		return ( singles && singles > doubles ) ? 'double' : 'single';
	}
};

module.exports = QuoteTypeRule;
