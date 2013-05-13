var assert = require('assert');

var eol = require( '../eol' );


module.exports = {

	name: 'insert_final_newline',

	infer : function( sample, callback ) {
		var previousToken = null;

		sample.on( 'data', function( token ) {
			previousToken = token;
		} );

		sample.on( 'end', function() {

			var value;

			if( ( previousToken && previousToken.type === 'Whitespaces' ) &&
				( previousToken.value.indexOf( '\n' ) !== -1 ) ) {

				value = true;
			} else {
				value = false;
			}

			callback( { insert_final_newline : value } );
		} );
	},

	transform : function( input, settings, output ) {

		this.input = input;
		this.settings = settings;
		this.enforceRule = this.settings[ this.name ];
		this.output = output;

		this.validate();

		if( !this.enforceRule ) {
			this.skipRule();
			return;
		}

		this.beforeData();

		input.on( 'data', this.onTransformData.bind( this ) );
		input.on( 'end', this.onTransformEnd.bind( this ) );
	},

	validate: function() {
		assert( typeof this.enforceRule === 'boolean' );
	},

	skipRule: function() {
		this.input.on( 'data', function( token ) { this.output.write( token ); }.bind( this ) );
		this.input.on( 'end', function() { this.output.end(); }.bind( this ) );
	},

	beforeData: function() {
		this.previousToken = null;
		this.EOL = eol.getEOLChar( this.settings.end_of_line );
		this.tokens = {
			EOL : { type : 'Whitespaces', value : this.EOL }
		};
	},

	onTransformData: function( token ) {

		if( this.previousToken ) {
			this.output.write( this.previousToken );
		}

		this.previousToken = token;
	},

	onTransformEnd: function() {
		var output = this.output;

		if( this.previousToken && this.previousToken.type !== 'Whitespaces' ) {
			output.write( this.previousToken );
		}

		if( this.enforceRule ) {
			output.write( this.tokens.EOL );
		}

		output.end();
	}

};
