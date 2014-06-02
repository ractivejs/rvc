(function () {

	'use strict';

	var assert, requirejs, baseUrl, fixture;

	if ( typeof process !== 'undefined' ) {
		assert = require( 'assert' );
		requirejs = require( 'requirejs' );
		baseUrl = 'src';
		global.Ractive = require( 'ractive' );
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
			'rcu': '../node_modules/rcu/rcu.amd',
			'tosource': '../vendor/tosource',

			'samples': '../test/samples'
		}
	});

	describe( 'rvc', function () {
		load( 'simple', 'should render a simple template', function ( Component ) {
			var ractive = new Component();
			assert.equal( ractive.toHTML(), '<h1>Hello world!</h1>' );
		});

		load( 'error', 'should fail', null, function ( err ) {
			assert.ok( err instanceof Error );
		});
	});

	function load ( name, description, callback, errback ) {
		it( description, function ( done ) {
			requirejs([ 'rvc!samples/' + name ], function ( Component ) {
				callback( Component );
				done();
			}, function ( err ) {
				errback( err );
				done();
			});
		});
	}

}());
