

export default build;
import rcu from "rcu";
import toSource from "./tosource";
import minifycss from "./minifycss";
function build(name, source, callback) {
	var definition = rcu.parse(source);
	var dependencies = ["require", "ractive"];
	var dependencyArgs = ["require", "Ractive"];
	var importMap = [];

	// Add dependencies from <link> tags, i.e. sub-components
	definition.imports.forEach(function (toImport, i) {
		var href = toImport.href;
		var name = toImport.name;

		var argumentName = "_import_" + i;

		dependencies.push("rvc!" + href.replace(/\.html$/, ""));
		dependencyArgs.push(argumentName);

		importMap.push("\"" + name + "\": " + argumentName);
	});

	// Add dependencies from inline require() calls
	dependencies = dependencies.concat(definition.modules);

	var options = ["template: " + toSource(definition.template, null, "", "")];

	if (definition.css) {
		options.push("css: " + JSON.stringify(minifycss(definition.css)));
	}

	if (definition.imports.length) {
		options.push("components: {" + importMap.join(",") + "}");
	}

	var builtModule = "define(\"rvc!" + name + "\", " + JSON.stringify(dependencies) + ",function(" + dependencyArgs.join(",") + "){\n\tvar __options__ = {\n\t\t" + options.join(",\n\t\t") + "\n\t},\n\tcomponent = {};";

	if (definition.script) {
		builtModule += "\n" + definition.script + "\n\tif ( typeof component.exports === \"object\" ) {\n\t\tfor ( var __prop__ in component.exports ) {\n\t\t\tif ( component.exports.hasOwnProperty(__prop__) ) {\n\t\t\t\t__options__[__prop__] = component.exports[__prop__];\n\t\t\t}\n\t\t}\n\t}\n";
	}

	builtModule += "return Ractive.extend(__options__);\n});";

	callback(builtModule);
}