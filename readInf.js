/*
	Space Marine Adventures 
	reading information from mapText 
	
	last edit: 16.07.2018
*/



/* trim string with tab and space symbols */
function comTrim(s) {
	var r = s;
	for (var i = 0; i < s.length; i++)
		if (s[i] == ' ' || s[i] == '\t') r = r.substring(1); else break;
	for (var i = s.length - 1; i >= 0; i--)
		if (s[i] == ' ' || s[i] == '\t') r = r.substring(0, r.length - 1); else break;	
	return r;
}

/* build string from array of strings */
function buildString(arr, jumper, first = 0, last = -1) {
	var r = '';
	if (last == -1) last = arr.length - 1;
	for (var i = first; i <= last; i++)
		r += (i != last) ? arr[i] + jumper : arr[i];
	return r;
}

/* fusion of objects */
function fusion(base, aux) {
	var R = new Object();
	var x = Object.keys(base);
	for (var i = 0; i < x.length; i++) 
		R[x[i]] = (typeof(aux[x[i]]) !== 'undefined') ? aux[x[i]] : base[x[i]];
	return R;
}

/* read section */
function readSection(text, section) {
	var notFound = true;
	var R = new Object();
	var lines = text.split('\n');
	var inSection = false;
	var inList = false;
	var line = '';
	for (var i = 0; i < lines.length; i++) {
		line = comTrim(lines[i]);
		// 0. Check In List
		if (line.endsWith('{') && !line.indexOf('=') >= 0) inList = true;
		if (line == '}') inList = false;
		if (inList) continue;
      // 1. Check Section
      if (line.toLowerCase().startsWith('[' + section.toLowerCase() + ']')) inSection = true;
      else if (line.toLowerCase().startsWith('[')) inSection = false;
      // 2. Check Section & Key
		else if (inSection && !line.startsWith('#') && line.indexOf('=') >= 0) {
			notFound = false;
			var rl = line.split('=');
			var key = comTrim(rl[0]);
			var value = comTrim(buildString(rl, '=', 1));
			R[key] = value;
		}
	}
	if (notFound) return false; else return R;
}

/* read value from text / [section] / key = */
function readValue(text, section, key, defaultValue) {
	var lines = text.split('\n');
	var inSection = false;
	var inList = false;
	var line = '';
	for (var i = 0; i < lines.length; i++) {
		line = comTrim(lines[i]);
		// 0. Check In List
		if (line.endsWith('{') && !line.indexOf('=') >= 0) inList = true;
      if (line == '}') inList = false;
      if (inList) continue;
      // 1. Check Section
      if (line.toLowerCase().startsWith('[' + section.toLowerCase() + ']')) inSection = true;
      else if (line.toLowerCase().startsWith('[')) inSection = false;
		// 2. Check Section & Key
		else if (inSection && line.toLowerCase().startsWith(key.toLowerCase())) {
			// 3. Check (key=)
			var rl = line.split('=');
			if (comTrim(rl[0]).toLowerCase() == key.toLowerCase())
				return comTrim(buildString(rl, '=', 1));
		}
	}
	if (typeof(defaultValue) !== 'undefined') return defaultValue; else return false;
}

function readBool(text, section, key, defaultValue) {
	var r = readValue(text, section, key);
	if (r === false) return defaultValue;
	return (['YES', 'TRUE', 'OK', 'OKAY', 'ON', '+'].includes(r.toUpperCase())) ? true : false;
}

function readInt(text, section, key, defaultValue) {
	return readValue(text, section, key, defaultValue) * 1.0;
}

/* read array of strings from text / [section] / key:{ .... } */
function readStrings(text, section, key) {
	var notFound = true;
	var R = new Array();
	var lines = text.split('\n');
	var inSection = false;
	var flag = false;
	var preflag = false;
	var line = '';
	for (var i = 0; i < lines.length; i++) {
		line = comTrim(lines[i]);
		if (line == "}") {
			flag = false;
			preflag = false;
		}
		if (inSection && flag) {
			R.push(lines[i]);
			notFound = false;
		}
		if (line.toLowerCase().startsWith('[' + section.toLowerCase() + ']')) inSection = true;
		else if (line.toLowerCase().startsWith('[')) inSection = false;
		if (inSection) {
			if (line.toLowerCase().startsWith(key.toLowerCase() + ':')) preflag = true;
			if (line.toLowerCase().startsWith(key.toLowerCase() + '{')) flag = true;
			if (line.toLowerCase().startsWith(key.toLowerCase() + ':{')) flag = true;
			if (line == '{' && preflag) flag = true;
		}
	}
	if (notFound) return false; else return R;
}