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
var act = Object.freeze({"stop": 0, "run": 1, "crawling": 2, "jump": 3 });
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
		/* Delta X */
		var dx = ((this.controls[btn.down]) ? map.Ph.crawlingSpeed : map.Ph.runSpeed) * (1 * this.controls[btn.right] - 1 * this.controls[btn.left]);
		if (this.controls[btn.left]) this.direction = -1;
		if (this.controls[btn.right]) this.direction = 1;
		/* Current action*/
		this.action = (dx) ? act.run : act.stop;
		if (this.controls[btn.down]) this.action = act.crawling;
		/* Horizontal positioning */
		var hm = true;			
		if (dx > 0 && this.R.x + dx < map.heroView || dx < 0 && this.R.x + dx > map.heroView) {
			this.R.x += dx;
		} else if (map.P.x - dx <= 0 && map.P.x - dx >= (map.width - screenWidth) * -1 && !map.screenFrozen) {
			map.P.x -= dx;
			document.getElementById("deep-space").style.left = map.P.x + 'px';
			map.drawEntity();
			hm = false;
		} else {
			this.R.x += dx;
			hm = true; 
		}
		/* Horizontal barriers */
			// потом следует переделать. нужно провер€ть два блока (а не один) по высоте, если герой находитс€ в полете	
			// здесь в очень редких случа€х герой может залезть внутрь блока
		var i = Math.round((this.R.x - map.P.x + dx * 2) / 32);
		var j = Math.floor((this.R.y - map.P.y + this.R.h - 1) / 32);
		if (i < 0 || i > map.pass[0].length - 1 || map.pass[j][i]) {
			if (hm) this.R.x -= dx; else map.P.x += dx;
			if (this.action != act.crawling) this.action = act.stop;
			dx = 0;
		}		
		/* Falling */
		var dy = 0;
		var m = Math.floor((this.R.x - map.P.x + this.R.w / 2) / 32);
		var t = Math.floor((this.R.y - map.P.y) / 32);
		// get bottom element
		var b = map.pass.length;
		for (var	i = t; i < map.pass.length; i++)
			if (map.pass[i][m]) {
				b = i;
				break;
			}
		/* Hero in Air */
		if (this.R.y + this.R.h < b * 32) {
			this.action	= act.jump; 
			this.controls[btn.up] = 0;
			dy = map.Ph.gravity;
			if (this.jumpTimer > 0)
			{
				dy = map.Ph.jumpPower;
				this.jumpTimer--;
			}
			this.R.y += dy;
			if (this.R.y + this.R.h >= b * 32) this.R.y = b * 32 - this.R.h;
		/* Jump */
		} else if (this.controls[btn.up]){
			this.R.y -= 3;
			this.jumpTimer = map.Ph.jumpLength;
		} else {
			this.jumpTimer = 0;
		}			
		/* Drawing */
		n = (dx) ? 1 - n : 0;
		switch (this.action) {
			case act.stop: this.draw((this.direction > 0) ? 11 : 5); break; 
			case act.crawling: this.draw((this.direction > 0) ? 6 + n : 0 + n); break; 
			case act.run: this.draw((this.direction > 0) ? 9 + n : 3 + n); break; 
			case act.jump: this.draw((this.direction > 0) ? 8 : 2); break; 
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
	constructor (g = 10, jP = -5, jL = 11, cS = 3, rS = 6, cC = 0.6) {
		this.gravity = g; 			// X px per timer-period in falling
		this.jumpPower = jP;			// X px in lift
		this.jumpLength = jL; 		// Jump period in timer-periods
											// *Full height of jump = jumpPower * jumpTimer + 3. 
		this.crawlingSpeed = cS;	// X px in crawling step
		this.runSpeed = rS;			// X px in run step
		this.climbCoef = cC;			// Slowing coeficient, while climbing 
	}
}

class Map {
	
	constructor (planet = 'jupiter', background = 'space.jpg') {
		this.planet = planet;
		this.bg = background;
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
		
		this.passability = 'H ^JWBRGAS';
		
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
			"                                                       =  ##",
			"H                                                         ##",
			"=======           =                                 =     ##",
			"#######=          #        ==                 ==          ##",
			"########=^^^=^^^=^#^^^===^^##^^^==^^^==^^^=^=^##^=^^^^^^^^##"
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
		document.write('<span id="debug">Click inside frame to activate keyboard</span>');
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
		this.Ph = new Physics(10, -6, 12, 3, 6, 0.6);
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
var map = new Map();
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
		document.getElementById('debug').innerHTML = 'Finish!';
		return;
	}
	
	/* Check fell into chasm */
	if (hero.R.bottom >= map.height) {
		document.getElementById('debug').innerHTML = 'Fell into chasm :(';
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

