var os = require( 'os' );
var assert = require( 'assert' );

var string = require( '../util/string' );


module.exports = {

	name: 'trim_trailing_whitespace',

	infer: function( sample, callback ) {

		var hasTrailingWhitespace = false;

		sample.on( 'data', function( token ) {
			if( token.type === 'Whitespaces' && /[ \t]\r?\n$/.test(token.value) ) {
				hasTrailingWhitespace = true;
			}
		} );

		sample.on( 'end', function() {
			callback( { trim_trailing_whitespace : !hasTrailingWhitespace } );
		} );
	},

	transform: function( input, setting, output ) {
		setting = setting[ this.name ];
		this.validate( setting );
		if( setting === false ) {
			this.bindEventsForFalseCase( input, output );
			return;
		}
		this.beforeData( setting );
		this.bindEventsForTrueCase( input, output );
	},

	validate: function( setting ) {
		assert( typeof setting === 'boolean' );
	},

	bindEventsForFalseCase: function( input, output ) {
		input.on( 'data', function( token ) { output.write( token ); } );
		input.on( 'end', this.onInputEnd.bind( this, output ) );
	},

	beforeData: function( value ) {
		this.EOL = this.getEOLChars( value.end_of_line );
	},

	bindEventsForTrueCase: function( input, output ) {
		input.on( 'data', this.onInputData.bind( this, output ) );
		input.on( 'end', this.onInputEnd.bind( this, output ) );
	},

	getEOLChars: function( eol ) {
		switch( eol ) {
			case 'crlf':
				return '\r\n';
			case 'lf':
				return '\n';
			default:
				return os.EOL;
		}
	},

	onInputData: function( output, token ) {
		if( token.type === 'Whitespaces' ) {
			var pos = token.value.lastIndexOf( '\n' );
			if( pos !== -1 ) {
				var lineCount = ( token.value.match( /\n/g ) || [] ).length;
				token.value = this.EOL.repeat( lineCount ) + token.value.substr( pos + 1 );
			}
		}
		output.write( token );
	},

	onInputEnd : function( output ) {
		output.end();
	}
};
