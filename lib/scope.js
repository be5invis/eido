var transform = require('./processor').transform;
var GTransform = require('./processor').GTransform;
var parse = require('./processor').parse;
var fork = require('./processor').fork;

var scope = {};
var SLICE = [].slice;
var HAS = function(){
	var HOPF = Object.prototype.hasOwnProperty;
	return function(o, p){
		return HOPF.call(o, p)
	}
};
debugger;
scope.__lit = function(s){ return s }
scope.__raw = function(s){ return s }
scope.__cons = function(){
	var buff = '';
	for(var i = 0; i < arguments.length; i++) {
		var tf = arguments[i];
		if(tf != undefined) buff += tf;
	}
	return buff;
};
scope.__block = function(body){ return body }
scope.def = function(name, definition){
	this[name] = definition;
	return '';
};
scope.def_ = function(name, definition){
	this[name] = definition;
	return '';
};
scope.def_.nByref = 1;
scope['\''] = function(node){return node};
scope.eval = function(node){
	return this.__transform(node)
};
scope['do'] = function(node){
	if(typeof node === 'function'){
		return node.call(this)
	} else {
		return this.eval(node)
	}
};
scope.lambda = function(_args, definition){
	var e = this;
	var arglist = [];
	var c = function(){
		for(var i = 0; i < arglist.length; i++){
			this[arglist[i]] = arguments[i]
		}
		return definition.call(this)
	};
	for(var i = 0; i < arguments.length - 1; i += 1){
		arglist[i] = arguments[i];
	};
	var definition = arguments[arguments.length - 1].CALLCC;

	var f = function(){
		return c.apply(fork(e), arguments)
	};
	f.CALLCC = c;

	return f;
};
scope.defun = function(){
	return this.def(arguments[0], this.lambda.apply(this, SLICE.call(arguments, 1)))
};
scope.defun_ = function(){
	var l = this.lambda.apply(this, SLICE.call(arguments, 1));
	l.nByref = 1;
	return this.def(arguments[0], l)
};
scope.lambda.nByref = scope.defun.nByref = scope.defun_.nByref = 1;

scope.call = function(){
	return (arguments[0]).apply(this, SLICE.call(arguments, 1))
};
scope.callcc = function(f){
	return (f.CALLCC || f).apply(this, SLICE.call(arguments, 1))
};
scope.callenv = function(f, e){
	return (f.CALLCC || f).apply(e, SLICE.call(arguments, 2))
}
scope.get = function(n){
	return this[n]
};
scope.part = function(o, m){
	return o[m]
};
scope.setPart = function(o, m, v){
	return o[m] = v;
};
scope.newHash = function(){return {}};
scope.voidize = function(){return ''}
scope['if'] = function(condition, thenPart, elsePart){
	if(condition)
		return thenPart.call(this);
	else if(elsePart)
		return elsePart.call(this);
	else return '';
}
scope['if'].nByref = 2;
scope.or = function(p, q){
	return p || q
}

scope['~'] = function(){return '~'}
scope['*'] = function(){return '*'}
scope['`'] = function(){return '`'}
scope['.'] = function(){return ' '}
scope['{'] = function(){return '{'}
scope['}'] = function(){return '}'}
scope['\\'] = function(){return '\\'}
scope[':'] = function(){return ':'}
scope['|'] = function(){return '|'}
scope['"'] = scope.__raw;
scope['#'] = scope.__lit;
scope['+'] = scope.__cons;
scope.n = scope.__newline = function(){return '\n'}
scope.t = scope.__tab = function(){return '\t'}
scope['true'] = function(){return true}
scope['false'] = function(){return false}

scope.list = function(){
	return SLICE.call(arguments, 0)
}
scope.map = function(a, f){
	return a.map(f.bind(this))
}
scope.cons = function(a){
	return this.__cons.apply(this, a)
}

scope._p = function(s){return s}

scope.count = function(){
	var n = 0;
	return function(){return '' + ++n}
}();

scope.__transform = transform;

scope.__merge = function(m){
	for(var each in m)
		if(HAS(m, each))
			this[each] = m[each];
	return ''
};
scope.__jsRequire = function(m){
	try {
		var r = require(path.normalize(m));
		return r
	} catch (e) {
		this.log('!! Unable to require JS module ' + m);
		return {};
	}
};

scope._gsub = function(pattern, flags, replacement, s){
	return s.replace(new RegExp(pattern, flags), replacement)
}

var fs = require('fs');
var path = require('path');
scope.consoleOut = function(s){
	console.log(s);
	return s;
};
scope.log = function(s){
	return process.stderr.write(s + '\n')
}
scope.fileOut = function(path, s){
	fs.writeFileSync(path, s, 'utf-8');
	return s;
};
function parseFile(file){
	var source = fs.readFileSync(file, 'utf-8')
	source = source.replace(/\r\n/g, '\n');
	var ast = parse('\n\n' + source + '\n\n');
	return ast;
};
scope.input = function(file){
	var ast = parseFile(file);
	this.__transform(ast);
	return '';
};
scope.useInternalPackage = function(name){
	this.input(path.resolve(path.dirname(module.filename), 'marcos', name + '.ed'))
};
scope.usePackage = function(name){
	this.input(name + '.ed')
};
scope.dmexec__ = function(f){
	var s = fork(this);
	return f.call(s);
};
scope.dmexec__.nByref = 1;


exports.scope = scope;