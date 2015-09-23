/*global require, module */
var gobble = require( 'gobble' );

module.exports = gobble( 'src' )
	.transform( 'rollup-babel', {
		entry: 'rvc.js',
		format: 'amd',
		moduleName: 'rvc',
		external: [ 'ractive' ]
	});
