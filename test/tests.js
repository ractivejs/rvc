(function () {

	'use strict';

	var assert, requirejs, baseUrl, fixture;

	if ( typeof process !== 'undefined' ) {
		assert = require( 'assert' );
		requirejs = require( 'requirejs' );
		baseUrl = 'src';
	} else {
		assert = chai.assert;
		requirejs = window.requirejs;
		baseUrl = '../src';
		fixture = document.getElementById( 'qunit-fixture' );
	}

	requirejs.config({
		baseUrl: baseUrl,
		paths: {
			'ractive': '../test/vendor/ractive/ractive',
			'amd-loader': '../vendor/amd-loader',
			'rcu.amd': '../vendor/rcu.amd',
			'tosource': '../vendor/tosource',

			'samples': '../test/samples'
		}
	});

	describe( 'rvc', function () {
		load( 'simple', 'should render a simple template', function ( Component ) {
			var ractive = new Component();
			console.log( ractive.toHTML() );
			assert.equal( ractive.toHTML(), '<h1>Hello world!</h1>' );
		});
	});

	function load ( name, description, callback ) {
		it( description, function ( done ) {
			requirejs([ 'rvc!samples/' + name ], function ( Component ) {
				callback( Component );
				done();
			});
		});
	}

}());
