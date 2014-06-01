/*

	rcu (Ractive component utils) - 0.1.3 - 2014-06-01
	==============================================================

	Copyright 2014 Rich Harris and contributors
	Released under the MIT license.

*/

define( function() {

	'use strict';

	var Ractive;

	var getName = function getName( path ) {
		var pathParts, filename, lastIndex;
		pathParts = path.split( '/' );
		filename = pathParts.pop();
		lastIndex = filename.lastIndexOf( '.' );
		if ( lastIndex !== -1 ) {
			filename = filename.substr( 0, lastIndex );
		}
		return filename;
	};

	var parse = function( getName ) {

		var requirePattern = /require\s*\(\s*(?:"([^"]+)"|'([^']+)')\s*\)/g;
		return function parse( source ) {
			var template, links, imports, scripts, script, styles, match, modules, i, item;
			template = Ractive.parse( source, {
				noStringify: true,
				interpolateScripts: false,
				interpolateStyles: false
			} );
			links = [];
			scripts = [];
			styles = [];
			modules = [];
			// Extract certain top-level nodes from the template. We work backwards
			// so that we can easily splice them out as we go
			i = template.length;
			while ( i-- ) {
				item = template[ i ];
				if ( item && item.t === 7 ) {
					if ( item.e === 'link' && ( item.a && item.a.rel[ 0 ] === 'ractive' ) ) {
						links.push( template.splice( i, 1 )[ 0 ] );
					}
					if ( item.e === 'script' && ( !item.a || !item.a.type || item.a.type[ 0 ] === 'text/javascript' ) ) {
						scripts.push( template.splice( i, 1 )[ 0 ] );
					}
					if ( item.e === 'style' && ( !item.a || !item.a.type || item.a.type[ 0 ] === 'text/css' ) ) {
						styles.push( template.splice( i, 1 )[ 0 ] );
					}
				}
			}
			// Extract names from links
			imports = links.map( function( link ) {
				var href, name;
				href = link.a.href && link.a.href[ 0 ];
				name = link.a.name && link.a.name[ 0 ] || getName( href );
				if ( typeof name !== 'string' ) {
					throw new Error( 'Error parsing link tag' );
				}
				return {
					name: name,
					href: href
				};
			} );
			script = scripts.map( extractFragment ).join( ';' );
			while ( match = requirePattern.exec( script ) ) {
				modules.push( match[ 1 ] || match[ 2 ] );
			}
			// TODO glue together text nodes, where applicable
			return {
				template: template,
				imports: imports,
				script: script,
				css: styles.map( extractFragment ).join( ' ' ),
				modules: modules
			};
		};

		function extractFragment( item ) {
			return item.f;
		}
	}( getName );

	/*

	eval2.js - 0.1.3 - 2014-06-01
	==============================================================

	Copyright 2014 Rich Harris
	Released under the MIT license.

*/
	var eval2 = function() {

		var _eval, isBrowser, isNode, _nodeRequire, head, Module, useFs, fs, path;
		// This causes code to be eval'd in the global scope
		_eval = eval;
		if ( typeof document !== 'undefined' ) {
			isBrowser = true;
			head = document.getElementsByTagName( 'head' )[ 0 ];
		} else if ( typeof process !== 'undefined' ) {
			isNode = true;
			_nodeRequire = require;
			fs = _nodeRequire( 'fs' );
			path = _nodeRequire( 'path' );
			if ( typeof module !== 'undefined' && typeof module.constructor === 'function' ) {
				Module = module.constructor;
			} else {
				useFs = true;
			}
		}

		function eval2( script, options ) {
			options = typeof options === 'function' ? {
				callback: options
			} : options || {};
			if ( options.sourceURL ) {
				script += '\n//# sourceURL=' + options.sourceURL;
			}
			try {
				return _eval( script );
			} catch ( err ) {
				if ( isNode ) {
					locateErrorUsingModule( script, options.sourceURL || '' );
					return;
				} else if ( isBrowser && err.name === 'SyntaxError' ) {
					locateErrorUsingDataUri( script );
				}
				throw err;
			}
		}
		eval2.Function = function() {
			var i, args = [],
				body, wrapped;
			i = arguments.length;
			while ( i-- ) {
				args[ i ] = arguments[ i ];
			}
			body = args.pop();
			wrapped = '(function (' + args.join( ', ' ) + ') {\n' + body + '\n})';
			return eval2( wrapped );
		};

		function locateErrorUsingDataUri( code ) {
			var dataURI, scriptElement;
			dataURI = 'data:text/javascript;charset=utf-8,' + encodeURIComponent( code );
			scriptElement = document.createElement( 'script' );
			scriptElement.src = dataURI;
			scriptElement.onload = function() {
				head.removeChild( scriptElement );
			};
			head.appendChild( scriptElement );
		}

		function locateErrorUsingModule( code, url ) {
			var m, x, wrapped, name, filepath;
			if ( useFs ) {
				wrapped = 'module.exports = function () {\n' + code + '\n};';
				name = '__eval2_' + Math.floor( Math.random() * 100000 ) + '__';
				filepath = path.join( __dirname, name + '.js' );
				fs.writeFileSync( filepath, wrapped );
				try {
					x = _nodeRequire( './' + name );
				} catch ( err ) {
					console.error( err );
					fs.unlinkSync( filepath, wrapped );
					return;
				}
				fs.unlinkSync( filepath, wrapped );
				x();
			} else {
				m = new Module();
				try {
					m._compile( 'module.exports = function () {\n' + code + '\n};', url );
				} catch ( err ) {
					console.error( err );
					return;
				}
				x = m.x;
			}
			x();
		}
		return eval2;
	}();

	var make = function( parse, eval2 ) {

		return function make( source, config, callback, errback ) {
			var definition, url, createComponent, loadImport, imports, loadModule, modules, remainingDependencies, onloaded, onerror, ready;
			config = config || {};
			// Implementation-specific config
			url = config.url || '';
			loadImport = config.loadImport;
			loadModule = config.loadModule;
			onerror = config.onerror;
			definition = parse( source );
			createComponent = function() {
				var options, Component, script, factory, component, exports, prop;
				options = {
					template: definition.template,
					css: definition.css,
					components: imports
				};
				if ( definition.script ) {
					try {
						script = definition.script + '\n//# sourceURL=' + url.substr( url.lastIndexOf( '/' ) + 1 ) + '.js';
						factory = new eval2.Function( 'component', 'require', 'Ractive', definition.script );
						component = {};
						factory( component, config.require, Ractive );
						exports = component.exports;
						if ( typeof exports === 'object' ) {
							for ( prop in exports ) {
								if ( exports.hasOwnProperty( prop ) ) {
									options[ prop ] = exports[ prop ];
								}
							}
						}
						Component = Ractive.extend( options );
					} catch ( err ) {
						errback( err );
						return;
					}
					callback( Component );
				} else {
					Component = Ractive.extend( options );
					callback( Component );
				}
			};
			// If the definition includes sub-components e.g.
			//     <link rel='ractive' href='foo.html'>
			//
			// ...then we need to load them first, using the loadImport method
			// specified by the implementation.
			//
			// In some environments (e.g. AMD) the same goes for modules, which
			// most be loaded before the script can execute
			remainingDependencies = definition.imports.length + ( loadModule ? definition.modules.length : 0 );
			if ( remainingDependencies ) {
				onloaded = function() {
					if ( !--remainingDependencies ) {
						if ( ready ) {
							createComponent();
						} else {
							setTimeout( createComponent, 0 );
						}
					}
				};
				if ( definition.imports.length ) {
					if ( !loadImport ) {
						throw new Error( 'Component definition includes imports (e.g. `<link rel="ractive" href="' + definition.imports[ 0 ].href + '">`) but no loadImport method was passed to rcu.make()' );
					}
					imports = {};
					definition.imports.forEach( function( toImport ) {
						loadImport( toImport.name, toImport.href, url, function( Component ) {
							imports[ toImport.name ] = Component;
							onloaded();
						} );
					} );
				}
				if ( loadModule && definition.modules.length ) {
					modules = {};
					definition.modules.forEach( function( name ) {
						loadModule( name, name, url, function( Component ) {
							modules[ name ] = Component;
							onloaded();
						} );
					} );
				}
			} else {
				setTimeout( createComponent, 0 );
			}
			ready = true;
		};
	}( parse, eval2 );

	var resolve = function resolvePath( relativePath, base ) {
		var pathParts, relativePathParts, part;
		if ( relativePath.charAt( 0 ) !== '.' ) {
			// not a relative path!
			return relativePath;
		}
		// 'foo/bar/baz.html' -> ['foo', 'bar', 'baz.html']
		pathParts = ( base || '' ).split( '/' );
		relativePathParts = relativePath.split( '/' );
		// ['foo', 'bar', 'baz.html'] -> ['foo', 'bar']
		pathParts.pop();
		while ( part = relativePathParts.shift() ) {
			if ( part === '..' ) {
				pathParts.pop();
			} else if ( part !== '.' ) {
				pathParts.push( part );
			}
		}
		return pathParts.join( '/' );
	};

	var rcu = function( parse, make, resolve, getName ) {

		return {
			init: function( copy ) {
				Ractive = copy;
			},
			parse: parse,
			make: make,
			resolve: resolve,
			getName: getName
		};
	}( parse, make, resolve, getName );


	return rcu;

} );
