var assert = require('assert');


module.exports = {

	name : 'spaces_in_brackets',

	bracketTypes : ['(', '[', '{', ')', ']', '}'],

	openBracketTypes : ['(', '[', '{'],

	closeBracketTypes : [')', ']', '}'],

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

		if( this.isOpenBracket( prevTokens[ 1 ] ) && this.isWhitespaces( token ) ||
			this.isWhitespaces( prevTokens[ 1 ] ) && this.isCloseBracket( token ) ){
			this.trendTrue++;
			this.trendIdiomatic++;
		} else if ( this.isOpenBracket( prevTokens[ 1 ] ) && !this.isWhitespaces( token )){
			this.trendFalse++;
			if( this.isBracket( token ) ) {
				this.trendIdiomatic++;
			}
		} else if( !this.isWhitespaces( prevTokens[ 1 ] ) && this.isCloseBracket( token ) ) {
			this.trendFalse++;
			if( this.isBracket( prevTokens[ 1 ] ) ) {
				this.trendIdiomatic++;
			}
		}

		this.shiftTokens( token );
	},

	onInferEnd : function () {
		var setting;
		if( this.trendTrue >= this.trendFalse ){
			setting = ( this.trendIdiomatic > this.trendTrue ) ? 'idiomatic' : true;
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

		if( this.isWhitespaces( prevTokens[ 1 ] ) && this.hasNewline( prevTokens[ 1 ] ) ) {
			this.output.write( prevTokens[ 1 ] );
		}

		if( this.isOpenBracket( prevTokens[ 1 ] ) ){
			if( this.isWhitespaces( token ) ){
				this.shiftTokens( token );
				return;
			} else if( this.setting !== false && ! this.isBracket( token ) ){
				this.output.write( this.tokens.space );
			}
		} else if( this.isCloseBracket( token ) ){
			if( this.setting !== false && ! this.isBracket( prevTokens[ 1 ] ) ){
				if( ! this.isWhitespaces( prevTokens[ 1 ] ) ){
					this.output.write( this.tokens.space );
				}
			}
		} else if( this.isCloseBracket( prevTokens[ 1 ] ) && this.isWhitespaces( token ) ){
			this.shiftTokens( token );
			return;
		} else if( this.isCloseBracket( prevTokens[ 0 ] ) &&
					this.isWhitespaces( prevTokens[ 1 ] ) &&
					! this.isCloseBracket( token ) ){
			this.output.write( prevTokens[ 1 ] );
		} else if( this.setting !== true && this.isBracket( token ) &&
			this.isWhitespaces( prevTokens[ 1 ] ) && !this.hasNewline( prevTokens[ 1 ] ) &&
			this.isBracket( prevTokens[ 0 ] ) ) {
			prevTokens[ 1 ].value = '';
			this.output.write( prevTokens[ 1 ] );
		}

		this.output.write( token );
		this.shiftTokens( token );
	},

	onTransformEnd : function () {
		if( this.prevTokens ) {
			this.output.write( this.prevTokens[ 1 ] );
		}
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

	isPunctuator : function( token ) {
		return token && token.type === 'Punctuator';
	},

	isBracket : function( token ) {
		return this.isPunctuator( token ) && this.bracketTypes.indexOf( token.value ) !== -1;
	},

	isOpenBracket : function( token ) {
		return this.isPunctuator( token ) && this.openBracketTypes.indexOf( token.value ) !== -1;
	},

	isCloseBracket : function( token ) {
		return this.isPunctuator( token ) && this.closeBracketTypes.indexOf( token.value ) !== -1;
	},

	isWhitespaces : function( token ) {
		return token && token.type == 'Whitespaces';
	},

	hasNewline : function( token ) {
		return token && token.value.indexOf( '\n' ) !== -1;
	}
};
