define(['ractive'], function (Ractive) {

  'use strict';

  /*
    amd-loader
    Adapted from https://github.com/guybedford/amd-loader by Guy Bedford
    MIT License: https://github.com/guybedford/amd-loader/blob/master/LICENSE
  */

  var loader = function (pluginId, ext, allowExts, compile) {
    if (arguments.length == 3) {
      compile = allowExts;
      allowExts = undefined;
    } else if (arguments.length == 2) {
      compile = ext;
      ext = allowExts = undefined;
    }

    return {
      buildCache: {},
      load: function (name, req, load, config) {
        var path = req.toUrl(name);
        var queryString = "";
        if (path.indexOf("?") != -1) {
          queryString = path.substr(path.indexOf("?"));
          path = path.substr(0, path.length - queryString.length);
        }

        // precompiled -> load from .ext.js extension
        if (config.precompiled instanceof Array) {
          for (var i = 0; i < config.precompiled.length; i++) if (path.substr(0, config.precompiled[i].length) == config.precompiled[i]) return require([path + "." + pluginId + ".js" + queryString], load, load.error);
        } else if (config.precompiled === true) return require([path + "." + pluginId + ".js" + queryString], load, load.error);

        // only add extension if a moduleID not a path
        if (ext && name.substr(0, 1) != "/" && !name.match(/:\/\//)) {
          var validExt = false;
          if (allowExts) {
            for (var i = 0; i < allowExts.length; i++) {
              if (name.substr(name.length - allowExts[i].length - 1) == "." + allowExts[i]) validExt = true;
            }
          }
          if (!validExt) path += "." + ext + queryString;else path += queryString;
        } else {
          path += queryString;
        }

        var self = this;

        loader.fetch(path, function (source) {
          compile(name, source, req, function (compiled) {
            if (typeof compiled == "string") {
              if (config.isBuild) self.buildCache[name] = compiled;
              load.fromText(compiled);
            } else load(compiled);
          }, load.error, config);
        }, load.error);
      },
      write: function (pluginName, moduleName, write) {
        var compiled = this.buildCache[moduleName];
        if (compiled) write.asModule(pluginName + "!" + moduleName, compiled);
      },
      writeFile: function (pluginName, name, req, write) {
        write.asModule(pluginName + "!" + name, req.toUrl(name + "." + pluginId + ".js"), this.buildCache[name]);
      }
    };
  };

  //loader.load = function(name, req, load, config) {
  //  load(loader);
  //}

  if (typeof window != "undefined") {
    var progIds = ["Msxml2.XMLHTTP", "Microsoft.XMLHTTP", "Msxml2.XMLHTTP.4.0"];
    var getXhr = function (path) {
      // check if same domain
      var sameDomain = true,
          domainCheck = /^(\w+:)?\/\/([^\/]+)/.exec(path);
      if (typeof window != "undefined" && domainCheck) {
        sameDomain = domainCheck[2] === window.location.host;
        if (domainCheck[1]) sameDomain &= domainCheck[1] === window.location.protocol;
      }

      // create xhr
      var xhr;
      if (typeof XMLHttpRequest !== "undefined") xhr = new XMLHttpRequest();else {
        var progId;
        for (var i = 0; i < 3; i += 1) {
          progId = progIds[i];
          try {
            xhr = new ActiveXObject(progId);
          } catch (e) {}

          if (xhr) {
            progIds = [progId]; // so faster next time
            break;
          }
        }
      }

      // use cors if necessary
      if (!sameDomain) {
        if (typeof XDomainRequest != "undefined") xhr = new XDomainRequest();else if (!("withCredentials" in xhr)) throw new Error("getXhr(): Cross Origin XHR not supported.");
      }

      if (!xhr) throw new Error("getXhr(): XMLHttpRequest not available");

      return xhr;
    };

    loader.fetch = function (url, callback, errback) {
      // get the xhr with CORS enabled if cross domain
      var xhr = getXhr(url);

      xhr.open("GET", url, !requirejs.inlineRequire);
      xhr.onreadystatechange = function (evt) {
        var status, err;
        //Do not explicitly handle errors, those should be
        //visible via console output in the browser.
        if (xhr.readyState === 4) {
          status = xhr.status;
          if (status > 399 && status < 600) {
            err = new Error(url + " HTTP status: " + status);
            err.xhr = xhr;
            if (errback) errback(err);
          } else {
            if (xhr.responseText == "") return errback(new Error(url + " empty response"));
            callback(xhr.responseText);
          }
        }
      };
      xhr.send(null);
    };
  } else if (typeof process !== "undefined" && process.versions && !!process.versions.node) {
    var fs = requirejs.nodeRequire("fs");
    loader.fetch = function (path, callback) {
      callback(fs.readFileSync(path, "utf8"));
    };
  } else if (typeof Packages !== "undefined") {
    loader.fetch = function (path, callback, errback) {
      var stringBuffer,
          line,
          encoding = "utf-8",
          file = new java.io.File(path),
          lineSeparator = java.lang.System.getProperty("line.separator"),
          input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
          content = "";
      try {
        stringBuffer = new java.lang.StringBuffer();
        line = input.readLine();

        // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
        // http://www.unicode.org/faq/utf_bom.html

        // Note that when we use utf-8, the BOM should appear as 'EF BB BF', but it doesn't due to this bug in the JDK:
        // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
        if (line && line.length() && line.charAt(0) === 65279) {
          // Eat the BOM, since we've already found the encoding on this file,
          // and we plan to concatenating this buffer with others; the BOM should
          // only appear at the top of a file.
          line = line.substring(1);
        }

        stringBuffer.append(line);

        while ((line = input.readLine()) !== null) {
          stringBuffer.append(lineSeparator);
          stringBuffer.append(line);
        }
        //Make sure we return a JavaScript string and not a Java string.
        content = String(stringBuffer.toString()); //String
      } catch (err) {
        if (errback) errback(err);
      } finally {
        input.close();
      }
      callback(content);
    };
  } else {
    loader.fetch = function () {
      throw new Error("Environment unsupported.");
    };
  }

  var amdLoader = loader;

  function getName(path) {
  	var pathParts, filename, lastIndex;

  	pathParts = path.split("/");
  	filename = pathParts.pop();

  	lastIndex = filename.lastIndexOf(".");
  	if (lastIndex !== -1) {
  		filename = filename.substr(0, lastIndex);
  	}

  	return filename;
  }

  /**
   * Finds the line and column position of character `char`
     in a (presumably) multi-line string
   * @param {array} lines - an array of strings, each representing
     a line of the original string
   * @param {number} char - the character index to convert
   * @returns {object}
       * @property {number} line - the zero-based line index
       * @property {number} column - the zero-based column index
       * @property {number} char - the character index that was passed in
   */


  function getLinePosition(lines, char) {
  	var lineEnds,
  	    line = 0,
  	    lineStart = 0,
  	    column;

  	lineEnds = lines.map(function (line) {
  		var lineEnd = lineStart + line.length + 1; // +1 for the newline

  		lineStart = lineEnd;
  		return lineEnd;
  	});

  	while (char >= lineEnds[line]) {
  		lineStart = lineEnds[line];
  		line += 1;
  	}

  	column = char - lineStart;
  	return { line: line, column: column, char: char };
  }

  var requirePattern = /require\s*\(\s*(?:"([^"]+)"|'([^']+)')\s*\)/g;
  var TEMPLATE_VERSION = 3;
  function parse(source) {
  	var parsed, template, links, imports, scriptItem, script, styles, match, modules, i, item, result;

  	if (!rcu.Ractive) {
  		throw new Error("rcu has not been initialised! You must call rcu.init(Ractive) before rcu.parse()");
  	}

  	parsed = rcu.Ractive.parse(source, {
  		noStringify: true,
  		interpolate: { script: false, style: false },
  		includeLinePositions: true
  	});

  	if (parsed.v !== TEMPLATE_VERSION) {
  		throw new Error("Mismatched template version (expected " + TEMPLATE_VERSION + ", got " + parsed.v + ")! Please ensure you are using the latest version of Ractive.js in your build process as well as in your app");
  	}

  	links = [];
  	styles = [];
  	modules = [];

  	// Extract certain top-level nodes from the template. We work backwards
  	// so that we can easily splice them out as we go
  	template = parsed.t;
  	i = template.length;
  	while (i--) {
  		item = template[i];

  		if (item && item.t === 7) {
  			if (item.e === "link" && (item.a && item.a.rel === "ractive")) {
  				links.push(template.splice(i, 1)[0]);
  			}

  			if (item.e === "script" && (!item.a || !item.a.type || item.a.type === "text/javascript")) {
  				if (scriptItem) {
  					throw new Error("You can only have one <script> tag per component file");
  				}
  				scriptItem = template.splice(i, 1)[0];
  			}

  			if (item.e === "style" && (!item.a || !item.a.type || item.a.type === "text/css")) {
  				styles.push(template.splice(i, 1)[0]);
  			}
  		}
  	}

  	// Clean up template - trim whitespace left over from the removal
  	// of <link>, <style> and <script> tags from start...
  	while (/^\s*$/.test(template[0])) {
  		template.shift();
  	}

  	// ...and end
  	while (/^\s*$/.test(template[template.length - 1])) {
  		template.pop();
  	}

  	// Extract names from links
  	imports = links.map(function (link) {
  		var href, name;

  		href = link.a.href;
  		name = link.a.name || getName(href);

  		if (typeof name !== "string") {
  			throw new Error("Error parsing link tag");
  		}

  		return {
  			name: name,
  			href: href
  		};
  	});

  	result = {
  		source: source,
  		template: parsed,
  		imports: imports,
  		css: styles.map(extractFragment).join(" "),
  		script: "",
  		modules: modules
  	};

  	// extract position information, so that we can generate source maps
  	if (scriptItem) {
  		(function () {
  			var contentStart, contentEnd, lines;

  			contentStart = source.indexOf(">", scriptItem.p[2]) + 1;
  			contentEnd = contentStart + scriptItem.f[0].length;

  			lines = source.split("\n");

  			result.scriptStart = getLinePosition(lines, contentStart);
  			result.scriptEnd = getLinePosition(lines, contentEnd);
  		})();

  		// Glue scripts together, for convenience
  		result.script = scriptItem.f[0];

  		while (match = requirePattern.exec(result.script)) {
  			modules.push(match[1] || match[2]);
  		}
  	}

  	return result;
  }

  function extractFragment(item) {
  	return item.f;
  }

  var _eval, isBrowser, isNode, head, Module, base64Encode;

  // This causes code to be eval'd in the global scope
  _eval = eval;

  if (typeof document !== "undefined") {
  	isBrowser = true;
  	head = document.getElementsByTagName("head")[0];
  } else if (typeof process !== "undefined") {
  	isNode = true;
  	Module = (require.nodeRequire || require)("module");
  }

  if (typeof btoa === "function") {
  	base64Encode = btoa;
  } else if (typeof Buffer === "function") {
  	base64Encode = function (str) {
  		return new Buffer(str, "utf-8").toString("base64");
  	};
  } else {
  	base64Encode = function () {};
  }
  function eval2(script, options) {
  	options = options || {};

  	if (options.sourceMap) {
  		script += "\n//# sourceMa" + "ppingURL=data:application/json;charset=utf-8;base64," + base64Encode(JSON.stringify(options.sourceMap));
  	} else if (options.sourceURL) {
  		script += "\n//# sourceURL=" + options.sourceURL;
  	}

  	try {
  		return _eval(script);
  	} catch (err) {
  		if (isNode) {
  			locateErrorUsingModule(script, options.sourceURL || "");
  			return;
  		}

  		// In browsers, only locate syntax errors. Other errors can
  		// be located via the console in the normal fashion
  		else if (isBrowser && err.name === "SyntaxError") {
  			locateErrorUsingDataUri(script);
  		}

  		throw err;
  	}
  }

  eval2.Function = function () {
  	var i,
  	    args = [],
  	    body,
  	    wrapped,
  	    options;

  	i = arguments.length;
  	while (i--) {
  		args[i] = arguments[i];
  	}

  	if (typeof args[args.length - 1] === "object") {
  		options = args.pop();
  	} else {
  		options = {};
  	}

  	// allow an array of arguments to be passed
  	if (args.length === 1 && Object.prototype.toString.call(args) === "[object Array]") {
  		args = args[0];
  	}

  	if (options.sourceMap) {
  		options.sourceMap = clone(options.sourceMap);

  		// shift everything a line down, to accommodate `(function (...) {`
  		options.sourceMap.mappings = ";" + options.sourceMap.mappings;
  	}

  	body = args.pop();
  	wrapped = "(function (" + args.join(", ") + ") {\n" + body + "\n})";

  	return eval2(wrapped, options);
  };

  function locateErrorUsingDataUri(code) {
  	var dataURI, scriptElement;

  	dataURI = "da" + "ta:text/javascript;charset=utf-8," + encodeURIComponent(code);

  	scriptElement = document.createElement("script");
  	scriptElement.src = dataURI;

  	scriptElement.onload = function () {
  		head.removeChild(scriptElement);
  	};

  	head.appendChild(scriptElement);
  }

  function locateErrorUsingModule(code, url) {
  	var m = new Module();

  	try {
  		m._compile("module.exports = function () {\n" + code + "\n};", url);
  	} catch (err) {
  		console.error(err);
  		return;
  	}

  	m.exports();
  }

  function clone(obj) {
  	var cloned = {},
  	    key;

  	for (key in obj) {
  		if (obj.hasOwnProperty(key)) {
  			cloned[key] = obj[key];
  		}
  	}

  	return cloned;
  }

  var charToInteger = {};
  var integerToChar = {};

  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".split("").forEach(function (char, i) {
  	charToInteger[char] = i;
  	integerToChar[i] = char;
  });
  function decode(string) {
  	var result = [],
  	    len = string.length,
  	    i,
  	    hasContinuationBit,
  	    shift = 0,
  	    value = 0,
  	    integer,
  	    shouldNegate;

  	for (i = 0; i < len; i += 1) {
  		integer = charToInteger[string[i]];

  		if (integer === undefined) {
  			throw new Error("Invalid character (" + string[i] + ")");
  		}

  		hasContinuationBit = integer & 32;

  		integer &= 31;
  		value += integer << shift;

  		if (hasContinuationBit) {
  			shift += 5;
  		} else {
  			shouldNegate = value & 1;
  			value >>= 1;

  			result.push(shouldNegate ? -value : value);

  			// reset
  			value = shift = 0;
  		}
  	}

  	return result;
  }

  function encode(value) {
  	var result, i;

  	if (typeof value === "number") {
  		result = encodeInteger(value);
  	} else {
  		result = "";
  		for (i = 0; i < value.length; i += 1) {
  			result += encodeInteger(value[i]);
  		}
  	}

  	return result;
  }

  function encodeInteger(num) {
  	var result = "",
  	    clamped;

  	if (num < 0) {
  		num = -num << 1 | 1;
  	} else {
  		num <<= 1;
  	}

  	do {
  		clamped = num & 31;
  		num >>= 5;

  		if (num > 0) {
  			clamped |= 32;
  		}

  		result += integerToChar[clamped];
  	} while (num > 0);

  	return result;
  }

  /**
   * Encodes a string as base64
   * @param {string} str - the string to encode
   * @returns {string}
   */
  var btoa__default = btoa__btoa;

  function btoa__btoa(str) {
    return new Buffer(str).toString("base64");
  }

  var SourceMap = function (properties) {
  	this.version = 3;

  	this.file = properties.file;
  	this.sources = properties.sources;
  	this.sourcesContent = properties.sourcesContent;
  	this.names = properties.names;
  	this.mappings = properties.mappings;
  };

  SourceMap.prototype = {
  	toString: function () {
  		return JSON.stringify(this);
  	},

  	toUrl: function () {
  		return "data:application/json;charset=utf-8;base64," + btoa__default(this.toString());
  	}
  };

  /**
   * Generates a v3 sourcemap between an original source and its built form
   * @param {object} definition - the result of `rcu.parse( originalSource )`
   * @param {object} options
   * @param {string} options.source - the name of the original source file
   * @param {number=} options.offset - the number of lines in the generated
     code that precede the script portion of the original source
   * @param {string=} options.file - the name of the generated file
   * @returns {object}
   */

  function generateSourceMap(definition, options) {
  	var lines, mappings, offset;

  	if (!options || !options.source) {
  		throw new Error("You must supply an options object with a `source` property to rcu.generateSourceMap()");
  	}

  	// The generated code probably includes a load of module gubbins - we don't bother
  	// mapping that to anything, instead we just have a bunch of empty lines
  	offset = new Array((options.offset || 0) + 1).join(";");

  	lines = definition.script.split("\n");
  	mappings = offset + lines.map(function (line, i) {
  		if (i === 0) {
  			// first mapping points to code immediately following opening <script> tag
  			return encode([0, 0, definition.scriptStart.line, definition.scriptStart.column]);
  		}

  		if (i === 1) {
  			return encode([0, 0, 1, -definition.scriptStart.column]);
  		}

  		return "AACA"; // equates to [ 0, 0, 1, 0 ];
  	}).join(";");

  	return new SourceMap({
  		file: options.file,
  		sources: [options.source],
  		sourcesContent: [definition.source],
  		names: [],
  		mappings: mappings
  	});
  }

  function make(source, config, callback, errback) {
  	var definition, url, createComponent, loadImport, imports, loadModule, modules, remainingDependencies, onloaded, ready;

  	config = config || {};

  	// Implementation-specific config
  	url = config.url || "";
  	loadImport = config.loadImport;
  	loadModule = config.loadModule;

  	definition = parse(source);

  	createComponent = function () {
  		var options, Component, factory, component, exports, prop;

  		options = {
  			template: definition.template,
  			partials: definition.partials,
  			css: definition.css,
  			components: imports
  		};

  		if (definition.script) {
  			var sourceMap = generateSourceMap(definition, {
  				source: url,
  				content: source
  			});

  			try {
  				factory = new eval2.Function("component", "require", "Ractive", definition.script, {
  					sourceMap: sourceMap
  				});

  				component = {};
  				factory(component, config.require, rcu.Ractive);
  				exports = component.exports;

  				if (typeof exports === "object") {
  					for (prop in exports) {
  						if (exports.hasOwnProperty(prop)) {
  							options[prop] = exports[prop];
  						}
  					}
  				}

  				Component = rcu.Ractive.extend(options);
  			} catch (err) {
  				errback(err);
  				return;
  			}

  			callback(Component);
  		} else {
  			Component = rcu.Ractive.extend(options);
  			callback(Component);
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
  	remainingDependencies = definition.imports.length + (loadModule ? definition.modules.length : 0);

  	if (remainingDependencies) {
  		onloaded = function () {
  			if (! --remainingDependencies) {
  				if (ready) {
  					createComponent();
  				} else {
  					setTimeout(createComponent, 0); // cheap way to enforce asynchrony for a non-Zalgoesque API
  				}
  			}
  		};

  		if (definition.imports.length) {
  			if (!loadImport) {
  				throw new Error("Component definition includes imports (e.g. `<link rel=\"ractive\" href=\"" + definition.imports[0].href + "\">`) but no loadImport method was passed to rcu.make()");
  			}

  			imports = {};

  			definition.imports.forEach(function (toImport) {
  				loadImport(toImport.name, toImport.href, url, function (Component) {
  					imports[toImport.name] = Component;
  					onloaded();
  				});
  			});
  		}

  		if (loadModule && definition.modules.length) {
  			modules = {};

  			definition.modules.forEach(function (name) {
  				loadModule(name, name, url, function (Component) {
  					modules[name] = Component;
  					onloaded();
  				});
  			});
  		}
  	} else {
  		setTimeout(createComponent, 0);
  	}

  	ready = true;
  }

  var resolve = resolvePath;

  function resolvePath(relativePath, base) {
  	var pathParts, relativePathParts, part;

  	// If we've got an absolute path, or base is '', return
  	// relativePath
  	if (!base || relativePath.charAt(0) === "/") {
  		return relativePath;
  	}

  	// 'foo/bar/baz.html' -> ['foo', 'bar', 'baz.html']
  	pathParts = (base || "").split("/");
  	relativePathParts = relativePath.split("/");

  	// ['foo', 'bar', 'baz.html'] -> ['foo', 'bar']
  	pathParts.pop();

  	while (part = relativePathParts.shift()) {
  		if (part === "..") {
  			pathParts.pop();
  		} else if (part !== ".") {
  			pathParts.push(part);
  		}
  	}

  	return pathParts.join("/");
  }

  var rcu = {
  	init: function (copy) {
  		rcu.Ractive = copy;
  	},

  	parse: parse,
  	make: make,
  	generateSourceMap: generateSourceMap,
  	resolve: resolve,
  	getName: getName
  };

  var _rcu = rcu;

  function load(base, req, source, callback, errback) {
  	_rcu.make(source, {
  		url: "" + base + ".html",
  		loadImport: function (name, path, baseUrl, callback) {
  			path = _rcu.resolve(path, base);
  			req(["rvc!" + path.replace(/\.html$/, "")], callback);
  		},
  		loadModule: function (name, path, baseUrl, callback) {
  			req([path], callback);
  		},
  		require: function (name) {
  			return req(name);
  		}
  	}, callback, errback);
  }

  /*
    toSource
    Adapted from https://github.com/marcello3d/node-tosource by Marcello Bastéa-Forte
    zlib license: https://github.com/marcello3d/node-tosource/blob/master/LICENSE
  */



  function toSource(object, filter, indent, startingIndent) {
      var seen = [];
      return walk(object, filter, indent === undefined ? "  " : indent || "", startingIndent || "", seen);

      function walk(object, filter, indent, currentIndent, seen) {
          var nextIndent = currentIndent + indent;
          object = filter ? filter(object) : object;

          switch (typeof object) {
              case "string":
                  return JSON.stringify(object);
              case "boolean":
              case "number":
              case "undefined":
                  return "" + object;
              case "function":
                  return object.toString();
          }

          if (object === null) return "null";
          if (object instanceof RegExp) return object.toString();
          if (object instanceof Date) return "new Date(" + object.getTime() + ")";

          var seenIndex = seen.indexOf(object) + 1;
          if (seenIndex > 0) return "{$circularReference:" + seenIndex + "}";
          seen.push(object);

          function join(elements) {
              return indent.slice(1) + elements.join("," + (indent && "\n") + nextIndent) + (indent ? " " : "");
          }

          if (Array.isArray(object)) {
              return "[" + join(object.map(function (element) {
                  return walk(element, filter, indent, nextIndent, seen.slice());
              })) + "]";
          }
          var keys = Object.keys(object);
          return keys.length ? "{" + join(keys.map(function (key) {
              return (legalKey(key) ? key : JSON.stringify(key)) + ":" + walk(object[key], filter, indent, nextIndent, seen.slice());
          })) + "}" : "{}";
      }
  }

  var KEYWORD_REGEXP = /^(abstract|boolean|break|byte|case|catch|char|class|const|continue|debugger|default|delete|do|double|else|enum|export|extends|false|final|finally|float|for|function|goto|if|implements|import|in|instanceof|int|interface|long|native|new|null|package|private|protected|public|return|short|static|super|switch|synchronized|this|throw|throws|transient|true|try|typeof|undefined|var|void|volatile|while|with)$/;

  function legalKey(string) {
      return /^[a-z_$][0-9a-z_$]*$/gi.test(string) && !KEYWORD_REGEXP.test(string);
  }

  // TODO more intelligent minification? removing comments?
  // collapsing declarations?


  function minifycss(css) {
  	return css.replace(/^\s+/gm, "");
  }

  function build(name, source, callback) {
  	var definition = _rcu.parse(source);
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

  _rcu.init(Ractive);

  var rvc = amdLoader("rvc", "html", function (name, source, req, callback, errback, config) {
  	if (config.isBuild) {
  		build(name, source, callback, errback);
  	} else {
  		load(name, req, source, callback, errback);
  	}
  });

  return rvc;

});