import rcu from 'rcu';
import toSource from './utils/tosource';
import minifycss from './utils/minifycss';

export default function build ( name, source, callback ) {
	let definition = rcu.parse( source );
	let dependencies = [ 'require', 'ractive' ];
	let dependencyArgs = [ 'require', 'Ractive' ];
	let importMap = [];

	// Add dependencies from <link> tags, i.e. sub-components
	definition.imports.forEach( ( toImport, i ) => {
		let href = toImport.href;
		let name = toImport.name;

		let argumentName = `_import_${i}`;

		dependencies.push( 'rvc!' + href.replace( /\.html$/, '' ) );
		dependencyArgs.push( argumentName );

		importMap.push( `"${name}": ${argumentName}` );
	});

	// Add dependencies from inline require() calls
	dependencies = dependencies.concat( definition.modules );

	let options = [
		`template: ${toSource( definition.template, null, '', '' )}`
	];

	if ( definition.css ) {
		options.push( `css: ${JSON.stringify( minifycss( definition.css ) )}` );
	}

	if ( definition.imports.length ) {
		options.push( `components: {${importMap.join( ',' )}}` );
	}

	let builtModule = `define("rvc!${name}", ${JSON.stringify( dependencies )},function(${dependencyArgs.join( ',' )}){
	var __options__ = {
		${options.join(',\n\t\t')}
	},
	component = {};`;

	if ( definition.script ) {
		builtModule += `
${definition.script}
	if ( typeof component.exports === "object" ) {
		for ( var __prop__ in component.exports ) {
			if ( component.exports.hasOwnProperty(__prop__) ) {
				__options__[__prop__] = component.exports[__prop__];
			}
		}
	}
`;
	}

	builtModule += `return Ractive.extend(__options__);
});`;

	callback( builtModule );
}
