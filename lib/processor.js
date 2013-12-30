var fork = function(o){return Object.create(o)};
var G_DEBUG = false;

function walk(r, s, fMatch, fGap){
	var l = r.lastIndex;
	r.lastIndex = 0;
	fMatch = fMatch || function(){};
	fGap = fGap || function(){};
	var match, last = 0;
	while(match = r.exec(s)){
		if(last < match.index) fGap(s.slice(last, match.index));
		fMatch.apply(this, match);
		last = r.lastIndex;
	};
	if(last < s.length) fGap(s.slice(last));
	r.lastIndex = l;
	return s;
};
var ttype = function(name){name = name || ''; return {toString: function(){return name}}};
var LIT = ttype('Lit');
var MARCO = ttype('Marco');
var LB = ttype('LB');
var RB = ttype('RB');
var PBR = ttype('PBR');
var FIN = ttype('FIN');

var Nulllit = function(){return {type: FIN}};

var composeRex = function(r, o){
	var source = r.source;
	var g = r.global;
	var i = r.ignoreCase;
	var m = r.multiline;
	source = source.replace(/#\w+/g, function(word){
		word = word.slice(1);
		if(o[word] instanceof RegExp) return o[word].source
		else return word
	});
	return new RegExp(source, (g ? 'g' : '') + (i ? 'i' : '') + (m ? 'm' : ''));
};

var MARCO = /(?:\??[\w\-]+|\??[\\'\[\]\(\)~!@#$%^&*\.\/<>;:"\{\}\|\-=_+][\w\-]*|,)/;
var INLINE = composeRex(
	/(\\ )|(\\#MARCO)|\{(=+)\{(.*?)\}\3\}|\{\{(.*?)\}\}|(\{\s*|\s*\}|\s*\|\s*)|(`+|\*+|~+)(.*?)\7/g,
	{MARCO: MARCO} );
var BLOCK_LEVEL = /^(::|\|\|)(.*)\n([\s\S]*)|^([:|])(.*)\n+((?:(?:\t|    ).*\n+)*)/gm;

function lexLine(s){
	var tokens = [];
	var n = 0;
	function push(t){ tokens[n++] = t };
	function concat(list){ tokens = tokens.concat(list); n += list.length}

	walk(INLINE, s,
		function(m, space, marco, _3, txt, txtb, bracket, _7, sourcely){
			if(space) push({type: LIT, text:'', raw: true})
			else if(marco) {
				if(marco != '\,')
				push({type: MARCO, text: marco.slice(1).trim()})
			} else if(bracket) {
				if(bracket.trim() === '|'){
					push({type: RB})
					push({type: LB})
				} else {
					push({type: bracket.trim() === '{' ? LB : RB})
				}
			} else if(txt || txtb) {
				push({type: LB});
				push({type: LIT, text: txt || txtb, raw: true});
				push({type: RB});
			} else if(_7) {
				var sourcelyChar = _7.charAt(0);
				push({type: MARCO, text: 'inline_' + sourcelyChar});
				push({type: LB});
				if(sourcelyChar === '`'){
					push({type: LIT, text: sourcely})
				} else {
					concat(lexLine(sourcely));
				};
				push({type: RB});
				push({type: LB});
				push({type: LIT, text: _7.length, raw: true})
				push({type: RB});
				push({type: FIN})
			}
		}, function(s){if(s) push({type: LIT, text: s})});

	return tokens;
};
//	console.log(tokens);
function parseLine(s){
	var tokens = lexLine(s);
	var i = 0, token = tokens[0];
	var TNULL = { type: null }
	function move(){ 
		i++; 
		token = tokens[i] || TNULL;
	};
	function block(){
		move();
		var b = parse();
		if(token.type !== RB) throw 'Parse error!'
		move();
		return b;
	};
	function call(){
		var h = token.text;
		var args = [];
		var f;
		move();
//		if(token.type === MARCO){
//			args.push(call())
//		} else {
			while (token.type === LB){
				args.push(block())
			}
//		}
		return [h].concat(args);
	};
	function parse(){
		var buff = [];
		while(token.type && token.type !== RB && token.type !== PBR)
			if(token.type === LIT){
				buff.push([token.raw? '__raw' : '__lit', token.text]);
				move();
			} else if(token.type === MARCO) {
				buff.push(call())
			} else if(token.type === LB) {
				buff.push(block())
			} else if(token.type === FIN){
				move()
			};
		if(buff.length > 1){
			buff.unshift('__cons')
		} else {
			buff = buff[0]
		};
		return buff;
	};

	return parse();
};

var FP_NOTHING = function(){};
function parseSource(text){
	var ans = [];

	walk(BLOCK_LEVEL, text,
		function(m, method, head, body, fMethod, fhead, fbody){
			method = method || fMethod
			head = (head || fhead || '').trim();
			if(!body){ 
				body = (fbody || '').replace(/^(?:\t|    )/gm, '')
			};

			if(head && !/^,/.test(head)){
				if(method === '|' || method === '||'){
					var headLits = parseLine('\\' + head);
					var bodyLits = ['__raw', body];
				} else {
					var headLits = parseLine('\\' + head);
					var bodyLits = parseSource(body);
				}
				if(bodyLits){
					ans.push(headLits.concat([bodyLits]))
				} else {
					ans.push(headLits)
				}
			} else {
				// Headless block
				if(method === '|' || method === '||'){
					var bodyLits = ['__raw', body];
				} else {
					var bodyLits = parseSource(body);
				};
				if(ans.length && bodyLits)
					ans[ans.length - 1].push(bodyLits);
			}

		},
		function(s){
			var splits = formParas(s);
			if(splits) ans = ans.concat(splits);
		});

	if(ans.length > 1)
		ans.unshift('__cons');
	else {
		ans = ans[0];
		if(ans && ans[0] === '_p')
			ans = ans[1];
	}
	
	return ans;
};

function formParas(p){
	if(!p) return null;

	var t = [];

	p = p.replace(/^((?:-.*(?:\n+(?:\t| {2,}).*)*\n)+)|^((?:#.*(?:\n+(?:\t| {2,}).*)*\n)+)|((?:[^:\n\t\-#].*\n)+)/gm, 
		function(m, ul, ol, para){
			if(ul || ol) {
				var list = ul || ol;
				var a = list.split(/^ {0,2}[-#]\s*/m);
				var m = [ul ? '_ul' : '_ol']
				for(var i = 0; i < a.length; i++){
					var term = a[i];
					if(term){
						m.push(['_li', parseSource(term.replace(/^(?:\t|    )/gm, ''))]);
					}
				};
			} else if(para){
				var m = ['_p', parseLine(para.trim())]
			}
			t.push(m);
			return '';
		});

	return t;
};

function createThunk(tree, scope){
	var f = createFnThunk(function(){return this.__transform(tree)}, scope)
	f.tree = tree;
	return f;
};
function createFnThunk(fn, scope){
	var f = function(){
		var s = fork(scope);
		return fn.apply(s, null, s);
	};
	f.apply = function(t, a, o){
		if(o) return fn.apply(o, null, o)
		else return f();
	};
	f.scope = scope;
	if(fn.tree) f.tree = fn.tree;
	return f;	
};

var treeSerialize = function(){
	var f = function(tree, depth){
		if(tree instanceof Array){
			if(tree[0] === '__lit') 
				return tree[1];
			if(tree[0] === '__cons') 
				return tree.slice(1).map(function(s){return f(s, depth - 1)}).join('');
			if(depth <= 0) return '...';
			return '\\' + tree[0] + (tree.length > 1 ? '{' + tree.slice(1).map(function(s){return f(s, depth - 1)}).join('}{') + '}' : '')
		} else {
			return tree;
		}
	};
	return function(tree){
		return f(tree, 2);
	}
}();

// Call by value
function GTransform(g){
	var f = function(tree){
		if(!Array.isArray(tree)) return tree;
		if(G_DEBUG && tree[0] !== '__cons'){
			try {
				return g.call(this, tree, f);
			} catch(ex) {
				process.stderr.write('Call error in: ' + treeSerialize(tree) + "\n");
				throw ex;
			}
		} else {
			return g.call(this, tree, f);
		}
	}
	return f;
}
var getv = function(f, name){
	if(!/^\w/.test(name)){
		return f[name]
	} else {
		var idSegments = name.split('-');
		for(var i = 0; f && i < idSegments.length; i++){
			f = f[idSegments[i]]
			if(f === undefined) return f;
		}
		return f;
	}
};
var setv = function(f, name, val){
	if(!/^\w/.test(name)){
		return (f[name] = val)
	} else {
		var idSegments = name.split('-');
		for(var i = 0; f && i < idSegments.length - 1; i++){
			if(!(idSegments[i] in f)) {
				f = f[idSegments[i]] = {};
			} else {
				f = f[idSegments[i]]
			}
		}
		return (f[idSegments[idSegments.length - 1]] = val);
	}	
}
var LAZY_TAG = '##LAZY_Q##';
var transform = GTransform(function(tree, recurse){
	if(tree[0] === '\''){
		return tree[1];
	};
	if(tree[0].charAt(0) === '?') {
		// An variable quotation
		if(tree.length === 1) return getv(this, tree[0].slice(1))
		else throw "Invalid \\? pattern: Cannot pass arguments into variable quoting."
	}
	var f = getv(this, tree[0])
	if(typeof f === 'function'){
		var args = tree.slice(1);
		if(f[LAZY_TAG]){
			for(var i = 0; i < args.length; i++)
				args[i] = createThunk(args[i], this)
		} else {
			for(var i = 0; i < args.length; i++)
				args[i] = recurse.call(this, args[i], recurse);
		};
		return f.apply(this, args)
	} else {
		if(tree.length > 1)
			throw "Unable to call \\" + tree[0] + " . It is not a function."
		else
			return f || ''
	};
});

exports.fork = fork;
exports.parse = parseSource;
exports.transform = transform;
exports.GTransform = GTransform;
exports.getv = getv;
exports.setv = setv;
exports.LAZY_TAG = LAZY_TAG;
exports.createThunk = createThunk;
exports.createFnThunk = createFnThunk;
exports.setDebug = function(f){
	G_DEBUG = f;
}