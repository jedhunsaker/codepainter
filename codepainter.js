var fs = require('fs'),
	Pipe = require('./lib/Pipe'),
	rules = require('./lib/rules'),
	Serializer = require('./lib/Serializer'),
	Tokenizer = require('./lib/Tokenizer');

module.exports.infer = function( sample, callback ) {
	var style = {},
	    tokenizer = new Tokenizer();

	sample.pipe( tokenizer );

	rules.forEach( function( rule ) {
		rule.infer( tokenizer, function( inferredStyle ) {
			Object.keys( inferredStyle ).forEach( function( key ) {
				style[ key ] = inferredStyle[ key ];
			} );
		} );
	} );

	tokenizer.on( 'end', function() {
		tokenizer.registerRules( style );
		callback( style );
	} );

	sample.resume();
};

module.exports.transform = function (input, style, output, callback) {
	var enabledRules = [],
		tokenizer = new Tokenizer(),
		serializer = new Serializer(),
		streams = [];

	style = convertStyle(style);

	rules.forEach(function (rule) {
		if (typeof style[rule.name] !== 'undefined' && style[rule.name] !== null)
			enabledRules.push(rule);
	});

	input.pipe(tokenizer);
	serializer.pipe( output, { end : false } );
	serializer.on( 'end', function() {
		output.end();
		callback();
	});

	if (enabledRules.length > 0) {

		tokenizer.registerRules( enabledRules );

		streams.push(tokenizer);

		for (var i = 0; i < enabledRules.length - 1; i++)
			streams.push(new Pipe());

		streams.push(serializer);

		var errorFunction = function (error) {};
		for (i = 0; i < enabledRules.length; i++) {
			var rule = enabledRules[i];
			rule.transform(streams[i], style, streams[i + 1], errorFunction);
		}
	} else {
		tokenizer.pipe(serializer);
	}
	input.resume();
};

/**
 * Converts the style string into an object.
 *
 * First tries to parse the style string as a JSON string. If that does not work,
 * tries interpret the style string as the name of a predefined style and load
 * the respective style file. If that does not work either, throws an error.
 *
 */
function convertStyle ( style ) {

	try {
		return typeof style === 'string' ? JSON.parse(style) : style;
	} catch (e) {
		try {
			return require ( __dirname + '/lib/styles/' + style + '.json' );
		} catch (e2) {

			msg = style + ' is not a valid style.\n\nValid predefined styles are:\n';

			var files = fs.readdirSync( __dirname + '/lib/styles/' );

			for ( var i in files ) {
				msg += '  ' + files[i].slice(0, -5) + '\n';
			}

			throw new Error(msg);
		}
	}
}
