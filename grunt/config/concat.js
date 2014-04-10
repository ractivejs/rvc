module.exports = function ( grunt ) {
	return {
		bundle: {
			src: 'tmp/rvc.js',
			dest: 'rvc.js'
		},
		options: {
			process: true,
			banner: grunt.file.read( 'wrapper/banner.js' ),
			footer: grunt.file.read( 'wrapper/footer.js' )
		}
	};
};
