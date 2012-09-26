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

var lazy = function(g){
	Object.defineProperty(g, 'lazy', {
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
scope.__block = function(body){ return body }
scope.def = function(name, definition){
	this[name] = definition;
	return '';
};
scope.def_ = lazy(function(name, definition){
	this[this.force(name)] = definition;
	return '';
});
scope['\''] = function(node){return node};
scope.lambda = lazy(function(_args, definition){
	var e = this;
	var arglist = [];
	for(var i = 0; i < arguments.length - 1; i += 1){
		arglist[i] = this.force(arguments[i]);
	};
	var definition = arguments[arguments.length - 1].CMOD;

	var f = function(){
		var s = fork(e);
		for(var i = 0; i < arglist.length; i++){
			s[arglist[i]] = arguments[i]
		}
		return definition.call(s)
	};
	f.CMOD = function(){
		// Create two scopes
		var s = fork(this); // for arguments
		var q = fork(s);    // for variables
		for(var i = 0; i < arglist.length; i++){
			s[arglist[i]] = arguments[i]
		}
		var r = definition.call(q);

		// Write back to THIS
		for(var each in q) {
			if(HAS(q, each)) 
				this[each] = q[each];
		};
		return r;
	};
	f.GET_DEF_SCOPE = function(){return e};

	return f;
});
scope.defun = lazy(function(){
	return this.def(this.force(arguments[0]), this.lambda.apply(this, SLICE.call(arguments, 1)))
});
scope.defun_ = lazy(function(){
	return this.def(this.force(arguments[0]), lazy(this.lambda.apply(this, SLICE.call(arguments, 1))))
});

scope.modifer = function(f){
	var g;
	if(f.CMOD){
		g = f.CMOD;
	} else {
		g = function(){
			return this.cmod.apply(this, [f].concat(SLICE.call(arguments, 0)))
		};
	};
	if(f.lazy) g = lazy(g);
	return g;
};

scope.lazy = function(f){
	return lazy(function(){return f.apply(this, arguments)});
};

scope.redefun = lazy(function(id, idp, definition){
	id = this.force(id);
	this[id] = this.cmod(this.lambda(idp, definition), this[id]);
});

scope.delay = lazy(function(f){return f});
scope.force = function(g){return g.call(this)};
scope.forcemod = function(g){return (g.CMOD || g).call(this)};

scope.call = function(f){
	return (f).apply(this, SLICE.call(arguments, 1))
};
scope.callenv = function(f, e){
	return (f.CMOD || f).apply(e, SLICE.call(arguments, 2))
};
scope.cmod = function(f){
	return (f.CMOD || f).apply(this, SLICE.call(arguments, 1))
};

scope.getDefScope = function(f){
	return (f.GET_DEF_SCOPE ? f.GET_DEF_SCOPE() : this)
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
scope.voidize = function(){return ''};

scope['if'] = lazy(function(condition, thenPart, elsePart){
	if(this.force(condition))
		return this.forcemod(thenPart);
	else if(elsePart)
		return this.forcemod(elsePart);
	else return;
})

scope['while'] = lazy(function(condition, body){
	while(this.force(condition))
		this.force(body);
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



scope.dmexec__ = lazy(function(f){
	var s = fork(this);
	return s.forcemod(f);
});

scope.callDSL = function(f){
	var s = this.getDefScope(f);
	return this.callenv(f, fork(s));
}

scope.debugger = function(){
	debugger;
}

scope.runjs = function(source){
	return Function(source).call(this);
}

exports.scope = scope;