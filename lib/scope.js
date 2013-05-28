var transform = require('./processor').transform;
var GTransform = require('./processor').GTransform;
var fork = require('./processor').fork;
var LAZY_TAG = require('./processor').LAZY_TAG;

var getv = require('./processor').getv;
var setv = require('./processor').setv;
var createThunk = require('./processor').createThunk;

var scope = {};
var SLICE = [].slice;
var HAS = function(){
	var HOPF = Object.prototype.hasOwnProperty;
	return function(o, p){
		return HOPF.call(o, p)
	}
};

var lazy = function(g){
	Object.defineProperty(g, LAZY_TAG, {
		value: true,
		writable: false
	})
	return g;
}
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
scope.get = scope.getv = function(n){
	return this[n];
};
scope.def = scope.setv = function(name, definition){
	this[name] = definition;
};
scope.set = function(){
	if(arguments.length < 3){
		return this.setv.apply(this, arguments)
	} else {
		var x = arguments[0];
		for(var j = 1; j < arguments.length - 2; j++) x = this.part(x, arguments[j]);
		return this.setPart(x, arguments[arguments.length - 2], arguments[arguments.length - 1]);
	}
};
scope.def_ = lazy(function(name, definition){
	return this.setv(this.force(name), definition)
});
scope.set_ = scope.def_;
scope['\''] = function(node){return node};
scope.lambda = lazy(function(_args, definition){
	var e = this;
	var parameterNames = [];
	var functionIsLazy = false;
	var parameterIsLazy = [];
	for(var i = 0; i < arguments.length - 1; i += 1){
		parameterNames[i] = this.force(arguments[i]);
		if(/^delay[ \t]/.test(parameterNames[i])){
			parameterNames[i] = parameterNames[i].replace(/^delay\s+/, '');
			parameterIsLazy[i] = true;
			functionIsLazy = true;
		}
	};
	var definition = arguments[arguments.length - 1];

	var fCStatic = function(){
		var s = fork(e);
		for(var i = 0; i < parameterNames.length; i++){
			if(!functionIsLazy || parameterIsLazy[i]) {
				s[parameterNames[i]] = arguments[i]
			} else {
				s[parameterNames[i]] = s.force(arguments[i])
			}
		}
		return definition.apply(s, null, s)
	};
	var fCMod = function(){
		// Create two scopes
		var s = fork(this); // for arguments
		var q = fork(s);    // for variables
		for(var i = 0; i < parameterNames.length; i++){
			if(!functionIsLazy || parameterIsLazy[i])
				s[parameterNames[i]] = arguments[i]
			else
				s[parameterNames[i]] = s.force(arguments[i])
		}
		var r = definition.apply(q, null, q);

		// Write back to THIS
		for(var each in q) {
			if(HAS(q, each)) 
				this[each] = q[each];
		};
		return r;		
	}
	var f = function () {
		return fCStatic.apply(null, arguments)
	};
	// For functions defined by \lambda, \defun and \defun_lazy,
	// its apply property takes 3 arguments: thisp, args and scopeOverride
	f.apply = function(thisp, args, scopeOverride){
		if(scopeOverride){
			return fCMod.apply(scopeOverride, args)
		} else {
			return fCStatic.apply(null, args)
		}
	};
	f.GET_DEF_SCOPE = function(){return e};
	if(functionIsLazy) lazy(f);
	return f;
});
var validMC = function(clause){
	return !(!clause
		|| !clause[0]
		|| typeof(clause) === 'string'
		|| clause[0] === '__cons' 
		|| clause[0] === '__lit' 
		|| clause[0] === '__raw')
};
scope.define = lazy(function(clause, definition){
	if(    !clause.tree 
		|| !clause.apply 
		|| clause.apply.length !== 3 
		|| !validMC(clause.tree)) 
		throw "Wrong \\define pattern."
	var clauseTree = clause.tree;
	var marcoName = clauseTree[0];
	var s = this;
	var parameterNames = [];
	for(var j = 1; j < clauseTree.length; j++){
		if(validMC(clauseTree[j]) && clauseTree[j].length === 1) {
			// Pattern {\param}
			parameterNames[j] = (function(n){return function(){return n}})(clauseTree[j][0])
		} else if(clauseTree[j] && clauseTree[j][0] === '__cons' 
				&& clauseTree[j][1] && clauseTree[j][1][0] === '__lit' 
				&& (typeof(clauseTree[j][1][1]) === 'string') && /^(delay|delaied)\s+/.test(clauseTree[j][1][1])
				&& validMC(clauseTree[j][2]) && clauseTree[j][2].length === 1) {
			// Pattern {delay \param}
			parameterNames[j] = (function(n){return function(){return n}})('delay ' + clauseTree[j][2][0])
		} else {
			throw "\\define " + JSON.stringify(clauseTree) + " pattern not supported yet."
		}
	}
	setv(this, marcoName, this.lambda.apply(this, parameterNames.slice(1).concat([definition])))
});
scope.setf = lazy(function(pattern, definition){
	if(!pattern.tree || !pattern.apply || pattern.apply.length !== 3 || !validMC(pattern.tree) || pattern.tree.length !== 1)
		throw "Wrong \\setq Pattern";
	setv(this, pattern.tree[0], this.force(definition))
});
scope.defun = lazy(function(){
	setv(this, this.force(arguments[0]), this.lambda.apply(this, SLICE.call(arguments, 1)))
});
scope.defun_lazy = lazy(function(){
	setv(this, this.force(arguments[0]), lazy(this.lambda.apply(this, SLICE.call(arguments, 1))))
});
scope.defun_ = scope.defun_lazy;
scope.defun.lazy = scope.defun_lazy;



scope.lazy = function(f){
	return lazy(function(){return f.apply(this, arguments)});
};

scope.redefun = lazy(function(id, idp, definition){
	id = this.force(id);
	this[id] = this.cmod(this.lambda(idp, definition), this[id]);
});

scope.delay = lazy(function(f){return f});
scope.force = function(g){return g.call(this)};
scope.forcemod = function(g){return g.apply(this, [], this)};

scope.call = function(f){
	return f.apply(this, SLICE.call(arguments, 1))
};
scope.callenv = function(f, e){
	return f.apply(e, SLICE.call(arguments, 2), e)
};
scope.call_env = scope.callenv;
scope.call.inEnvironment = scope.callenv;
scope.cmod = function(f){
	return f.apply(this, SLICE.call(arguments, 1), this)
};
scope.call_modifer = scope.cmod;
scope.call.modifer = scope.cmod;

scope.getDefScope = function(f){
	return (f.GET_DEF_SCOPE ? f.GET_DEF_SCOPE() : this)
}
scope.part = function(o, m){
	return o[m]
};
scope.setPart = function(o, m, v){
	return o[m] = v;
};
scope.newHash = function(){return {}};
scope.void = scope.voidize = function(){return ''};

scope['if'] = lazy(function(condition, thenPart, elsePart){
	if(this.force(condition))
		return this.forcemod(thenPart);
	else if(elsePart)
		return this.forcemod(elsePart);
	else return;
})

scope['while'] = lazy(function(condition, body){
	while(this.force(condition))
		this.forcemod(body);
})

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
scope['.'] = function(){return ''}
scope[','] = function(){return ''}
scope['{'] = function(){return '{'}
scope['}'] = function(){return '}'}
scope['\\'] = function(){return '\\'}
scope[':'] = function(){return ':'}
scope['|'] = function(){return '|'}
scope['"'] = scope.__raw;
scope['_'] = scope.__cons;
scope['#'] = function(x){return String.fromCharCode(parseInt(x, 16))};
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
var util = require('util');
scope.consoleOut = function(s){
	console.log(s);
	return s;
};
scope.log = function(s){
	return process.stderr.write(s + '\n')
};
scope.trace = function(x){
	return this.log(util.inspect(x));
}
scope.fileOut = function(path, s){
	fs.writeFileSync(path, s, 'utf-8');
	return s;
};


scope.forkObj = function(o){
	return fork(o)
}
scope.dmexec__ = lazy(function(f){
	var s = fork(this);
	return s.forcemod(f);
});

scope.callDSL = function(f, ports){
	var s = fork(this.getDefScope(f));
	ports = ports || {};
	for(var property in ports) if(HAS(ports, property)){
		s[property] = ports[property];
	}
	return this.callenv(f, s);
};
scope.call.dsl = scope.callDSL;

scope.debugger = function(){
	debugger;
}

scope.runjs = function(source){
	return Function(source).call(this);
}

scope.currentScope = function(){return this}

exports.scope = scope;