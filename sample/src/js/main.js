// First we have to configure RequireJS
require.config({
	// This tells RequireJS where to find Ractive and rvc
	paths: {
		ractive: 'lib/ractive-legacy',
		rvc: 'loaders/rvc'
	},

	// These aren't used during development, but the optimiser will
	// read this config when we run the build script
	name: 'main',
	out: '../../dist/js/main.js',
	stubModules: [ 'rvc' ]
});

// Now we've configured RequireJS, we can load our dependencies and start
require([ 'rvc!components/clock' ], function ( Clock ) {

	'use strict';

	var clock = new Clock({
		el: 'main'
	});

});
