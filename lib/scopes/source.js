var scope = exports.scope = {};
var hl = require('hljs/highlight').rawHighlight;

scope.langdef_ = function(lang){
	if(/^(\w+)\s*=\s*(\w+)$/.test(lang)){
		var alias = RegExp.$1, language = RegExp.$2
	} else {
		var alias = lang, language = lang
	};
	var tf = function(s){ 
		return '<pre class="mghl source ' + language + '">' 
			+ hl(s, '    ', false, language).replace(/\s+$/, '') 
			+ '</pre>'
	};
	this[alias] = tf;
	this['source-' + alias] = tf;
	this['code-' + alias] = tf;
}