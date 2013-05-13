module.exports = {

	name: 'spaces_around_operators',

	operators: [
		'!', '~',
		'*', '/', '%',
		'+', '-',
		'<<', '>>', '>>>',
		'<', '<=', '>', '>=',
		'==', '!=', '===', '!==',
		'&', '^', '|', '&&', '||', '?', ':',
		'=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=', '&=', '^=', '|='
	],

	hybridGroupOperators: ['*', '/', '%'],

	tokens: {
		space: { type : 'Whitespaces', value : ' ' }
	},

	infer: function( sample, callback ) {
		var previousToken = null;
		var present = 0;
		var omitted = 0;
		var hybrid = 0;

		sample.on( 'data', function( token ) {
			if( this.isOperator( token ) ) {
				if( this.isWhitespaces( previousToken ) ) {
					if( previousToken.value === ' ' ) {
						if( !this.isHybridGroupOperator( token ) ) {
							hybrid++;
						}
						present++;
					}
				} else {
					if( this.isHybridGroupOperator( token ) ) {
						hybrid++;
					}
					omitted++;
				}
			}
			previousToken = token;
		}.bind( this ) );

		sample.on( 'end', function() {
			callback( {
				spaces_around_operators : ( hybrid > present && hybrid > omitted ) ? 'hybrid' : present > omitted
			} );
		} );
	},

	transform: function( input, settings, output ) {

		this.setting = settings[ this.name ];

		var previousToken = null;

		input.on( 'data', function( token ) {
			if( previousToken ) {

				if( this.isOperator( previousToken ) ) {
					output.write( previousToken );
					if( this.isOnlySpaces( token ) ) {
						if( !this.shouldBeSurroundedBySpaces( previousToken ) ) {
							token.value = '';
						}
					} else if( this.shouldBeSurroundedBySpaces( previousToken ) ) {
						output.write( this.tokens.space );
					}
				} else if( this.isOperator( token ) ) {
					if( this.isOnlySpaces( previousToken ) ) {
						if( this.shouldBeSurroundedBySpaces( token ) ) {
							output.write( previousToken );
						} else {
							previousToken.value = '';
						}
					} else if( this.shouldBeSurroundedBySpaces( token ) ) {
						output.write( previousToken );
						output.write( this.tokens.space );
					} else {
						output.write( previousToken );
					}
				} else {
					output.write( previousToken );
				}
			}

			previousToken = token;
		}.bind( this ) );

		input.on( 'end', function() {
			if( previousToken ) {
				output.write( previousToken );
			}
			output.end();
		}.bind( this ) );
	},

	isOperator: function( token ) {
		return this.isPunctuator( token ) && this.operators.indexOf(token.value) !== -1;
	},

	isPunctuator: function( token ) {
		return token && token.type === 'Punctuator';
	},

	isHybridGroupOperator: function( token ) {
		return this.isPunctuator( token ) && this.hybridGroupOperators.indexOf( token.value ) !== -1;
	},

	isUnary: function( token ) {
		return token && token.grammarToken.type === 'UnaryExpression';
	},

	isOnlySpaces: function( token ) {
		return this.isWhitespaces( token ) && /^ +$/.test( token.value );
	},

	isWhitespaces: function( token ) {
		return token && token.type === 'Whitespaces';
	},

	shouldBeSurroundedBySpaces: function( token ) {
		return !(this.setting === false || (this.setting === 'hybrid' &&
			(this.isHybridGroupOperator( token ) || this.isUnary( token ))));
	}
};
