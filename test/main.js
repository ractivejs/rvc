require.config({
	baseUrl: '../src',
	paths: {
		'ractive': '../test/vendor/ractive/ractive',
		'amd-loader': '../vendor/amd-loader',
		'rcu.amd': '../vendor/rcu.amd',
		'tosource': '../vendor/tosource',

		'samples': '../test/samples'
	}
});

var fixture = document.getElementById( 'qunit-fixture' );

load( 'simple', 'Simple component', function ( Component, t ) {
	var ractive = new Component({
		el: fixture
	});

	t.equal( fixture.innerHTML, '<h1>Hello world!</h1>' );
});

function load ( name, description, callback ) {
	asyncTest( description, function ( t ) {
		require([ 'rvc!samples/' + name ], function ( Component ) {
			callback( Component, t );
			QUnit.start();
		});
	});
}
