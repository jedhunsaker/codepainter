var assert = require( 'assert' );


module.exports = {
	name : 'space_after_control_statements',

	controlKeywords : ['if', 'for', 'switch', 'while', 'with'],

	tokens : {
		space : { type : 'Whitespaces', value : ' ' }
	},

	infer : function( sample, callback ) {
		var previousToken = null;
		var present = 0;
		var omitted = 0;

		sample.on( 'data', function( token ) {
			if( this.isControlKeyword( previousToken ) ) {
				if( this.isWhitespaces( token ) ) {
					if( token.value === ' ' ) {
						present++;
					}
				} else {
					assert( this.isOpenParen( token ) );
					omitted++;
				}
			}
			previousToken = token;
		}.bind( this ) );

		sample.on( 'end', function() {
			callback( { space_after_control_statements : present > omitted } );
		} );
	},

	transform : function( input, settings, output ) {
		this.input = input;
		this.settings = settings;
		this.output = output;

		this.validate();

		this.previousToken = null;

		input.on( 'data', this.onTransformData.bind( this ) );
		input.on( 'end', this.onTransformEnd.bind( this ) );
	},

	onTransformData : function( token ) {
		token.write = true;
		if( this.isControlKeyword( this.previousToken ) ) {
			if( this.isWhitespaces( token ) ) {
				if( this.insertSpace )
					this.output.write( this.tokens.space );
			} else {
				assert( this.isOpenParen( token ) );
				if( this.insertSpace )
					this.output.write( this.tokens.space );
				this.output.write( token );
			}
		} else {
			this.output.write( token );
		}
		this.previousToken = token;
	},

	validate : function() {
		this.insertSpace = this.settings[ this.name ];
		assert( typeof this.insertSpace === 'boolean' );
	},

	onTransformEnd : function() {
		this.output.end();
	},

	isControlKeyword : function( token ) {
		return token && token.type === 'Keyword' && this.controlKeywords.indexOf( token.value ) !== -1;
	},

	isOpenParen : function( token ) {
		return token && token.type === 'Punctuator' && token.value === '(';
	},

	isWhitespaces : function( token ) {
		return token && token.type === 'Whitespaces';
	}
};
