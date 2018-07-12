/*
	Space Marine Adventures v 1.2 Alpha
		© 2018 onyokneesdog
	
	last edit: 10.07.2018
	
	>> >> >>
	Contents:
		00. HERO
		01. MAP
		02. KEYBOARD
		03. START
*/

class Point {
	constructor (x, y) {
		this.x = x;
		this.y = y;
	}
}

class Rect {
	constructor (x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}
	
	get left() { return this.x }
	
	get top() { return this.y }
	
	get width() { return this.w }
	
	get height() { return this.h }
	
	get right() { return this.x + this.w }
	
	get bottom() {	return this.y + this.h	}
	
	isCrossWith(r, dx = 0, dy = 0) {
		if (this.left <= r.right + dx && this.right >= r.left + dx && this.top <= r.bottom && this.bottom >= r.top ) return true;
		return false;			
	}	
}

 

/* >> 00. HERO >> >> */

// ENUM for buttons
var btn = Object.freeze({"left": 0, "right": 1, "down": 2, "up": 3, "jump": 4, "atack": 5});
var act = Object.freeze({"stop": 0, "run": 1, "crawling": 2, "jump": 3, "slipping": 4, "climbing": 5, "dash": 6 });
var n = 0;

class Hero {

	constructor (name, w = 32, h = 32) {
		this.name = name;
		this.inventory = '';
		this.life = 0;
		this.effects = '';
		this.R = new Rect(0, 0, w, h);
		this.controls = new Array(0, 0, 0, 0, 0, 0);
		this.action = act.stop;
		this.direction = 1;
		this.jumpTimer = 0;
		this.prevSprite = -1;
		this.inertia = 0;
		
		/* Hero pictures */
		this.pics = new Array(
			"heroLeftCrawling0.gif",
			"heroLeftCrawling1.gif",
			"heroLeftJump.gif",
			"heroLeftRun0.gif",
			"heroLeftRun1.gif",
			"heroLeftStop.gif",
			"heroRightCrawling0.gif",
			"heroRightCrawling1.gif",
			"heroRightJump.gif",
			"heroRightRun0.gif",
			"heroRightRun1.gif",
			"heroRightStop.gif"
		);
	}
	
	movement(map) {		
		/* Save direction */
		if (this.controls[btn.left]) this.direction = -1;
		if (this.controls[btn.right]) this.direction = 1;
		
		/* Lead-up */
		var dx = map.Ph.run; // possible horizontal move
		dx = dx * (this.controls[btn.right] - this.controls[btn.left]);
		var inAir = false;
		var m = Math.floor((this.R.x - map.P.x + this.R.w / 2) / map.cellWidth); // horizontal index for middle of hero body
		var mx = (this.R.x - map.P.x + this.R.w / 2) - m * map.cellWidth; // distinction beetween left index and middle px
		var left = Math.floor((this.R.x - map.P.x + 3) / map.cellWidth); // horizontal index for left side of hero
		var right = Math.floor((this.R.x - map.P.x + this.R.w - 3) / map.cellWidth); // horizontal index for right side of hero
		var head = Math.floor((this.R.y - map.P.y) / map.cellHeight); // vertical index for the head of hero
		var legs = Math.floor((this.R.y - map.P.y + this.R.h - 1) / map.cellHeight); //vertical index for the legs of hero
		var legsPx = this.R.y + this.R.h; // bottom of hero in pixels
		
		var slFix = Math.floor((this.R.y - map.P.y + this.R.h + map.Ph.slipping) / map.cellHeight); 
				// * Specially for slipping 
				// (using legs is not correct between the blocks)
		
		/* Get floor */
		var floorName = 'air'; 
		var floor = map.pass.length; // floor vertical index
		for (var	i = legs; i < map.pass.length; i++)
			if (map.pass[i][m] == 1) {	
				floor = i; 
				floorName = 'flat'; 
				break; 
			} else if (map.pass[i][m] == 2) { 
				floor = i + mx / map.cellHeight; 
				floorName = 'downhill'; 
				break; 
			} else if (map.pass[i][m] == 3) { 
				floor = i + (1 - mx / map.cellHeight); 
				floorName = 'uphill'; 
				break; 
			}
		var floorPx = floor * map.cellHeight; // floor in pixels (Y)
		
		/* Get ceil */
		var ceil = -1; // ceil vertical index
		for (var	i = head; i >= 0; i--)
			if (map.pass[i][m]) { 
				ceil = i; 
				break; 
			}
		var ceilPx = (ceil + 1) * map.cellHeight; // ceil in pixels (Y)	
		
		/* debug */
		map.debugIns('Hero: ' + this.R.x + ':' + this.R.y + ' | Map: ' + map.P.x + ':' + map.P.y, 0);
		map.debugIns('Floor: ' + floorName + ' / ' + floorPx + ' | Ceil: ' + ceilPx, 1);
		
		/* Slipping */
		if ((map.pass[slFix][m] == 2 || map.pass[slFix][m] == 3) && !(this.controls[btn.left] + this.controls[btn.right])) {
			if (map.pass[slFix][m] == 2) dx = map.Ph.slipping;
			if (map.pass[slFix][m] == 3) dx = -1 * map.Ph.slipping;
			// specially for this situation: ><
			let z = map.pass[slFix][Math.floor((this.R.x - map.P.x + this.R.w / 2 + dx) / map.cellWidth)];
			if ((z == 2 || z == 3) && z != map.pass[slFix][m]) dx = 0; 
			// inertia fixing some bugs between the blocks
			this.inertia = dx;
		}
		
		/* on the ground */
		if (legsPx == floorPx) {
			map.debugIns(' >> ground >>', 2); //debug
		/* in Air */
		} else if (legsPx < floorPx) {
			inAir = true;
			map.debugIns(' >> air >>', 2); //debug
			// JUMP
			if (this.jumpTimer > 0)	{
				this.jumpTimer--;
				if (this.R.y + map.Ph.jumpPower < ceilPx) {
					this.R.y = ceilPx;
					this.jumpTimer = 0;
				} else 
					this.R.y += map.Ph.jumpPower;
			// FALLING (or slipping)
			} else {
				this.R.y += map.Ph.gravity;
				if (this.R.y + this.R.h > floorPx) this.R.y = floorPx - this.R.h; // FIX to the ground
			}
		}
		
		/* Jump start */
		if (this.R.y + map.Ph.jumpPower - 3 > ceilPx && this.controls[btn.up]) {
			if (legsPx == floorPx) {
				this.R.y -= 3;
				this.jumpTimer = map.Ph.jumpLength;
			}
			else if ((map.pass[legs][m] == 2 || map.pass[legs][m] == 3) && legsPx >= floorPx - map.Ph.run) {
				this.R.y -= 3;
				this.jumpTimer = map.Ph.jumpLength;
			}
		}
		
		/* Inertia */
		// * using only for slipping in this version
		if (dx == 0) {
			dx = this.inertia;
			this.inertia = 0;
		}
		
		/* Crawling */
		if (!inAir && this.controls[btn.down] && !(map.pass[legs][m] == 2 || map.pass[legs][m] == 3))
			dx = map.Ph.crawling * (this.controls[btn.right] - this.controls[btn.left]);
		
		/* Check horizontal barriers*/
		if ((map.pass[head][left] || map.pass[legs][left] == 1 || left < 0) && dx < 0) dx = 0;
		if ((map.pass[head][right] || map.pass[legs][right] == 1 || right > map.pass[0].length - 1) && dx > 0) dx = 0;	
		
		/* Climbing */
		// * it's must be after checking h-barriers
		if ((map.pass[legs][left] == 2 || map.pass[legs][m] == 2) && this.controls[btn.left]) {
			dx = -1 * map.Ph.climbing;
			this.R.y -= map.Ph.climbing;
		}
		if ((map.pass[legs][right] == 3 || map.pass[legs][m] == 3) && this.controls[btn.right]) {
			dx = map.Ph.climbing;
			this.R.y -= map.Ph.climbing;
		}
		
		/* Final accept DX to Hero or Map position */
		if (dx > 0 && this.R.x + dx < map.heroView || dx < 0 && this.R.x + dx > map.heroView) {
			this.R.x += dx;
		} else if (map.P.x - dx <= 0 && map.P.x - dx >= (map.width - screenWidth) * -1 && !map.screenFrozen) {
			map.P.x -= dx;
			document.getElementById("deep-space").style.left = map.P.x + 'px';
			map.drawEntity();
		} else {
			this.R.x += dx;
		}
		
		/* Critical check*/
		if (this.R.y + this.R.h > floorPx) this.R.y = floorPx - this.R.h; // FIX to the ground
		
		/* Set action */
		if (inAir && (this.controls[btn.left] + this.controls[btn.right]) && (map.pass[legs][m] == 2 || map.pass[legs][m] == 3)) this.action = act.climbing;
		else if (inAir && (map.pass[slFix][m] == 2 || map.pass[slFix][m] == 3)) this.action = act.slipping;		
		else if (this.R.y + this.R.h < floorPx - 10) this.action = act.jump;
		else if (this.controls[btn.down] && !(map.pass[legs][m] == 2 || map.pass[legs][m] == 3)) this.action = act.crawling;
		else if (dx != 0) this.action = act.run;
		else this.action = act.stop;
		
		/* Draw sprite */
		n = (dx) ? 1 - n : 0;
		switch (this.action) {
			case act.stop: 
				this.draw((this.direction > 0) ? 11 : 5); break; 
			case act.crawling: 
				this.draw((this.direction > 0) ? 6 + n : 0 + n); break; 
			case act.run:  
			case act.climbing:
				this.draw((this.direction > 0) ? 9 + n : 3 + n); break; 
			case act.slipping:
				this.draw((this.direction > 0) ? 9 : 3); break; 
			case act.jump: 
				this.draw((this.direction > 0) ? 8 : 2); break; 
		}
	}
	
	loadSprites(y) {
		//sprites should be loaded in the invisible part
		document.write('<div id="heroSprites" style="position: absolute; top: ' + y + 'px; left: 0px; z-index: 0">');
		for (var i = 0; i < this.pics.length; i++) 
			document.write('<img src="hero/' + this.pics[i] + '" width=' + this.R.width + ' height=' + this.R.height + '>');
		document.write('</div>');
	}
	
	clearControls() {
		for (var i = 0; i < this.controls.length; i++)
			this.controls[i] = 0;
	}
	
	draw (n) {
		var en = document.getElementById('hero');
		if (en == null) {
			en = document.createElement('img');
			en.id = 'hero';
			en.width = this.R.width;
			en.height = this.R.height;
			//en.className = 'marine';
			document.body.appendChild(en);
		}
		if (this.prevSprite != n)
			en.src = 'hero/' + this.pics[n];
		en.style.left = this.R.left + 'px'; 
		en.style.top = this.R.top + 'px';
		this.prevSprite = n;
	}
}



/* >> 01. MAP >> >> */

class Entity {
	constructor (x, y, n) {
		this.x = x;
		this.y = y;
		this.n = n;
	}
}

class Physics {
	constructor (g = 10, jP = -5, jL = 11, c = 3, r = 6, cl = 3, sl = 2) {
		this.gravity = g; 			// X px per timer-period in falling
		this.jumpPower = jP;			// X px in lift
		this.jumpLength = jL; 		// Jump period in timer-periods
											// *Full height of jump = jumpPower * jumpTimer + 3. 
		this.crawling = c;			// X px in crawling step
		this.run = r;					// X px in run step
		this.climbing = cl;			// X px in climbing
		this.slipping = sl;			// X px in slipping
	}
}

class Map {
	
	constructor (planet = 'jupiter', background = 'space.jpg', debug = false) {
		this.planet = planet;
		this.bg = background;
		this.dbg = debug;
		
		this.cellWidth = 32;
		this.cellHeight = 32;
		this.heroView = 250; 
		
		/* Landscape pictures */
		this.scape = new Array(
			"air.gif", 				// space
			"chasm.gif", 			// ^
			"downhill.gif", 		// >
			"mid.gif",				// #
			"slit.gif", 			// _
			"surface.gif", 		// =
			"uphill.gif"			// <
		);
		this.scapeTranslation = ' ^>#_=<';
		
		/* Entity pictures */
		this.look = new Array(
			"dropship.gif",					// D
			"gravityCanon.gif",				// J
			"gravityCanonExtended.gif",	// j
			"warpGate.gif",					// W
			"flagBlue.gif",					// B
			"flagRed.gif",						// R
			"fall.gif",							// F
			"gun.gif",							// G
			"armory.gif",						// A
			"stimpack.gif"						// S
		);
		this.lookTranslation = 'DJJWBRFGAS';
		this.entity = new Array();
		
		this.passability = 'H D^JWBRGAS';
		
		/* Default Map structure */
		// *H is for hero start point
		// *R is for finish
		
		//easy & simple for now
		this.structure = new Array(
			"____________________________________________________________",
			"D                                                           ",
			"                                                            ",
			"                                                            ",
			"                                                            ",
			"                                                            ",
			"                                                           R",
			"                                                          ==",
			"                                                          ##",
			" =                                                     =  ##",
			"H                                                         ##",
			"==>   <>          =                                 =     ##",
			"###> <##>         #        <=                 ==          ##",
			"####=####^^^=^^^=^#^^^===^^##^^^==^^^==^^^=^=^##^=^^^^^^^^##"
		);
		
		var newDebugStructure = new Array(
			"____________________________________________________________",
			"D                                                           ",
			"                                                            ",
			"                                                            ",
			"                                                            ",
			"                                                            ",
			"                  =                                       R ",
			"                  #                                       ==",
			"                  #                                       ##",
			"                  #                                    FF ##",
			"H                 #                                       ##",
			"======>           #                                FFF    ##",
			"#######>        J #        <=   J             FF          ##",
			"########=^^^=^^^=^#^^^===^^##^^^==^^^==^^^=^=^^^^=^^^^^^^^##"
		);
	}
	
	get width() { return this.structure[0].length * this.cellWidth }
	
	get height() {	return this.structure.length * this.cellHeight }
	
	drawStructure() {
		document.write('<div id="deep-space" style="top: 0px; left: 0px; white-space: nowrap; background:url(background/' + this.bg + ') repeat-x;">');
		for (var i = 0; i < this.structure.length; i++) {
			for (var j = 0; j < this.structure[i].length; j++) {
				let x = this.scapeTranslation.indexOf(this.structure[i][j]);
				x = (x < 0) ? 0 : x;
				document.write('<img class="cell" src="scape/' + this.planet + '/' + this.scape[x] + '" width=' + this.cellWidth + ' height=' + this.cellHeight + '>');
			}
			document.write('<br>');
		}
		document.write('</div>');
		if (this.debug)
			document.write('<span id="debug">Click inside frame to activate keyboard</span>');
	}
	
	debug(s = '') {
		if (!this.dbg) return; 
		document.getElementById("debug").innerHTML = s;
	}
	
	debugIns(s = '', x = -1) {
		if (!this.dbg) return; 
		if (x == -1) {
			document.getElementById("debug").innerHTML += '<br>' + s;
		} else {
			var lines = document.getElementById("debug").innerHTML.split('<br>');
			var len = (lines.length - 1 < x) ? x : lines.length - 1; 
			document.getElementById("debug").innerHTML = '';
			for (var i = 0; i <= len; i++) {
				if (i == x)
					document.getElementById("debug").innerHTML += s;
				else if (i < lines.length) 
					document.getElementById("debug").innerHTML += lines[i];
				if (i != len) 
					document.getElementById("debug").innerHTML += '<br>';
			}
		}
	}
	
	load(hero, str = '') {
		if (str != '')
			this.structure = str.split('\n');
			
		this.screenFrozen = false;
		this.P = new Point(0, 0);
		
		hero.clearControls();
		hero.jumpTimer = 0;
		var m = document.getElementById("deep-space");
		if (m != null) m.style.left = this.P.x + 'px';
		
		// Duplicate string-map with byte-map
		// * Create passability byte matrix (0/1) is probably faster operating with 
		this.pass = new Array(this.structure.length);
		
		this.entity = new Array();
		for (var i = 0; i < this.structure.length; i++)
		{
			this.pass[i] = new Array(this.structure[i].length);
			for (var j = 0; j < this.structure[i].length; j++) {
				if (this.passability.indexOf(this.structure[i][j]) >= 0)
					this.pass[i][j] = 0; // hero can pass
				else if (this.structure[i][j] == '>')
					this.pass[i][j] = 2;
				else if (this.structure[i][j] == '<')
					this.pass[i][j] = 3;
				else
					this.pass[i][j] = 1;
				// Start & Finish point
				if (this.structure[i][j] == 'H') {
					this.start = new Point(j * this.cellWidth, i * this.cellHeight);
					hero.R.x = j * this.cellWidth;
					hero.R.y = i * this.cellHeight;
					continue; 
				} else if (this.structure[i][j] == 'R') {
					this.finish = new Rect(j * this.cellWidth, i * this.cellHeight, this.cellWidth, this.cellHeight);
				}
				// Entity
				let x = this.lookTranslation.indexOf(this.structure[i][j]);
				if (x >= 0) {
					let en = new Entity(j, i, x);
					this.entity.push(en);
				}
			}
		}		
		/* Physics */
		//this.Ph = new Physics(); 
		this.Ph = new Physics(10, -6, 12, 3, 6, 3, 2);
	}
	
	drawEntity() {
		for (var i = 0; i < this.entity.length; i++) {
			var en = document.getElementById('entity' + i);
			if (en == null) {
				en = document.createElement('img');
				en.id = 'entity' + i;
				en.src = 'entity/' + this.planet + '/' + this.look[this.entity[i].n];
				en.width = this.cellWidth;
				en.height = this.cellHeight;
				en.className = 'entity';
				document.body.appendChild(en);
			}
			en.style.left = (this.entity[i].x * this.cellWidth + this.P.x) + 'px'; 
			en.style.top = (this.entity[i].y * this.cellHeight + this.P.y) + 'px';
		}
	}
}



/* >> 02. KEYBOARD >> >> */

function KeyDown(e)
{
	//alert(e.keyCode);
	switch(e.keyCode)	{
		/* arrow left, a */
		case 37: case 65: 
			hero.controls[btn.left] = 1;
			break;
		/* arrow right, d */
		case 39: case 68:
			hero.controls[btn.right] = 1;
			break;
		/* arrow down, s */
		case 40: case 83:
			hero.controls[btn.down] = 1;
			break;
		/* arrow up, w */
		case 38: case 87: 
			hero.controls[btn.up] = 1;
			break;
		/* space */
		case 32:
			hero.controls[btn.jump] = 1;
			break;
		/* p */
		case 80:
			hero.controls[btn.atack] = 1;
			break;
		//== >> system >> >> 
		/* enter */
		case 13:			
			break;
		/* escape */
		case 27:			
			break;
	}
}

function KeyUp(e)
{
	switch(e.keyCode)	{
		/* arrow left, a */
		case 37: case 65: 
			hero.controls[btn.left] = 0;
			break;
		/* arrow right, d */
		case 39: case 68:
			hero.controls[btn.right] = 0;
			break;
		/* arrow down, s */
		case 40: case 83:
			hero.controls[btn.down] = 0;
			break;
		/* arrow up, w */
		case 38: case 87: 
			hero.controls[btn.up] = 0;
			break;
		/* space */
		case 32:
			hero.controls[btn.jump] = 0;
			break;
		/* p */
		case 80:
			hero.controls[btn.atack] = 0;
			break;
	}
}



/* >> 03. START >> >> */

var screenWidth = 640;

var hero = new Hero('Jimmy');
var map = new Map('jupiter', 'space.jpg', true);
map.load(hero, '');
map.drawStructure();
map.drawEntity();
hero.loadSprites(600);
hero.draw(11);

var interval = 50;
var gameProcess; 
game();

// Game Process
function game() {
	clearTimeout(gameProcess);
	
	/* Check Finish */
	if (hero.R.isCrossWith(map.finish, map.P.x)) {
		map.debug('Finish!');
		return;
	}
	
	/* Check fell into chasm */
	if (hero.R.bottom >= map.height) {
		map.debug('Fell into chasm :(');
		map.load(hero, '');
		//return;
	}
	
	/* Check Hero died from Enemy */
	//...
	
	/* Check Hero died from Time */
	//...
	
	/* Entity effects */
	//...
	
	/* Enemy effects */
	//...
	
	/* Enemy movements */
	//...
	
	/* Hero movement */
	hero.movement(map);

	gameProcess = setTimeout("game()", interval);
}




/*
//document.getElementById("StartButton").focus();

var flashvars = {
	mp3: "smoking-yoda.mp3",
	javascript: "on",
	autostart: 1,
	autoreplay: 1,
	volume: 50
};
var params = {
	wmode: "transparent"
};
var attributes = {
	id: "dewplayer"
};
swfobject.embedSWF("dewplayer-mini.swf", "dewplayer-js", "200", "20", "9.0.0", false, flashvars, params, attributes);
//¬ключить выключить звук.. не доделано...
function switchSound()
{
	var dewp = document.getElementById("dewplayer");
	if (sound == 1)
	{
		document.SOUND.src = 'sound-off.png';
		sound = 0;
		if(dewp) dewp.dewstop();
	}else 
	{
		document.SOUND.src = 'sound-on.png';
		sound = 1;
		if(dewp) dewp.dewplay();
	}
}
*/

