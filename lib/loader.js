var parse = require('./processor').parse;
var fs = require('fs');

var loader = module;

function parseFile(file){
	var source = fs.readFileSync(file, 'utf-8')
	source = source.replace(/\r\n/g, '\n');
	var ast = parse('\n\n' + source + '\n\n');
	return ast;
};
require.extensions['.ed'] = function(module, filename){
	var ast = parseFile(filename);
	module.exports.apply = function(){
		return this.__transform(ast);
	}
}

var scope = require('./scope').scope;

scope.usePackage = function(id){
	var pack = loader.require(id);
	if(!pack || typeof pack.apply !== 'function'){
		throw "Invalid package " + id;
	}
	return pack.apply.call(this)
}
scope.input = function(file){
	var ast = parseFile(file);
	this.__transform(ast);
	return '';
};

exports.scope = scope;