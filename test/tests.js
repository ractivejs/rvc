(function () {

	'use strict';

	var assert, requirejs, baseUrl, fixture;

	if ( typeof process !== 'undefined' ) {
		assert = require( 'assert' );
		requirejs = require( 'requirejs' );
		baseUrl = 'dist';
		global.Ractive = require( 'ractive' );
	} else {
		assert = chai.assert;
		requirejs = window.requirejs;
		baseUrl = '../dist';
		fixture = document.getElementById( 'fixture' );
	}

	requirejs.config({
		baseUrl: baseUrl,
		paths: {
			'ractive': '../node_modules/ractive/ractive-legacy',
			'samples': '../test/samples'
		}
	});

	describe( 'rvc', function () {
		load( 'simple', 'should render a simple template', function ( Component ) {
			var ractive = new Component();
			assert.equal( ractive.toHTML(), '<h1>Hello world!</h1>' );
		});

		// browser-only tests (TODO rig up JSDOM so we can do this in node)
		if ( fixture ) {
			load( 'styled', 'should load a component with CSS', function ( Component ) {
				var ractive = new Component({ el: fixture });
				var p = ractive.find( 'p' );

				var dummy = document.createElement( 'p' );
				document.body.appendChild( dummy );

				var red = document.createElement( 'p' );
				red.style.color = 'red';
				document.body.appendChild( red );
				var RED = getComputedStyle( red ).color;

				assert.equal( ractive.toHTML(), '<p>red</p>' );
				assert.equal( getComputedStyle( p ).color, RED );
				assert.notEqual( getComputedStyle( dummy ).color, RED );
			});
		}

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
