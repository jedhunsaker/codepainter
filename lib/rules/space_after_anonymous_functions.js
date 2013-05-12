var assert = require('assert');


module.exports = {
	name : 'space_after_anonymous_functions',

	tokens : {
		space : { type : 'Whitespaces', value : ' ' }
	},

	infer : function( sample, callback ) {
		var previousTokens = new Array( 2 );
		var present = 0;
		var omitted = 0;

		sample.on( 'data', function( token ) {
			if( this.isFunctionKeyword( previousTokens[ 0 ] ) ) {
				if( this.isOpenParen( previousTokens[ 1 ] ) ) {
					omitted++;
				} else {
					assert( this.isWhitespaces( previousTokens[ 1 ] ) );
					if( this.isOpenParen( token ) ) {
						// Anonymous function.
						if( previousTokens[ 1 ].value === ' ' ) {
							present++;
						}
					} else {
						// Named function.
						assert( this.isIdentifier( token.type ) );
					}
				}
			}
			previousTokens.shift();
			previousTokens.push( token );
		}.bind( this ) );

		sample.on( 'end', function() {
			callback( { space_after_anonymous_functions : present > omitted } );
		} );
	},

	transform : function( input, settings, output ) {
		this.input = input;
		this.settings = settings;
		this.output = output;

		this.validate();

		this.previousTokens = new Array( 2 );
		input.on( 'data', this.onTransformData.bind( this ) );
		input.on( 'end', this.onTransformEnd.bind( this ) );
	},

	onTransformData : function( token ) {
		if( this.isFunctionKeyword( this.previousTokens[ 1 ] ) ) {
			if( this.isOpenParen( token ) ) {
				if( this.insertSpace )
					this.output.write( this.tokens.space );
				this.output.write( token );
			} else {
				assert( this.isWhitespaces( token ) );
				// Omit until we know if it's an anonymous function.
			}
		} else if( this.isFunctionKeyword( this.previousTokens[ 0 ] ) &&
			this.isWhitespaces( this.previousTokens[ 1 ] ) ) {

			if( this.isOpenParen( token ) ) {
				// Anonymous function.
				if( this.insertSpace )
					this.output.write( this.tokens.space );
			} else {
				// Named function.
				assert( this.isIdentifier( token ) );
				this.output.write( this.previousTokens[ 1 ] );
			}
			this.output.write( token );
		} else {
			this.output.write( token );
		}
		this.previousTokens.shift();
		this.previousTokens.push( token );
	},

	onTransformEnd : function() {
		this.output.end();
	},

	validate : function() {
		this.insertSpace = this.settings[ this.name ];
		assert( typeof this.insertSpace === 'boolean' );
	},

	isFunctionKeyword : function( token ) {
		return token && token.type === 'Keyword' && token.value === 'function';
	},

	isOpenParen : function( token ) {
		return token && token.type === 'Punctuator' && token.value === '(';
	},

	isWhitespaces : function( token ) {
		return token && token.type === 'Whitespaces';
	},

	isIdentifier : function( token ) {
		return token && token.type === 'Identifier';
	}
};
