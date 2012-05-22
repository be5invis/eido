var scope = exports.scope = {};
var hljs = require('hljs');
scope.detab = scope.detab4 = function(){
	var r = /([^\t\r\n]{4})|([^\t\r\n]{3})\t|([^\t\r\n]{2})\t|([^\t\r\n])\t|\t/g;
	var m = ['    ','   ','  ', ' ', ''];
	var f = function(_, $1, $2, $3, $4){
		return ($1 || $2 || $3 || $4 || '') + m[($1 || $2 || $3 || $4 || '').length]
	};
	return function(s){return s.replace(r, f)}
}()
scope.source = function(language, text){
	var r = '<pre class="mghl source ' + language + '">' + hljs(this.detab(text.trimRight()), language).value + '</pre>'
	return r;
}
scope.useLanguage = function(language, alias){
	this[language] = this['source-' + language] = function(s){return this.source(language, s)}
	if(alias){this[alias] = this['source-' + alias] = this[language]};
	return '';
}