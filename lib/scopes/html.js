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

function propesc(s) {
	return safe_tags_replace(s).replace(/"/g, '&quot;')
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
		r = this.h(h) + '\n' + r
	};
	this.__html_hlevel -= 1;
	return r + '\n';
}
htmlScope.section.nByref = 1;

htmlScope.wrapTag = function(tag, h, b){
	if(arguments.length === 2){
		b = h, h = ''
	};
	b = b || '', h = h || ''
	return this.__cons('<' + tag + ' ' + h + '>', b, '</' + tag +'>')
};
htmlScope['<'] = htmlScope.wrapTag;
htmlScope.defTag = function(tagName){
	this[tagName] = function(h, b){
		if(arguments.length > 1)
			return this.wrapTag(tagName, h, b)
		else
			return this.wrapTag(tagName, h)
	}
};
htmlScope.defPreTag = function(tagName){
	this[tagName] = function(h, b){
		if(arguments.length > 1)
			return this.wrapTag('pre', h, this.__lit(b))
		else
			return this.wrapTag('pre', this.__lit(h))
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
	return this.__cons('<' + tag + q + '>', s, '</' + tag + '>\n')
}
htmlScope._h = function(s){return this.h(s)};

htmlScope.tr = function(_args_){
	var classNames = this.colClasses || []
	var s = '';
	for(var i = 0; i < arguments.length; i++)
		s += this.__cons('<td class="' + propesc(classNames[i] || '') + '">', arguments[i], '</td>');
	return '<tr>' + s + '</tr>'
}
htmlScope.thr = function(_args_){
	var classNames = this.colClasses || []
	var s = '';
	for(var i = 0; i < arguments.length; i++)
		s += this.__cons('<th class="' + propesc(classNames[i] || '') + '">', arguments[i], '</th>');
	return '<tr>' + s + '</tr>'
}
htmlScope.table = function(h, b){
	if(!b) { b = h; h = '' }
	return this.wrapTag("table", h, this.dmexec__(b));
}
htmlScope.table.nByref = 1;
htmlScope.defColClasses = function(){
	this.colClasses = [].slice.call(arguments, 0)
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
