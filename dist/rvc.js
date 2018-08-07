define(['ractive'], function (Ractive) { 'use strict';

  Ractive = 'default' in Ractive ? Ractive['default'] : Ractive;

  var charToInteger = {};
  var integerToChar = {};

  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split('').forEach(function (char, i) {
  	charToInteger[char] = i;
  	integerToChar[i] = char;
  });

  function encode(value) {
  	var result, i;

  	if (typeof value === 'number') {
  		result = encodeInteger(value);
  	} else {
  		result = '';
  		for (i = 0; i < value.length; i += 1) {
  			result += encodeInteger(value[i]);
  		}
  	}

  	return result;
  }

  function encodeInteger(num) {
  	var result = '',
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
  function btoa$1(str) {
  	return new Buffer(str).toString('base64');
  }

  function SourceMap(properties) {
  	this.version = 3;

  	this.file = properties.file;
  	this.sources = properties.sources;
  	this.sourcesContent = properties.sourcesContent;
  	this.names = properties.names;
  	this.mappings = properties.mappings;
  }

  SourceMap.prototype = {
  	toString: function toString() {
  		return JSON.stringify(this);
  	},

  	toUrl: function toUrl() {
  		return 'data:application/json;charset=utf-8;base64,' + btoa$1(this.toString());
  	}
  };

  var alreadyWarned = false;

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
  	if (options === void 0) options = {};

  	if ('padding' in options) {
  		options.offset = options.padding;

  		if (!alreadyWarned) {
  			console.warn('rcu: options.padding is deprecated, use options.offset instead'); // eslint-disable-line no-console
  			alreadyWarned = true;
  		}
  	}

  	var mappings = '';

  	if (definition.scriptStart) {
  		// The generated code probably includes a load of module gubbins - we don't bother
  		// mapping that to anything, instead we just have a bunch of empty lines
  		var offset = new Array((options.offset || 0) + 1).join(';');
  		var lines = definition.script.split('\n');

  		var encoded;

  		if (options.hires !== false) {
  			var previousLineEnd = -definition.scriptStart.column;

  			encoded = lines.map(function (line, i) {
  				var lineOffset = i === 0 ? definition.scriptStart.line : 1;

  				var encoded = encode([0, 0, lineOffset, -previousLineEnd]);

  				var lineEnd = line.length;

  				for (var j = 1; j < lineEnd; j += 1) {
  					encoded += ',CAAC';
  				}

  				previousLineEnd = i === 0 ? lineEnd + definition.scriptStart.column : Math.max(0, lineEnd - 1);

  				return encoded;
  			});
  		} else {
  			encoded = lines.map(function (line, i) {
  				if (i === 0) {
  					// first mapping points to code immediately following opening <script> tag
  					return encode([0, 0, definition.scriptStart.line, definition.scriptStart.column]);
  				}

  				if (i === 1) {
  					return encode([0, 0, 1, -definition.scriptStart.column]);
  				}

  				return 'AACA'; // equates to [ 0, 0, 1, 0 ];
  			});
  		}

  		mappings = offset + encoded.join(';');
  	}

  	return new SourceMap({
  		file: options.file || null,
  		sources: [options.source || null],
  		sourcesContent: [definition.source],
  		names: [],
  		mappings: mappings
  	});
  }

  function getName(path) {
  	var pathParts = path.split('/');
  	var filename = pathParts.pop();

  	var lastIndex = filename.lastIndexOf('.');
  	if (lastIndex !== -1) filename = filename.substr(0, lastIndex);

  	return filename;
  }

  var Ractive$1;

  function init(copy) {
  	Ractive$1 = copy;
  }

  var _eval;
  var isBrowser;
  var isNode;
  var head;
  var Module;
  var base64Encode;
  var SOURCE_MAPPING_URL = 'sourceMappingUrl';
  var DATA = 'data';

  // This causes code to be eval'd in the global scope
  _eval = eval;

  if (typeof document !== 'undefined') {
  	isBrowser = true;
  	head = document.getElementsByTagName('head')[0];
  } else if (typeof process !== 'undefined') {
  	isNode = true;
  	Module = (require.nodeRequire || require)('module');
  }

  if (typeof btoa === 'function') {
  	base64Encode = function (str) {
  		str = str.replace(/[^\x00-\x7F]/g, function (char) {
  			var hex = char.charCodeAt(0).toString(16);
  			while (hex.length < 4) hex = '0' + hex;

  			return '\\u' + hex;
  		});

  		return btoa(str);
  	};
  } else if (typeof Buffer === 'function') {
  	base64Encode = function (str) {
  		return new Buffer(str, 'utf-8').toString('base64');
  	};
  } else {
  	base64Encode = function () {};
  }

  function eval2(script, options) {
  	options = options || {};

  	if (options.sourceMap) {
  		script += '\n//# ' + SOURCE_MAPPING_URL + '=data:application/json;charset=utf-8;base64,' + base64Encode(JSON.stringify(options.sourceMap));
  	} else if (options.sourceURL) {
  		script += '\n//# sourceURL=' + options.sourceURL;
  	}

  	try {
  		return _eval(script);
  	} catch (err) {
  		if (isNode) {
  			locateErrorUsingModule(script, options.sourceURL || '');
  			return;
  		}

  		// In browsers, only locate syntax errors. Other errors can
  		// be located via the console in the normal fashion
  		else if (isBrowser && err.name === 'SyntaxError') {
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

  	if (typeof args[args.length - 1] === 'object') {
  		options = args.pop();
  	} else {
  		options = {};
  	}

  	// allow an array of arguments to be passed
  	if (args.length === 1 && Object.prototype.toString.call(args) === '[object Array]') {
  		args = args[0];
  	}

  	if (options.sourceMap) {
  		options.sourceMap = clone(options.sourceMap);

  		// shift everything a line down, to accommodate `(function (...) {`
  		options.sourceMap.mappings = ';' + options.sourceMap.mappings;
  	}

  	body = args.pop();
  	wrapped = '(function (' + args.join(', ') + ') {\n' + body + '\n})';

  	return eval2(wrapped, options);
  };

  function locateErrorUsingDataUri(code) {
  	var dataURI, scriptElement;

  	dataURI = DATA + ':text/javascript;charset=utf-8,' + encodeURIComponent(code);

  	scriptElement = document.createElement('script');
  	scriptElement.src = dataURI;

  	scriptElement.onload = function () {
  		head.removeChild(scriptElement);
  	};

  	head.appendChild(scriptElement);
  }

  function locateErrorUsingModule(code, url) {
  	var m = new Module();

  	try {
  		m._compile('module.exports = function () {\n' + code + '\n};', url);
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

  function getLocation(source, charIndex) {
  	var lines = source.split('\n');
  	var len = lines.length;

  	for (var i = 0, lineStart = 0; i < len; i += 1) {
  		var line = lines[i];
  		var lineEnd = lineStart + line.length + 1; // +1 for newline

  		if (lineEnd > charIndex) {
  			return { line: i + 1, column: charIndex - lineStart };
  		}

  		lineStart = lineEnd;
  	}

  	throw new Error("Could not determine location of character " + charIndex);
  }

  var keywords = /(case|default|delete|do|else|in|instanceof|new|return|throw|typeof|void)\s*$/;
  var punctuators = /(^|\{|\(|\[\.|;|,|<|>|<=|>=|==|!=|===|!==|\+|-|\*\%|<<|>>|>>>|&|\||\^|!|~|&&|\|\||\?|:|=|\+=|-=|\*=|%=|<<=|>>=|>>>=|&=|\|=|\^=|\/=|\/)\s*$/;
  var ambiguous = /(\}|\)|\+\+|--)\s*$/;
  var beforeJsx = /^$|[=:;,\(\{\}\[|&+]\s*$/;

  function find(str) {
  	var quote;
  	var escapedFrom;
  	var regexEnabled = true;
  	var pfixOp = false;
  	var jsxTagDepth = 0;
  	var stack = [];

  	var start;
  	var found = [];
  	var state = base;

  	function base(char, i) {
  		if (char === '/') {
  			// could be start of regex literal OR division punctuator. Solution via
  			// http://stackoverflow.com/questions/5519596/when-parsing-javascript-what-determines-the-meaning-of-a-slash/27120110#27120110
  			var substr = str.substr(0, i);
  			if (keywords.test(substr) || punctuators.test(substr)) {
  				regexEnabled = true;
  			} else if (ambiguous.test(substr) && !tokenClosesExpression(substr, found)) {
  				regexEnabled = true;
  			} // TODO save this determination for when it's necessary?
  			else {
  					regexEnabled = false;
  				}

  			return start = i, slash;
  		}

  		if (char === '"' || char === "'") {
  			return start = i, quote = char, stack.push(base), string;
  		}
  		if (char === '`') {
  			return start = i, templateString;
  		}

  		if (char === '{') {
  			return stack.push(base), base;
  		}
  		if (char === '}') {
  			return start = i, stack.pop();
  		}

  		if (!(pfixOp && /\W/.test(char))) {
  			pfixOp = char === '+' && str[i - 1] === '+' || char === '-' && str[i - 1] === '-';
  		}

  		if (char === '<') {
  			var substr$1 = str.substr(0, i);
  			substr$1 = _erase(substr$1, found).trim();
  			if (beforeJsx.test(substr$1)) {
  				return stack.push(base), jsxTagStart;
  			}
  		}

  		return base;
  	}

  	function slash(char) {
  		if (char === '/') {
  			return lineComment;
  		}
  		if (char === '*') {
  			return blockComment;
  		}
  		if (char === '[') {
  			return regexEnabled ? regexCharacter : base;
  		}
  		if (char === '\\') {
  			return escapedFrom = regex, escaped;
  		}
  		return regexEnabled && !pfixOp ? regex : base;
  	}

  	function regex(char, i) {
  		if (char === '[') {
  			return regexCharacter;
  		}
  		if (char === '\\') {
  			return escapedFrom = regex, escaped;
  		}

  		if (char === '/') {
  			var end = i + 1;
  			var outer = str.slice(start, end);
  			var inner = outer.slice(1, -1);

  			found.push({ start: start, end: end, inner: inner, outer: outer, type: 'regex' });

  			return base;
  		}

  		return regex;
  	}

  	function regexCharacter(char) {
  		if (char === ']') {
  			return regex;
  		}
  		if (char === '\\') {
  			return escapedFrom = regexCharacter, escaped;
  		}
  		return regexCharacter;
  	}

  	function string(char, i) {
  		if (char === '\\') {
  			return escapedFrom = string, escaped;
  		}
  		if (char === quote) {
  			var end = i + 1;
  			var outer = str.slice(start, end);
  			var inner = outer.slice(1, -1);

  			found.push({ start: start, end: end, inner: inner, outer: outer, type: 'string' });

  			return stack.pop();
  		}

  		return string;
  	}

  	function escaped() {
  		return escapedFrom;
  	}

  	function templateString(char, i) {
  		if (char === '$') {
  			return templateStringDollar;
  		}
  		if (char === '\\') {
  			return escapedFrom = templateString, escaped;
  		}

  		if (char === '`') {
  			var end = i + 1;
  			var outer = str.slice(start, end);
  			var inner = outer.slice(1, -1);

  			found.push({ start: start, end: end, inner: inner, outer: outer, type: 'templateEnd' });

  			return base;
  		}

  		return templateString;
  	}

  	function templateStringDollar(char, i) {
  		if (char === '{') {
  			var end = i + 1;
  			var outer = str.slice(start, end);
  			var inner = outer.slice(1, -2);

  			found.push({ start: start, end: end, inner: inner, outer: outer, type: 'templateChunk' });

  			stack.push(templateString);
  			return base;
  		}
  		return templateString(char, i);
  	}

  	// JSX is an XML-like extension to ECMAScript
  	// https://facebook.github.io/jsx/

  	function jsxTagStart(char) {
  		if (char === '/') {
  			return jsxTagDepth--, jsxTag;
  		}
  		return jsxTagDepth++, jsxTag;
  	}

  	function jsxTag(char, i) {
  		if (char === '"' || char === "'") {
  			return start = i, quote = char, stack.push(jsxTag), string;
  		}
  		if (char === '{') {
  			return stack.push(jsxTag), base;
  		}
  		if (char === '>') {
  			if (jsxTagDepth <= 0) {
  				return base;
  			}
  			return jsx;
  		}
  		if (char === '/') {
  			return jsxTagSelfClosing;
  		}

  		return jsxTag;
  	}

  	function jsxTagSelfClosing(char) {
  		if (char === '>') {
  			jsxTagDepth--;
  			if (jsxTagDepth <= 0) {
  				return base;
  			}
  			return jsx;
  		}

  		return jsxTag;
  	}

  	function jsx(char) {
  		if (char === '{') {
  			return stack.push(jsx), base;
  		}
  		if (char === '<') {
  			return jsxTagStart;
  		}

  		return jsx;
  	}

  	function lineComment(char, end) {
  		if (char === '\n') {
  			var outer = str.slice(start, end);
  			var inner = outer.slice(2);

  			found.push({ start: start, end: end, inner: inner, outer: outer, type: 'line' });

  			return base;
  		}

  		return lineComment;
  	}

  	function blockComment(char) {
  		if (char === '*') {
  			return blockCommentEnding;
  		}
  		return blockComment;
  	}

  	function blockCommentEnding(char, i) {
  		if (char === '/') {
  			var end = i + 1;
  			var outer = str.slice(start, end);
  			var inner = outer.slice(2, -2);

  			found.push({ start: start, end: end, inner: inner, outer: outer, type: 'block' });

  			return base;
  		}

  		return blockComment(char);
  	}

  	for (var i = 0; i < str.length; i += 1) {
  		if (!state) {
  			var ref = getLocation(str, i);
  			var line = ref.line;
  			var column = ref.column;
  			var before = str.slice(0, i);
  			var beforeLine = /(^|\n).+$/.exec(before)[0];
  			var after = str.slice(i);
  			var afterLine = /.+(\n|$)/.exec(after)[0];

  			var snippet = "" + beforeLine + afterLine + "\n" + Array(beforeLine.length + 1).join(' ') + "^";

  			throw new Error("Unexpected character (" + line + ":" + column + "). If this is valid JavaScript, it's probably a bug in tippex. Please raise an issue at https://github.com/Rich-Harris/tippex/issues – thanks!\n\n" + snippet);
  		}

  		state = state(str[i], i);
  	}

  	return found;
  }

  function tokenClosesExpression(substr, found) {
  	substr = _erase(substr, found);

  	var token = ambiguous.exec(substr);
  	if (token) {
  		token = token[1];
  	}

  	if (token === ')') {
  		var count = 0;
  		var i = substr.length;
  		while (i--) {
  			if (substr[i] === ')') {
  				count += 1;
  			}

  			if (substr[i] === '(') {
  				count -= 1;
  				if (count === 0) {
  					i -= 1;
  					break;
  				}
  			}
  		}

  		// if parenthesized expression is immediately preceded by `if`/`while`, it's not closing an expression
  		while (/\s/.test(substr[i - 1])) {
  			i -= 1;
  		}
  		if (substr.slice(i - 2, i) === 'if' || substr.slice(i - 5, i) === 'while') {
  			return false;
  		}
  	}

  	// TODO handle }, ++ and -- tokens immediately followed by / character
  	return true;
  }

  function spaces(count) {
  	var spaces = '';
  	while (count--) {
  		spaces += ' ';
  	}
  	return spaces;
  }

  var erasers = {
  	string: function (chunk) {
  		return chunk.outer[0] + spaces(chunk.inner.length) + chunk.outer[0];
  	},
  	line: function (chunk) {
  		return spaces(chunk.outer.length);
  	},
  	block: function (chunk) {
  		return chunk.outer.split('\n').map(function (line) {
  			return spaces(line.length);
  		}).join('\n');
  	},
  	regex: function (chunk) {
  		return '/' + spaces(chunk.inner.length) + '/';
  	},
  	templateChunk: function (chunk) {
  		return chunk.outer[0] + spaces(chunk.inner.length) + '${';
  	},
  	templateEnd: function (chunk) {
  		return chunk.outer[0] + spaces(chunk.inner.length) + '`';
  	}
  };

  function _erase(str, found) {
  	var erased = '';
  	var charIndex = 0;

  	for (var i = 0; i < found.length; i += 1) {
  		var chunk = found[i];
  		erased += str.slice(charIndex, chunk.start);
  		erased += erasers[chunk.type](chunk);

  		charIndex = chunk.end;
  	}

  	erased += str.slice(charIndex);
  	return erased;
  }

  function makeGlobalRegExp(original) {
  	var flags = 'g';

  	if (original.multiline) {
  		flags += 'm';
  	}
  	if (original.ignoreCase) {
  		flags += 'i';
  	}
  	if (original.sticky) {
  		flags += 'y';
  	}
  	if (original.unicode) {
  		flags += 'u';
  	}

  	return new RegExp(original.source, flags);
  }

  function match(str, pattern, callback) {
  	var g = pattern.global;
  	if (!g) {
  		pattern = makeGlobalRegExp(pattern);
  	}

  	var found = find(str);

  	var match;
  	var chunkIndex = 0;

  	while (match = pattern.exec(str)) {
  		var chunk = void 0;

  		do {
  			chunk = found[chunkIndex];

  			if (chunk && chunk.end < match.index) {
  				chunkIndex += 1;
  			} else {
  				break;
  			}
  		} while (chunk);

  		if (!chunk || chunk.start > match.index) {
  			var args = [].slice.call(match).concat(match.index, str);
  			callback.apply(null, args);
  			if (!g) {
  				break;
  			}
  		}
  	}
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
  	var line = 0;
  	var lineStart = 0;

  	var lineEnds = lines.map(function (line) {
  		lineStart += line.length + 1; // +1 for the newline
  		return lineStart;
  	});

  	lineStart = 0;

  	while (char >= lineEnds[line]) {
  		lineStart = lineEnds[line];
  		line += 1;
  	}

  	var column = char - lineStart;
  	return { line: line, column: column, char: char };
  }

  var requirePattern = /require\s*\(\s*(?:"([^"]+)"|'([^']+)')\s*\)/g;
  var TEMPLATE_VERSION = 4;
  var CACHE_PREFIX = '_rcu_';

  function parse(source, parseOptions, typeAttrs, identifier, versionSuffix) {
  	if (!Ractive$1) {
  		throw new Error('rcu has not been initialised! You must call rcu.init(Ractive) before rcu.parse()');
  	}

  	var fromCache = getFromCache(source, identifier);

  	var parsed = fromCache || Ractive$1.parse(source, Object.assign({
  		noStringify: true,
  		interpolate: { script: false, style: false }
  	}, parseOptions || {}, { includeLinePositions: true }));

  	if (fromCache === undefined) {
  		registerCache(source, parsed, identifier, versionSuffix);
  	}

  	if (parsed.v !== TEMPLATE_VERSION) {
  		console.warn("Mismatched template version (expected " + TEMPLATE_VERSION + ", got " + parsed.v + ")! Please ensure you are using the latest version of Ractive.js in your build process as well as in your app"); // eslint-disable-line no-console
  	}

  	var links = [];
  	var styles = [];
  	var modules = [];

  	// Extract certain top-level nodes from the template. We work backwards
  	// so that we can easily splice them out as we go
  	var template = parsed.t;
  	var i = template.length;
  	var scriptItem;

  	while (i--) {
  		var item = template[i];

  		if (item && item.t === 7) {
  			var attr = getAttr('rel', item);
  			if (item.e === 'link' && attr === 'ractive') {
  				links.push(template.splice(i, 1)[0]);
  			}

  			attr = getAttr('type', item);
  			if (item.e === 'script' && (!attr || attr === (typeAttrs && typeAttrs.js ? typeAttrs.js : 'text/javascript'))) {
  				if (scriptItem) {
  					throw new Error('You can only have one <script> tag per component file');
  				}
  				scriptItem = template.splice(i, 1)[0];
  			}

  			if (item.e === 'style' && (!attr || attr === (typeAttrs && typeAttrs.css ? typeAttrs.css : 'text/css'))) {
  				styles.push(template.splice(i, 1)[0]);
  			}
  		}
  	}

  	// Clean up template - trim whitespace left over from the removal
  	// of <link>, <style> and <script> tags from start...
  	while (/^\s*$/.test(template[0])) template.shift();

  	// ...and end
  	while (/^\s*$/.test(template[template.length - 1])) template.pop();

  	// Extract names from links
  	var imports = links.map(function (link) {
  		var href = getAttr('href', link);
  		var name = getAttr('name', link) || getName(href);

  		if (typeof name !== 'string') {
  			throw new Error('Error parsing link tag');
  		}

  		return { name: name, href: href };
  	});

  	var result = {
  		source: source, imports: imports, modules: modules,
  		template: parsed,
  		css: styles.map(function (item) {
  			return item.f;
  		}).join(' '),
  		script: ''
  	};

  	if (identifier) {
  		result._componentPath = identifier;
  	}

  	// extract position information, so that we can generate source maps
  	if (scriptItem && scriptItem.f) {
  		var content = scriptItem.f[0];

  		// Ractive >= 0.10 uses .q, older versions use .p
  		var contentStart = source.indexOf('>', scriptItem.q ? scriptItem.q[2] : scriptItem.p[2]) + 1;

  		// we have to jump through some hoops to find contentEnd, because the contents
  		// of the <script> tag get trimmed at parse time
  		var contentEnd = contentStart + content.length + source.slice(contentStart).replace(content, '').indexOf('</script');

  		var lines = source.split('\n');

  		result.scriptStart = getLinePosition(lines, contentStart);
  		result.scriptEnd = getLinePosition(lines, contentEnd);

  		result.script = source.slice(contentStart, contentEnd);

  		match(result.script, requirePattern, function (match, doubleQuoted, singleQuoted) {
  			var source = doubleQuoted || singleQuoted;
  			if (! ~modules.indexOf(source)) modules.push(source);
  		});
  	}

  	// remove line positions to reduce the size
  	if (parseOptions && parseOptions.includeLinePositions === false) {
  		var clean = function (value) {
  			if (!value || typeof value !== 'object') {
  				return value;
  			}

  			// Ractive >= 0.10 uses .q, older versions use .p
  			['q', 'p'].some(function (key) {
  				if (Object.prototype.hasOwnProperty.call(value, key) && Array.isArray(value[key]) && !value[key].filter(function (n) {
  					return !Number.isInteger(n);
  				}).length) {
  					delete value[key];
  					return true;
  				}
  			});

  			Object.keys(value).forEach(function (key) {
  				return clean(value[key]);
  			});
  			return value;
  		};

  		clean(result);
  	}

  	return result;
  }

  function checksum(s) {
  	var chk = 0x12345678;
  	var len = s.length;

  	for (var i = 0; i < len; i++) {
  		chk += s.charCodeAt(i) * (i + 1);
  	}

  	return (chk & 0xffffffff).toString(16);
  }

  var getCacheKey = function (identifier, checksum) {
  	return identifier ? CACHE_PREFIX + identifier : CACHE_PREFIX + checksum;
  };

  var prepareCacheEntry = function (compiled, checkSum, versionSuffix) {
  	return {
  		date: new Date(),
  		checkSum: checkSum,
  		data: compiled,
  		versionSuffix: versionSuffix,
  		ractiveVersion: Ractive$1.VERSION
  	};
  };

  var registerCache = function (source, compiled, identifier, versionSuffix) {
  	try {
  		var checkSum = checksum(source);
  		if (typeof window != 'undefined' && typeof window.localStorage != 'undefined') {
  			window.localStorage.setItem(getCacheKey(identifier, checkSum), JSON.stringify(prepareCacheEntry(compiled, checkSum, versionSuffix)));
  		}
  	} catch (e) {
  		//noop
  	}
  };

  function getFromCache(source, identifier) {
  	try {
  		var checkSum = checksum(source);
  		if (typeof window != 'undefined' && typeof window.localStorage != 'undefined') {
  			var item = localStorage.getItem(getCacheKey(identifier, checkSum));
  			if (item) {
  				var parsed = JSON.parse(item);
  				return parsed.checkSum === checkSum && Ractive$1.VERSION === parsed.ractiveVersion ? parsed.data : undefined;
  			} else {
  				return undefined;
  			}
  		}
  	} catch (e) {
  		//noop
  	}
  	return undefined;
  }

  function getAttr(name, node) {
  	if (node.a && node.a[name]) return node.a[name];else if (node.m) {
  		var i = node.m.length;
  		while (i--) {
  			var a = node.m[i];
  			// plain attribute
  			if (a.t === 13) {
  				if (a.n === name) return a.f;
  			}
  		}
  	}
  }

  function make(source, config, callback, errback) {
  	config = config || {};

  	// Implementation-specific config
  	var url = config.url || '';
  	var versionSuffix = config.versionSuffix || '';
  	var loadImport = config.loadImport;
  	var loadModule = config.loadModule;
  	var parseOptions = config.parseOptions;
  	var typeAttrs = config.typeAttrs;

  	var definition = parse(source, parseOptions, typeAttrs, url, versionSuffix);

  	var imports = {};

  	function cssContainsRactiveDelimiters(cssDefinition) {
  		//TODO: this can use Ractive's default delimiter definitions, and perhaps a single REGEX for match
  		return cssDefinition && cssDefinition.indexOf('{{') !== -1 && cssDefinition.indexOf('}}') !== -1;
  	}

  	function determineCss(cssDefinition) {
  		if (cssContainsRactiveDelimiters(cssDefinition)) {
  			return function (d) {
  				return Ractive$1({
  					template: definition.css,
  					data: d()
  				}).fragment.toString(false);
  			};
  		} else {
  			return definition.css;
  		}
  	}

  	function createComponent() {
  		var options = {
  			template: definition.template,
  			partials: definition.partials,
  			_componentPath: definition._componentPath,
  			css: determineCss(definition.css),
  			components: imports
  		};

  		var Component;

  		if (definition.script) {
  			var sourceMap = generateSourceMap(definition, {
  				source: url,
  				content: source
  			});

  			try {
  				var factory = new eval2.Function('component', 'require', 'Ractive', definition.script, {
  					sourceMap: sourceMap
  				});

  				var component = {};
  				factory(component, config.require, Ractive$1);
  				var exports = component.exports;

  				if (typeof exports === 'object') {
  					for (var prop in exports) {
  						if (exports.hasOwnProperty(prop)) {
  							options[prop] = exports[prop];
  						}
  					}
  				}

  				Component = Ractive$1.extend(options);
  			} catch (err) {
  				errback(err);
  				return;
  			}

  			callback(Component);
  		} else {
  			Component = Ractive$1.extend(options);
  			callback(Component);
  		}
  	}

  	// If the definition includes sub-components e.g.
  	//     <link rel='ractive' href='foo.html'>
  	//
  	// ...then we need to load them first, using the loadImport method
  	// specified by the implementation.
  	//
  	// In some environments (e.g. AMD) the same goes for modules, which
  	// most be loaded before the script can execute
  	var remainingDependencies = definition.imports.length + (loadModule ? definition.modules.length : 0);
  	var ready = false;

  	if (remainingDependencies) {
  		var onloaded = function () {
  			if (! --remainingDependencies) {
  				if (ready) {
  					createComponent();
  				} else {
  					setTimeout(createComponent); // cheap way to enforce asynchrony for a non-Zalgoesque API
  				}
  			}
  		};

  		if (definition.imports.length) {
  			if (!loadImport) {
  				throw new Error("Component definition includes imports (e.g. <link rel=\"ractive\" href=\"" + definition.imports[0].href + "\">) but no loadImport method was passed to rcu.make()");
  			}

  			definition.imports.forEach(function (toImport) {
  				loadImport(toImport.name, toImport.href, url, function (Component) {
  					imports[toImport.name] = Component;
  					onloaded();
  				});
  			});
  		}

  		if (loadModule && definition.modules.length) {
  			definition.modules.forEach(function (name) {
  				loadModule(name, name, url, onloaded);
  			});
  		}
  	} else {
  		setTimeout(createComponent, 0);
  	}

  	ready = true;
  }

  function resolvePath(relativePath, base) {
  	// If we've got an absolute path, or base is '', return
  	// relativePath
  	if (!base || relativePath.charAt(0) === '/') {
  		return relativePath;
  	}

  	// 'foo/bar/baz.html' -> ['foo', 'bar', 'baz.html']
  	var pathParts = (base || '').split('/');
  	var relativePathParts = relativePath.split('/');

  	// ['foo', 'bar', 'baz.html'] -> ['foo', 'bar']
  	pathParts.pop();

  	var part;

  	while (part = relativePathParts.shift()) {
  		if (part === '..') {
  			pathParts.pop();
  		} else if (part !== '.') {
  			pathParts.push(part);
  		}
  	}

  	return pathParts.join('/');
  }

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
        var queryString = '';
        if (path.indexOf('?') != -1) {
          queryString = path.substr(path.indexOf('?'));
          path = path.substr(0, path.length - queryString.length);
        }

        // precompiled -> load from .ext.js extension
        if (config.precompiled instanceof Array) {
          for (var i = 0; i < config.precompiled.length; i++) if (path.substr(0, config.precompiled[i].length) == config.precompiled[i]) return require([path + '.' + pluginId + '.js' + queryString], load, load.error);
        } else if (config.precompiled === true) return require([path + '.' + pluginId + '.js' + queryString], load, load.error);

        // only add extension if a moduleID not a path
        if (ext && name.substr(0, 1) != '/' && !name.match(/:\/\//)) {
          var validExt = false;
          if (allowExts) {
            for (var i = 0; i < allowExts.length; i++) {
              if (name.substr(name.length - allowExts[i].length - 1) == '.' + allowExts[i]) validExt = true;
            }
          }
          if (!validExt) path += '.' + ext + queryString;else path += queryString;
        } else {
          path += queryString;
        }

        var self = this;

        loader.fetch(path, function (source) {
          compile(name, source, req, function (compiled) {
            if (typeof compiled == 'string') {
              if (config.isBuild) self.buildCache[name] = compiled;
              load.fromText(compiled);
            } else load(compiled);
          }, load.error, config);
        }, load.error);
      },
      write: function (pluginName, moduleName, write) {
        var compiled = this.buildCache[moduleName];
        if (compiled) write.asModule(pluginName + '!' + moduleName, compiled);
      },
      writeFile: function (pluginName, name, req, write) {
        write.asModule(pluginName + '!' + name, req.toUrl(name + '.' + pluginId + '.js'), this.buildCache[name]);
      }
    };
  };

  //loader.load = function(name, req, load, config) {
  //  load(loader);
  //}

  if (typeof window != 'undefined') {
    var progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'];
    var getXhr = function (path) {
      // check if same domain
      var sameDomain = true,
          domainCheck = /^(\w+:)?\/\/([^\/]+)/.exec(path);
      if (typeof window != 'undefined' && domainCheck) {
        sameDomain = domainCheck[2] === window.location.host;
        if (domainCheck[1]) sameDomain &= domainCheck[1] === window.location.protocol;
      }

      // create xhr
      var xhr;
      if (typeof XMLHttpRequest !== 'undefined') xhr = new XMLHttpRequest();else {
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
        if (typeof XDomainRequest != 'undefined') xhr = new XDomainRequest();else if (!('withCredentials' in xhr)) throw new Error('getXhr(): Cross Origin XHR not supported.');
      }

      if (!xhr) throw new Error('getXhr(): XMLHttpRequest not available');

      return xhr;
    };

    loader.fetch = function (url, callback, errback) {
      // get the xhr with CORS enabled if cross domain
      var xhr = getXhr(url);

      xhr.open('GET', url, !requirejs.inlineRequire);
      xhr.onreadystatechange = function (evt) {
        var status, err;
        //Do not explicitly handle errors, those should be
        //visible via console output in the browser.
        if (xhr.readyState === 4) {
          status = xhr.status;
          if (status > 399 && status < 600) {
            err = new Error(url + ' HTTP status: ' + status);
            err.xhr = xhr;
            if (errback) errback(err);
          } else {
            if (xhr.responseText == '') return errback(new Error(url + ' empty response'));
            callback(xhr.responseText);
          }
        }
      };
      xhr.send(null);
    };
  } else if (typeof process !== 'undefined' && process.versions && !!process.versions.node) {
    var fs = requirejs.nodeRequire('fs');
    loader.fetch = function (path, callback) {
      callback(fs.readFileSync(path, 'utf8'));
    };
  } else if (typeof Packages !== 'undefined') {
    loader.fetch = function (path, callback, errback) {
      var stringBuffer,
          line,
          encoding = 'utf-8',
          file = new java.io.File(path),
          lineSeparator = java.lang.System.getProperty('line.separator'),
          input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
          content = '';
      try {
        stringBuffer = new java.lang.StringBuffer();
        line = input.readLine();

        // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
        // http://www.unicode.org/faq/utf_bom.html

        // Note that when we use utf-8, the BOM should appear as 'EF BB BF', but it doesn't due to this bug in the JDK:
        // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
        if (line && line.length() && line.charAt(0) === 0xfeff) {
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
      throw new Error('Environment unsupported.');
    };
  }

  function load(base, req, source, callback, errback) {
  	make(source, {
  		url: base + '.html',
  		loadImport: function (name, path, baseUrl, callback) {
  			path = resolvePath(path, base);
  			req(['rvc!' + path.replace(/\.html$/, '')], callback);
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
      return walk(object, filter, indent === undefined ? '  ' : indent || '', startingIndent || '', seen);

      function walk(object, filter, indent, currentIndent, seen) {
          var nextIndent = currentIndent + indent;
          object = filter ? filter(object) : object;

          switch (typeof object) {
              case 'string':
                  return JSON.stringify(object);
              case 'boolean':
              case 'number':
              case 'undefined':
                  return '' + object;
              case 'function':
                  return object.toString();
          }

          if (object === null) return 'null';
          if (object instanceof RegExp) return object.toString();
          if (object instanceof Date) return 'new Date(' + object.getTime() + ')';

          var seenIndex = seen.indexOf(object) + 1;
          if (seenIndex > 0) return '{$circularReference:' + seenIndex + '}';
          seen.push(object);

          function join(elements) {
              return indent.slice(1) + elements.join(',' + (indent && '\n') + nextIndent) + (indent ? ' ' : '');
          }

          if (Array.isArray(object)) {
              return '[' + join(object.map(function (element) {
                  return walk(element, filter, indent, nextIndent, seen.slice());
              })) + ']';
          }
          var keys = Object.keys(object);
          return keys.length ? '{' + join(keys.map(function (key) {
              return (legalKey(key) ? key : JSON.stringify(key)) + ':' + walk(object[key], filter, indent, nextIndent, seen.slice());
          })) + '}' : '{}';
      }
  }

  var KEYWORD_REGEXP = /^(abstract|boolean|break|byte|case|catch|char|class|const|continue|debugger|default|delete|do|double|else|enum|export|extends|false|final|finally|float|for|function|goto|if|implements|import|in|instanceof|int|interface|long|native|new|null|package|private|protected|public|return|short|static|super|switch|synchronized|this|throw|throws|transient|true|try|typeof|undefined|var|void|volatile|while|with)$/;

  function legalKey(string) {
      return (/^[a-z_$][0-9a-z_$]*$/gi.test(string) && !KEYWORD_REGEXP.test(string)
      );
  }

  // TODO more intelligent minification? removing comments?
  // collapsing declarations?

  function minifycss(css) {
  	return css.replace(/^\s+/gm, '');
  }

  function build(name, source, callback) {
  	var definition = parse(source);
  	var dependencies = ['require', 'ractive'];
  	var dependencyArgs = ['require', 'Ractive'];
  	var importMap = [];

  	// Add dependencies from <link> tags, i.e. sub-components
  	definition.imports.forEach(function (toImport, i) {
  		var href = toImport.href;
  		var name = toImport.name;

  		var argumentName = '_import_' + i;

  		dependencies.push('rvc!' + href.replace(/\.html$/, ''));
  		dependencyArgs.push(argumentName);

  		importMap.push('"' + name + '": ' + argumentName);
  	});

  	// Add dependencies from inline require() calls
  	dependencies = dependencies.concat(definition.modules);

  	var options = ['template: ' + toSource(definition.template, null, '', '')];

  	if (definition.css) {
  		options.push('css: ' + JSON.stringify(minifycss(definition.css)));
  	}

  	if (definition.imports.length) {
  		options.push('components: {' + importMap.join(',') + '}');
  	}

  	var builtModule = 'define("rvc!' + name + '", ' + JSON.stringify(dependencies) + ',function(' + dependencyArgs.join(',') + '){\n\tvar __options__ = {\n\t\t' + options.join(',\n\t\t') + '\n\t},\n\tcomponent = {};';

  	if (definition.script) {
  		builtModule += '\n' + definition.script + '\n\tif ( typeof component.exports === "object" ) {\n\t\tfor ( var __prop__ in component.exports ) {\n\t\t\tif ( component.exports.hasOwnProperty(__prop__) ) {\n\t\t\t\t__options__[__prop__] = component.exports[__prop__];\n\t\t\t}\n\t\t}\n\t}\n';
  	}

  	builtModule += 'return Ractive.extend(__options__);\n});';

  	callback(builtModule);
  }

  init(Ractive);

  var rvc = loader('rvc', 'html', function (name, source, req, callback, errback, config) {
  	if (config.isBuild) {
  		build(name, source, callback, errback);
  	} else {
  		load(name, req, source, callback, errback);
  	}
  });

  return rvc;

});