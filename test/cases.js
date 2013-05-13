var assert = require( 'assert' );
var fs = require( 'fs' );
var glob = require( 'glob' );
var path = require( 'path' );
var should = require( 'should' );

var codepainter = require( '../codepainter' );


describe( 'Code Painter', function() {

	var globOptions = { sync: true };

	glob( 'test/cases/*', globOptions, function( er, testCases ) {

		testCases.forEach( function( testCase ) {

			testCase = testCase.substr( testCase.lastIndexOf( '/' ) + 1 );

			describe( testCase + ' rule', function() {

				glob( 'test/cases/' + testCase + '/*/*.json', globOptions, function( er2, stylePaths ) {
					stylePaths.forEach( function( stylePath ) {
						var setting = {
							folder: stylePath.substr( 0, stylePath.lastIndexOf( '/' ) + 1 ),
							styles: JSON.parse( fs.readFileSync( stylePath, 'utf-8' ) )
						};

						testInferrance( setting );
						testTransformation( setting );
					} );
				} );
			} );
		} );
	} );
} );

function testInferrance( setting ) {
	Object.keys( setting.styles ).forEach( function( styleKey ) {
		var styleValue = setting.styles[ styleKey ];
		var samplePath = verifyPath( setting.folder + 'sample.js' );
		if( fs.existsSync( samplePath ) ) {
			it( 'infers ' + styleKey + ' setting as ' + styleValue, function( done ) {
				infer( samplePath, function( inferredStyle ) {
					styleValue.should.equal( inferredStyle[ styleKey ] );
					done();
				} );
			} );
		}
	} );
}

function verifyPath( path ) {
	fs.existsSync( path ).should.be.true;
	return path;
}

function infer( samplePath, callback ) {
	var sampleStream = fs.createReadStream( samplePath );
	sampleStream.pause();
	sampleStream.setEncoding( 'utf-8' );
	codepainter.infer( sampleStream, function( style ) {
		callback( style );
	} );
}

function testTransformation( setting ) {
	var folders = setting.folder.split( '/' );
	setting.name = folders[ folders.length - 2 ];
	it( 'formats ' + setting.name + ' setting properly', function( done ) {
		var inputPath = verifyPath( setting.folder + 'input.js' );
		var expectedPath = verifyPath( setting.folder + 'expected.js' );
		var expected = fs.readFileSync( expectedPath, 'utf-8' );
		var tempPath = setting.folder + 'temp.js';

		transform( inputPath, setting.styles, tempPath, function() {
			var output = fs.readFileSync( tempPath, 'utf-8' );
			expected.should.equal( output );
			fs.unlinkSync( tempPath );
			done();
		} );
	} );
}

function transform( inputPath, style, outputPath, callback ) {
	var inputStream = fs.createReadStream( inputPath );
	inputStream.pause();
	inputStream.setEncoding( 'utf-8' );

	var outputStream = fs.createWriteStream( outputPath );
	codepainter.transform( inputStream, style, outputStream, function() {
		outputStream.on( 'close', callback );
		outputStream.end();
	} );
}
