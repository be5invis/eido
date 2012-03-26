var tagsToReplace = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
};

function replaceTag(tag) {
    return tagsToReplace[tag] || tag;
}

function safe_tags_replace(str) {
    return str.replace(/[&<>]/g, replaceTag);
}

var htmlScope = {};
htmlScope.__lit = safe_tags_replace;
htmlScope._p = function(s){
	if(s){
		return '<p>' + s + '</p>\n'
	} else {
		return ''
	}
};
htmlScope.__html_hlevel = 1;
htmlScope.section = function(h, f){
	if(arguments.length < 2){
		f = h; h = ''
	};
	this.__html_hlevel += 1;
	var r = this.eval(f);
	if(h){
		r = this.h(h) + r
	};
	this.__html_hlevel -= 1;
	return r;
}
htmlScope.section.nByref = 1;

htmlScope.wrapTag = function(tag, h, b){
	if(arguments.length === 2){
		b = h, h = ''
	};
	return '<' + tag + ' ' + h + '>' + b + '</' + tag +'>'
};
htmlScope['<'] = htmlScope.wrapTag;
htmlScope.defTag = function(tagName){
	this[tagName] = function(h, b){
		if(arguments.length > 1)
			return this.wrapTag(tagName, h, b)
		else
			return this.wrapTag(tagName, h)
	}
}

htmlScope.h = function(q, s){
	if(!s){
		s = q;
		q = ''
	} else {
		q = ' ' + q
	}
	var tag = 'h' + this.__html_hlevel; 
	return '<' + tag + q + '>' + s + '</' + tag + '>\n'
}
htmlScope._h = function(s){return this.h(s)};

htmlScope.tr = function(_args_){
	var s = '';
	for(var i = 0; i < arguments.length; i++)
		s += '<td>' + arguments[i] + '</td>';
}
htmlScope.th = function(_args_){
	var s = '';
	for(var i = 0; i < arguments.length; i++)
		s += '<td>' + arguments[i] + '</td>';
}
htmlScope._ul = function(){
	var s = '';
	for(var i = 0; i < arguments.length; i++)
		s += arguments[i] + '\n'
	return '<ul>' + s + '</ul>'
}
htmlScope._li = function(s){
	return '<li>' + s + '</li>'
}
htmlScope.urlPath = function(s){
	return s.replace(/\\/g, '/')
}
htmlScope['@'] = function(address, text){
	if(!text) text = address;
	return '<a href="' + address + '">' + text + '</a>'
}

htmlScope['inline_`'] = function(s, num){
	return '<code>' + s + '</code>'
}
htmlScope['inline_*'] = function(s, num){
	if(num % 2 == 1){return '<em>' + s + '</em>'}
	else return '<strong>' + s + '</strong>'
}
htmlScope['inline_~'] = function(s, num){
	if(num % 2 == 1){return '<i>' + s + '</i>'}
	else return '<b>' + s + '</b>'
}
exports.scope = htmlScope
