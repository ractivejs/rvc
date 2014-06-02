module.exports = {
	compile: {
		options: {
			out: 'tmp/rvc.js',
			baseUrl: 'src/',
			name: 'rvc',
			optimize: 'none',
			paths: {
				'amd-loader': '../vendor/amd-loader',
				'tosource': '../vendor/tosource',
				'rcu': '../node_modules/rcu/rcu.amd'
			},
			logLevel: 2,
			onBuildWrite: function( name, path, contents ) {
				return require( 'amdclean' ).clean({
					code: contents,
					prefixTransform: function ( moduleName ) {
						return moduleName.substring( moduleName.lastIndexOf( '_' ) + 1 );
					}
				}) + '\n';
			}
		}
	}
};
