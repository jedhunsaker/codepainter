const
	assert = require( 'assert' ),
	fs = require( 'fs' ),
	path = require( 'path' ),
	should = require( 'should' ),
	codepainter = require( '../codepainter' ),
	casesRoot = path.join( __dirname, 'cases' ),
	glob = require( 'glob' );


function infer( samplePath, callback ) {
	var sampleStream = fs.createReadStream( samplePath );
	sampleStream.pause();
	sampleStream.setEncoding( 'utf-8' );
	codepainter.infer( sampleStream, function( style ) {
		callback( style );
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

function verifyPath( path ) {
	fs.existsSync( path ).should.be.true;
	return path;
}

describe( 'Code Painter', function() {

	var globOptions = { sync: true };

	glob( 'test/cases/*', globOptions, function( er, testCases ) {

		testCases.forEach( function( testCase ) {

			testCase = testCase.substr( testCase.lastIndexOf( '/' ) + 1 );
			var rule = require( '../lib/rules/' + testCase );

			describe( testCase + ' rule', function() {

				glob( 'test/cases/' + testCase + '/*/*.json', globOptions, function( er, stylePaths ) {
					stylePaths.forEach( function( stylePath ) {
						var setting = {
							folder: stylePath.substr( 0, stylePath.lastIndexOf( '/' ) + 1 ),
							styles: JSON.parse( fs.readFileSync( stylePath, 'utf-8' ) )
						};

						Object.keys( setting.styles ).forEach( function( styleKey ) {
							var styleValue = setting.styles[ styleKey ];
							var samplePath = verifyPath( setting.folder + 'sample.js' );
							if( fs.existsSync( samplePath ) ) {
								it( 'infers ' + styleKey + ' setting as ' + styleValue, function( done ) {
									infer( samplePath, function( inferredStyle ) {
										setting.styles[ styleKey ].should.equal( inferredStyle[ styleKey ] );
										done();
									} );
								} );
							}
						} );

						var folders = setting.folder.split( '/' );
						setting.name = folders[ folders.length - 2 ];
						it( 'formats ' + setting.name + ' setting properly', function( done ) {
							var inputPath = verifyPath( setting.folder + 'input.js' );
							var outputPath = verifyPath( setting.folder + 'output.js' );
							var expected = fs.readFileSync( outputPath, 'utf-8' );
							var tempPath = setting.folder + 'temp.js';
							transform( inputPath, setting.styles, tempPath, function() {
								var output = fs.readFileSync( tempPath, 'utf-8' );
								output.should.equal( expected );
								fs.unlinkSync( tempPath );
								done();
							} );
						} );
					} );

				} );

			} );
		} );
	} );
} );
