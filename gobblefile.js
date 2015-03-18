/*global require, module */
var gobble = require( 'gobble' );
var path = require( 'path' );
var resolve = require( 'resolve' );
var Promise = require( 'es6-promise' ).Promise;
var babel = require( 'babel-core' );

var babelOptions = {
	whitelist: [
		'es6.arrowFunctions',
		'es6.blockScoping',
		'es6.constants',
		'es6.destructuring',
		'es6.parameters.default',
		'es6.parameters.rest',
		'es6.properties.shorthand',
		'es6.templateLiterals'
	],
	sourceMap: false
};

module.exports = gobble( 'src' )
.transform( 'babel', babelOptions )
.transform( 'esperanto-bundle', {
	entry: 'rvc',
	type: 'amd',
	name: 'rvc',
	sourceMap: false,

	resolvePath: function ( importee, importer ) {
		return new Promise( function ( fulfil, reject ) {
			var callback = function ( err, result ) {
				if ( err ) {
					reject( err );
				} else {
					fulfil( result );
				}
			};

			resolve( importee, {
				basedir: path.dirname( importer ),
				packageFilter: function ( pkg ) {
					if ( pkg[ 'jsnext:main' ] ) {
						pkg.main = pkg[ 'jsnext:main' ];
						return pkg;
					}

					var err = new Error( 'package ' + pkg.name + ' does not supply a jsnext:main field' );
					err.code = 'ENOENT'; // hack
					reject( err );
					return {};
				}
			}, callback );
		});
	},

	transform: function ( code ) {
		return babel.transform( code, babelOptions ).code;
	}
});