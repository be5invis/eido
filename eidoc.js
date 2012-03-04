var gscope = require('scope').scope;
var processor = require('processor');
var fork = processor.fork;
var parse = processor.parse;
var path = require('path');
var fs = require('fs')

var scope = fork(gscope);

// These functions are compilation-specific.
scope.consoleOut = function(s){
	console.log(s);
	return s;
};
scope.fileOut = function(path, s){
	fs.writeFileSync(path, s, 'utf-8');
	return s;
};
scope.input = function(file){
	var ast = parseFile(file);
	this.__transform(ast);
	return '';
};
scope.dirName = path.dirname;
scope.execPath = process.argv[1];
scope.inputPath = path.normalize(process.argv[2]);
scope.getRelativePath = path.relative;
scope.getAbsolutePath = path.resolce;
scope.pathNoExt = function(s){return s.replace(/\.\w+$/, '')}

function parseFile(file){
	var source = fs.readFileSync(file, 'utf-8')
	source = source.replace(/\r\n/g, '\n');
	var ast = parse('\n\n' + source + '\n\n');
	return ast;
};

var workingScope = fork(scope);
workingScope.workingScope = workingScope;
var cwd = path.dirname(scope.inputPath);
do {
	if(path.existsSync(path.join(cwd, '.common/default.ed'))){
		workingScope.__transform(parseFile(path.join(cwd, '.common/default.ed')));
		scope.cwd = cwd;
		break;
	}
} while(cwd !== (cwd = path.join(cwd, '..')));
workingScope.__transform(parseFile(process.argv[2]));
