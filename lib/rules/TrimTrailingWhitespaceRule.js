const os = require( 'os' ),
      assert = require( 'assert' ),
      string = require( '../util/string' );


module.exports = {

    name: 'trim_trailing_whitespace',

    infer: function( sample, callback ) {
        callback( true );
    },

    transform: function( input, value, output ) {
        this.validate( value );
        this.beforeData( value );
        this.bindEvents( input, output );
    },

    validate: function( value ) {
        assert( value[ this.name ] === true );
    },

    beforeData: function( value ) {
        this.EOL = this.getEOLChars( value.end_of_line );
    },

    bindEvents: function( input, output ) {
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
