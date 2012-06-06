var transform = require('./processor').transform;
var GTransform = require('./processor').GTransform;
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
	f.GET_DEF_SCOPE = function(){return e};

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
scope.modifer = function(f){
	var g = function(){
		return this.callcc.apply(this, [f].concat(SLICE.call(arguments, 0)))
	};
	g.nByref = f.nByref;
	return g;
}
scope.lambda.nByref = scope.defun.nByref = scope.defun_.nByref = 1;
scope.redefun = function(id, idp, definition){
	this[id] = this.callcc(this.lambda(idp, definition), this[id]);
};
scope.redefun.nByref = 1;

scope.call = function(f){
	return (f).apply(this, SLICE.call(arguments, 1))
};
scope.callcc = function(f){
	return (f.CALLCC || f).apply(this, SLICE.call(arguments, 1))
};
scope.getDefScope = function(f){
	return (f.GET_DEF_SCOPE ? f.GET_DEF_SCOPE() : this)
}
scope.callenv = function(f, e){
	return (f.CALLCC || f).apply(e, SLICE.call(arguments, 2))
};
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
	if(arguments.length < 3){
		condition = this.callcc(condition)
	};
	if(condition)
		return this.callcc(thenPart);
	else if(elsePart)
		return this.callcc(elsePart);
	else return '';
}
scope['if'].nByref = 2;
scope.or = function(){
	for(var j = 0; j < arguments.length; j++) if(arguments[j]) return arguments[j]
	return false
}
scope.and = function(p, q){
	for(var j = 0; j < arguments.length; j++) if(!arguments[j]) return false
	return true
}
scope.not = function(p){return !p}

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
scope['_'] = scope.__cons;
scope['+'] = function(a, b){return a + b};
scope['-'] = function(a, b){return a - b};
scope['*'] = function(a, b){return a * b};
scope['/'] = function(a, b){return a / b};
scope['%'] = function(a, b){return a % b};
scope.num = function(s){return s - 0}
scope.eqq = function(a, b){return a === b}
scope.neq = function(a, b){return a !== b}
scope.eq  = function(a, b){return a == b}
scope.ne  = function(a, b){return a != b}
scope.lt = function(a, b){return a < b}
scope.gt = function(a, b){return a > b}
scope.lte = function(a, b){return a <= b}
scope.gte = function(a, b){return a >= b}
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
		this.log(e);
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



scope.dmexec__ = function(f){
	var s = fork(this);
	return s.callcc(f);
};
scope.dmexec__.nByref = 1;

scope.callDSL = function(f){
	var s = this.getDefScope(f);
	return this.callenv(f, fork(s));
}

scope.debugger = function(){
	debugger;
}

exports.scope = scope;