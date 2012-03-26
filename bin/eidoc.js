var processor = require('../lib/processor');
var fork = processor.fork;
var gscope = require('../lib/scope').scope;
var path = require('path');
var fs = require('fs')

var scope = fork(gscope);

// These functions are compilation-specific.
scope.dirName = path.dirname;
scope.execPath = path.resolve(process.argv[1]);
scope.inputPath = path.normalize(process.argv[2]);
scope.normalizePath = path.normalize;
scope.getRelativePath = path.relative;
scope.getAbsolutePath = path.resolce;
scope.pathNoExt = function(s){return s.replace(/\.\w+$/, '')}

var workingScope = fork(scope);
workingScope.workingScope = workingScope;
var cwd = path.dirname(scope.inputPath);
do {
	if(path.existsSync(path.resolve(cwd, '.common/default.ed'))){
		workingScope.input(path.resolve(cwd, '.common/default.ed'));
		scope.cwd = cwd;
		break;
	};
} while(cwd !== (cwd = path.resolve(cwd, '..')));
workingScope.input(process.argv[2]);
