var assert = require('assert');


module.exports = {

	name : 'spaces_in_brackets',

	tokens : {
		space : { type : 'Whitespaces', value : ' ' }
	},

	infer : function (sample, callback) {
		this.prevTokens = new Array( 2 );
		this.trendTrue = 0;
		this.trendFalse = 0;
		this.trendIdiomatic = 0;
		this.callback = callback;

		sample.on( 'data', this.onInferData.bind( this ) );
		sample.on( 'end', this.onInferEnd.bind( this ) );
	},

	onInferData : function (token) {

		var prevTokens = this.prevTokens;

		if( this.isOpeningParen( prevTokens[ 1 ] ) && this.isWhitespaces( token ) ||
			this.isWhitespaces( prevTokens[ 1 ] ) && this.isClosingParen( token ) ){
			this.trendTrue++;
		} else if ( ! this.isOpeningParen( prevTokens[ 1 ] ) && this.isClosingParen( token ) ||
			this.isOpeningParen( prevTokens[ 1 ] ) && !this.isClosingParen( token ) ){
			this.trendFalse++;
		}

		var checks = [ this.isOpeningBraceAfterParen.bind( this ), this.isClosingParenAfterBrace.bind( this ) ];
		for( var i = 0; i < checks.length; i++ ){
			if( checks[ i ]( token, prevTokens ) && ! this.isWhitespaces( prevTokens[ 1 ] ) ){
				this.trendIdiomatic++;
			}
		}

		this.shiftTokens( token );
	},

	onInferEnd : function () {
		var setting;
		if( this.trendTrue >= this.trendFalse ){
			setting = ( this.trendIdiomatic > 1 ) ? 'idiomatic' : true;
		} else {
			setting = false;
		}
		this.callback( { spaces_in_brackets : 'idiomatic' } );
	},

	transform : function (input, settings, output) {

		this.input = input;
		this.settings = settings;
		this.output = output;

		this.validate();
		this.prevTokens = new Array( 2 );

		input.on( 'data', this.onTransformData.bind( this ) );
		input.on( 'end', this.onTransformEnd.bind( this ) );
	},

	onTransformData : function (token) {

		var prevTokens = this.prevTokens;

		if( this.isOpeningParen( prevTokens[ 1 ] ) ){
			if( this.isWhitespaces( token ) ){
				this.shiftTokens( token );
				return;
			} else if( this.setting === 'idiomatic' && ! this.isClosingParen( token ) ){
				this.output.write( this.tokens.space );
			}
		} else if( this.isClosingParen( token ) ){
			if( this.setting === 'idiomatic' && ! this.isOpeningParen( prevTokens[ 1 ] ) ){
				if( ! this.isWhitespaces( prevTokens[ 1 ] ) ){
					this.output.write( this.tokens.space );
				}
			}
		} else if( this.isClosingBrace( prevTokens[ 1 ] ) && this.isWhitespaces( token ) ){
			this.shiftTokens( token );
			return;
		} else if( this.isClosingBrace( prevTokens[ 0 ] ) &&
					this.isWhitespaces( prevTokens[ 1 ] ) &&
					! this.isClosingParen( token ) ){
			this.output.write( prevTokens[ 1 ] );
		} else if( ( this.isOpeningBraceAfterParen( token, prevTokens ) ||
						this.isClosingParenAfterBrace( token, prevTokens ) ) &&
						this.setting === 'idiomatic' ){
			prevTokens[ 1 ].value = '';
			this.output.write( prevTokens[ 1 ] );
		}

		this.output.write( token );
		this.shiftTokens( token );
	},

	onTransformEnd : function () {
		this.output.end();
	},

	validate : function() {
		this.setting = this.settings[ this.name ];
		assert( typeof this.setting === 'boolean' || this.setting === 'idiomatic');
	},

	shiftTokens : function( token ) {
		this.prevTokens.shift();
		this.prevTokens.push( token );
	},

	isPunctuatorValue : function( token, value ) {
		return token && token.type === 'Punctuator' && token.value === value;
	},

	isOpeningParen : function( token ) {
		return this.isPunctuatorValue( token, '(' );
	},

	isClosingParen : function( token ) {
		return this.isPunctuatorValue( token, ')' );
	},

	isOpeningBrace : function( token ) {
		return this.isPunctuatorValue( token, '{' );
	},

	isClosingBrace : function( token ) {
		return this.isPunctuatorValue( token, '}' );
	},

	isWhitespaces : function( token ) {
		return token && token.type == 'Whitespaces';
	},

	isOpeningBraceAfterParen : function( token, prevTokens ) {
		return this.isOpeningBrace( token ) && (
		   this.isOpeningParen( prevTokens[ 1 ] ) ||
		   this.isOpeningParen( prevTokens[ 0 ] ) && this.isWhitespaces( prevTokens[ 1 ] ) );
	},

	isClosingParenAfterBrace : function( token, prevTokens ) {
		return this.isClosingParen( token ) && (
		   this.isClosingBrace( prevTokens[ 1 ] ) ||
		   this.isClosingBrace( prevTokens[ 0 ] ) && this.isWhitespaces( prevTokens[ 1 ] ) );
	}
};
