/*
	Space Marine Adventures v 1.2 Alpha
		© 2018 onyokneesdog
	
	last edit: 16.07.2018
	
	>> >> >>
	Contents:
		00. HERO
		01. MAP
		02. TRIGGERS
		03. KEYBOARD
		04. START
		
	>> >> >>
	Notes:
		xx. Test vertical type maps 
			legsPx in hero.movement should be calculated with map.P.y (later)
		00. There are some issues with triggers playing in the same time... 
			"Hello triggers" -> secretblock -> warp zone -> hello triggers repeats wtf?..
		01. Add fall of blocks
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

// ENUM buttons
var btn = Object.freeze({"left": 0, "right": 1, "down": 2, "up": 3, "jump": 4, "atack": 5});
// ENUM actions
var act = Object.freeze({"stop": 0, "run": 1, "crawling": 2, "jump": 3, "slipping": 4, "climbing": 5, "dash": 6 });

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
		this.jumpPower = 0;
		this.prevSprite = -1;
		this.inertia = 0;
		this.inAir = false;
		this.n = 0;
		
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
		/* Map coords fix */
		if (map.P.x > 0) map.P.x = 0;
		if (map.P.x < (map.width - screenWidth) * -1) map.P.x = (map.width - screenWidth) * -1;
		
		/* Save direction */
		if (this.controls[btn.left]) this.direction = -1;
		if (this.controls[btn.right]) this.direction = 1;
		
		/* Lead-up */
		var dx = map.Ph.run; // possible horizontal move
		dx = dx * (this.controls[btn.right] - this.controls[btn.left]);
		this.inAir = false;
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
			} else if (map.pass[i][m] == 4) {
				floor = i + 0.5; 
				floorName = 'half';
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
			this.jumpTimer = 0;
		/* in Air */
		} else if (legsPx < floorPx) {
			this.inAir = true;
			map.debugIns(' >> air >>', 2); //debug
			// JUMP
			if (this.jumpTimer > 0)	{
				this.jumpTimer--;
				if (this.R.y + this.jumpPower < ceilPx) {
					this.R.y = ceilPx;
					this.jumpTimer = 2;
					this.jumpPower = 0;
				} else 
					this.R.y += this.jumpPower;
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
				this.jumpPower = map.Ph.jumpPower;
				this.jumpTimer = map.Ph.jumpDuration;
			}
			else if ((map.pass[legs][m] == 2 || map.pass[legs][m] == 3) && legsPx >= floorPx - map.Ph.run) {
				this.R.y -= 3;
				this.jumpPower = map.Ph.jumpPower;
				this.jumpTimer = map.Ph.jumpDuration;
			}
		}
		
		/* Inertia */
		// * using only for slipping in this version
		if (dx == 0) {
			dx = this.inertia;
			this.inertia = 0;
		}
		
		/* Crawling */
		if (!this.inAir && this.controls[btn.down] && !(map.pass[legs][m] == 2 || map.pass[legs][m] == 3))
			dx = map.Ph.crawling * (this.controls[btn.right] - this.controls[btn.left]);
		
		/* Check horizontal barriers*/
		if ((map.pass[head][left] || map.pass[legs][left] == 1 || left < 0) && dx < 0) dx = 0;
		if ((map.pass[head][right] || map.pass[legs][right] == 1 || right > map.pass[0].length - 1) && dx > 0) dx = 0;	
		
		/* Climbing */
		// * it's must be after checking h-barriers
		if ((map.pass[legs][left] == 2 || map.pass[legs][m] == 2) && this.controls[btn.left] && map.pass[head][left] != 1) {
			dx = -1 * map.Ph.climbing;
			this.R.y -= map.Ph.climbing;
		}
		if ((map.pass[legs][right] == 3 || map.pass[legs][m] == 3) && this.controls[btn.right] && map.pass[head][right] != 1) {
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
		if (this.inAir && (this.controls[btn.left] + this.controls[btn.right]) && (map.pass[legs][m] == 2 || map.pass[legs][m] == 3)) this.action = act.climbing;
		else if (this.inAir && (map.pass[slFix][m] == 2 || map.pass[slFix][m] == 3)) this.action = act.slipping;		
		else if (this.R.y + this.R.h < floorPx - 10) this.action = act.jump;
		else if (this.controls[btn.down] && !(map.pass[legs][m] == 2 || map.pass[legs][m] == 3)) this.action = act.crawling;
		else if (dx != 0) this.action = act.run;
		else this.action = act.stop;
		
		/* Draw sprite */
		this.n = (dx) ? 1 - this.n : 0;
		switch (this.action) {
			case act.stop: 
				this.draw((this.direction > 0) ? 11 : 5); break; 
			case act.crawling: 
				this.draw((this.direction > 0) ? 6 + this.n : 0 + this.n); break; 
			case act.run:  
			case act.climbing:
				this.draw((this.direction > 0) ? 9 + this.n : 3 + this.n); break; 
			case act.slipping:
				this.draw((this.direction > 0) ? 9 : 3); break; 
			case act.jump: 
				this.draw((this.direction > 0) ? 8 : 2); break; 
		}
	}
	
	doJump(start, power, duration) {
		this.R.y += start * 1.0;
		this.jumpPower = power * 1.0;
		this.jumpTimer = duration * 1.0;
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

// ENUM pointers in map text
var ptr = Object.freeze({"none": 0, "lobby": 1, "gear": 2, "machinery": 3, "structure": 4});

class Entity {
	constructor (x, y, sprite) {
		this.x = x;
		this.y = y;
		this.sprite = sprite;
		this.prevSprite = -1;
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
		
		this.gameTimer = 0;
		
		/* gears -> triggers, after map.load */
		this.gears = new Array(
			/* Specific trigger for every "J" on the map */
			{
				sym: 'J',
				trigger: '?landed:en:#\n00 sprite:en:#:2\n00 pass:en:#:4\n10 ?landed:en:# jump:-20:-16:14\n10 sprite:en:#:1\n10 pass:en:#:1\nR 20'
			},
			/* Just trigger (sym should be = "") */
			{
				sym: '',
				trigger: '50 message:hello:350:330:0:Hello, cosmonaut!\n150 clear:hello'
			},
			{
				sym: '',
				trigger: '100 message:tooltip:350:345:0:This is test map for SMA.\n200 clear:tooltip'
			},
			{
				sym: '',
				trigger: '150 message:goodluck:350:360:0:Good luck in your little journey.\n250 clear:goodluck'
			}
		);		
		
		this.Ph = new Object();
		this.Ph.gravity = 10; // X px per timer-period in falling
		this.Ph.jumpPower = -6; // X px in lift
		this.Ph.jumpDuration = 12; // Jump period in timer-periods
		this.Ph.crawling = 3; // X px in crawling step
		this.Ph.run = 6; // X px in run step
		this.Ph.climbing = 3; // X px in climbing
		this.Ph.slipping = 2; // X px in slipping
		
		/* Landscape pictures */
		this.scape = new Array(
			"air.gif", 				// space
			"chasm.gif", 			// ^
			"downhill.gif", 		// >
			"mid.gif",				// #
			"slit.gif", 			// _
			"surface.gif", 		// =
			"uphill.gif",			// <
			"invisible.gif"		// X
		);
		this.scapeTranslation = ' ^>#_=<X';
		
		/* Entity pictures */
		this.look = new Array(
			"dropship.gif",					// D
			"gravityCanonExtended.gif",	// J
			"gravityCanon.gif",				// j
			"warpGate.gif",					// W
			"flagBlue.gif",					// B
			"flagRed.gif",						// R
			"fall.gif",							// F
			"gun.gif",							// G
			"armory.gif",						// A
			"stimpack.gif"						// S
		);
		this.lookTranslation = 'DJjWBRFGAS'; // look indexes
		this.entity = new Array();
		
		this.passability = 'H D^WBRGAS'; // passability = 0 (can pass)
		
		this.passTranslation = '**><j'; // passability indexes (>=2)
		
		/* Demo Map structure */
		this.structure = new Array(
			"____________________________________________________________",
			"D                                                           ",
			"                                                            ",
			"                                                            ",
			"                                                            ",
			"                                                            ",
			"                  =                                        R",
			"                  #                                       ==",
			"                  #                                       ##",
			" =                #                                    F  ##",
			"H                 #                                       ##",
			"==>   <>          #         J                       F     ##",
			"###> <##>       J #        <=      J          FFFF        ##",
			"####=####^^^=^^==^#^^^===^^##^^^^^^=^^^^^^=^^^^^^^^^^^^^^^##"
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
	
	load(hero, mapText) {
		this.gameTimer = 0;
		
		if (typeof(this.triggers) !== 'undefined')
			this.finalizeTriggers(hero);
		
		/* Load from text */
		if (typeof(mapText) !== 'undefined') {
			this.gears = new Array();
			var value;
			/* options */
			value = readValue(mapText, 'options', 'debug');
			if (value !== false) this.debug = (value.toUpperCase() == 'YES') ? true : false;
			value = readValue(mapText, 'options', 'planet');
			if (value !== false) this.planet = value;
			value = readValue(mapText, 'options', 'background');
			if (value !== false) this.background = value;
			value = readValue(mapText, 'options', 'heroView');
			if (value !== false) this.heroView = value * 1.0;
			/* Physics */
			value = readSection(mapText, 'physics');
			if (value !== false) {
				this.Ph = fusion(this.Ph, value);
				var keys = Object.keys(this.Ph);
				for (var i = 0; i < keys.length; i++) 
					this.Ph[keys[i]] = this.Ph[keys[i]] * 1.0;
			}
			/* Structure */
			value = readStrings(mapText, 'map', 'structure');
			if (value !== false) {
				this.structure = new Array();
				for (var i = 0; i < value.length; i++)
					this.structure.push(value[i].substring(1, value[i].length - 1));
			}
			/* Triggers */
			value = readValue(mapText, 'triggers', 'gears');
			if (value !== false)
				for (var i = 0; i < value.length; i++)
					this.gears.push({sym: value[i], trigger: buildString(readStrings(mapText, 'triggers', value[i]), '\n')});
			value = readStrings(mapText, 'triggers', 'machinery');
			if (value !== false) {
				var t = '';
				for (var i = 0; i < value.length; i++)
					if ((value[i] == '' || i == value.length - 1) && comTrim(t) != '') {
						if (i == value.length - 1) t += '\n' + value[i];
						this.gears.push({sym: '', trigger: t});
					}
					else
						t += (t != '') ? '\n' + value[i] : value[i];
			}
			/* end of reading */
		}
		
		this.screenFrozen = false;
		this.P = new Point(0, 0);		
		hero.clearControls();
		hero.jumpTimer = 0;
		var m = document.getElementById("deep-space");
		if (m != null) m.style.left = this.P.x + 'px';
		this.triggers = new Array();
		
		// Duplicate string-map with byte-map
		// * Create passability byte matrix (0/1) is probably faster operating with 
		this.pass = new Array(this.structure.length);
		this.entity = new Array();
		for (var i = 0; i < this.structure.length; i++) {
			this.pass[i] = new Array(this.structure[i].length);
			for (var j = 0; j < this.structure[i].length; j++) {
				// Passability Types
				if (this.passTranslation.indexOf(this.structure[i][j]) >= 2)	
					this.pass[i][j] = this.passTranslation.indexOf(this.structure[i][j]);
				else if (this.passability.indexOf(this.structure[i][j]) >= 0)
					this.pass[i][j] = 0; // hero can pass
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
					for (var z = 0; z < this.gears.length; z++)
						if (this.gears[z].sym == this.structure[i][j])
							this.triggers.push(new Trigger(this.gears[z].trigger.replace(new RegExp('#', 'g'), this.entity.length - 1)));
				}
			}
		}
		for (var i = 0; i < this.gears.length; i++) 
			if (this.gears[i].sym == '') this.triggers.push(new Trigger(this.gears[i].trigger));
	}
	
	setEntity(i) {
		var en = document.getElementById('entity' + i);
		if (en == null) {
			en = document.createElement('img');
			en.id = 'entity' + i;
			en.width = this.cellWidth;
			en.height = this.cellHeight;
			en.className = 'entity';
			document.body.appendChild(en);
		}
		if (this.entity[i].sprite != this.entity[i].prevSprite) {
			en.src = 'entity/' + this.planet + '/' + this.look[this.entity[i].sprite];
			this.entity[i].prevSprite = this.entity[i].sprite;
		}
		en.style.left = (this.entity[i].x * this.cellWidth + this.P.x) + 'px'; 
		en.style.top = (this.entity[i].y * this.cellHeight + this.P.y) + 'px';
	}
	
	// id >= 0 - draw concrete entity, id == -1 - draw everything
	drawEntity(id = -1) {
		if (id >= 0) this.setEntity(id);
		else for (var i = 0; i < this.entity.length; i++) this.setEntity(i);
	}
	
	finalizeTriggers(hero) {
		for (var i = 0; i < this.triggers.length; i++)
			this.triggers[i].finalize(hero, this);
	}

}



/* >> 02. TRIGGERS >> >> */
/*
	Structure:
		main Led
		timer: [?(!)led:transcription] mission:parameters
		Restore timer
	
	Gragity Canon Example:
		?landed:en:id
		00 sprite:en:id:2
		00 pass:en:id:4
		10 ?landed:en:id jump:SI:GC:GCL
		10 sprite:en:id:1
		10 pass:en:id:1
		R 20
*/

// ENUM led
var led = Object.freeze({"empty": -1, "landed": 0, "inSquare": 1, "vertical": 2, "onScreen": 3});
// ENUM subject
var sub = Object.freeze({"entity": 0, "foe": 1, "cell": 2});
// ENUM task
var tsk = Object.freeze({"sprite": 0, "pass": 1, "jump": 2, "teleport": 3, "message": 4, "clear": 5}); 

class Led {	
	constructor(ledString) {
		if (typeof(ledString) === 'undefined') {
			this.kind = led.empty;
			return;
		}
		var parts = ledString.split(':');
		this.mode = (parts[0][0] == '?') ? true : false;
		switch (parts[0].substring(1)) {
			case "landed": this.kind = led.landed; break;
			case "inSquare": this.kind = led.inSquare; break;
			case "vertical": this.kind = led.vertical; break;
			case "onScreen": this.kind = led.onScreen; break;
		}
		switch (parts[1]) {
			case "en": this.aspect = sub.entity; break;
			case "fo": this.aspect = sub.foe; break;
			case "ce": this.aspect = sub.cell; break;
		}
		switch (this.aspect) {
			case sub.entity:
			case sub.foe:
				this.id = parts[2] * 1.0;
				this.x = -1;
				this.y = -1;
				break;
			case sub.cell:
				this.id = -1;
				this.x = parts[2] * 1.0;
				this.y = parts[3] * 1.0;
				break;
		}
	}
	
	check(hero, map) {
		if (this.kind == led.empty) return true;
		switch (this.kind) {
			case led.landed: 
				var x = Math.floor((hero.R.x - map.P.x + hero.R.w / 2) / map.cellWidth); // horizontal index for the middle of hero body
				var y = Math.floor((hero.R.y - map.P.y) / map.cellHeight); //vertical index for the head of hero
				switch (this.aspect) {
					case sub.entity:
					case sub.foe:
						if ((x == map.entity[this.id].x && y + 1 == map.entity[this.id].y && !hero.inAir) == this.mode) return true;
						break;
					case sub.cell:
						if ((x == this.x && y + 1 == this.y && !hero.inAir) == this.mode) return true;
						break;
				}
				break;
			case led.inSquare: 
				var x = Math.floor((hero.R.x - map.P.x + hero.R.w / 2) / map.cellWidth); 
				var y = Math.floor((hero.R.y - map.P.y + hero.R.h / 2) / map.cellHeight);
				switch (this.aspect) {
					case sub.entity:
					case sub.foe:
						if ((x == map.entity[this.id].x && y == map.entity[this.id].y) == this.mode) return true;
						break;
					case sub.cell:
						if ((x == this.x && y == this.y) == this.mode) return true;
						break;
				}				 
				break;
			case led.vertical: break;
			case led.onScreen: break;	
		}
		return false;
	}	
}

class Task {
	constructor(taskString) {
		var parts = taskString.split(':');
		//this.mission = -1;
		switch (parts[0]) {
			case "sprite": this.mission = tsk.sprite; break;
			case "pass": this.mission = tsk.pass; break;
			case "jump": this.mission = tsk.jump; break;
			case "teleport": this.mission = tsk.teleport; break;
			case "message": this.mission = tsk.message; break;
			case "clear": this.mission = tsk.clear; break;
		}
		this.params = new Array();
		for (var i = 1; i < parts.length; i++) {
			var el = parts[i];
			if (['en', 'fo', 'ce'].includes(parts[i])) el = ['en', 'fo', 'ce'].indexOf(parts[i]);
			this.params.push(el);
		}
	}
}

class RosterLine {	
	constructor(timer, taskString, ledString) {
		this.timer = timer * 1.0;
		this.T = new Task(taskString);
		//if (typeof(ledString) !== 'undefined') 
		this.led = new Led(ledString);
	}
}

class Trigger {
	
	constructor(rosterText) {
		this.restore = -1;
		this.roster = new Array();
		this.timer = -1;
		this.butterfly = new Led();
		var lines = rosterText.split('\n');		
		for (var i = 0; i < lines.length; i++)
			if (lines[i].trim() === '') 
				break;
			else if (lines[i].startsWith('#')) 
				continue;
			/* main led */
			else if (lines[i].startsWith('?') || lines[i].startsWith('!')) {
				this.butterfly = new Led(lines[i]);
			/* restore trigger timer */
			} else if (lines[i].toUpperCase().startsWith('R')) {
				this.restore = lines[i].split(' ')[1] * 1.0;
			/* common line */
			} else {
				var parts = lines[i].split(' ');			
				if (parts[1].startsWith('?') || parts[1].startsWith('!')) {
					var s = ''; 
					for (var j = 2; j < parts.length; j++)
						s += (j + 1 != parts.length) ? parts[j] + ' ': parts[j];
					this.roster.push(new RosterLine(parts[0], s, parts[1]));
				} else {
					var s = '';
					for (var j = 1; j < parts.length; j++)
						s += (j + 1 != parts.length) ? parts[j] + ' ': parts[j];
					this.roster.push(new RosterLine(parts[0], s));
				}
			}
	}
	
	finalize(hero, map) {
		if (this.timer >= 0)
			for (var i = 0; i < this.roster.length; i++)
				if (this.roster[i].timer > this.timer) {
					this.timer = this.roster[i].timer;
					this.launcher(hero, map);
				}
	}
	
	launcher(hero, map) {
		if (this.timer == -1 && this.butterfly.check(hero, map)) {
			map.debugIns('Trigger launched', 3);
			this.timer = 0;
		}
		if (this.timer >= 0) {
			for (var i = 0; i < this.roster.length; i++)
				if (this.roster[i].timer == this.timer && this.roster[i].led.check(hero, map)) {
					map.debugIns('Trigger roster: ' + i, 3);
					switch (this.roster[i].T.mission) {
						/* Change sprite */
						case tsk.sprite: 
							switch (this.roster[i].T.params[0]) {
								case sub.entity:
								case sub.foe:
									map.entity[this.roster[i].T.params[1] * 1.0].sprite = this.roster[i].T.params[2] * 1.0;
									map.drawEntity(this.roster[i].T.params[1] * 1.0);
									break;
								case sub.cell:	
									
									break;
							}
							break;
						/* Change map passability */
						case tsk.pass: 
							var x = 0, y = 0, p = 0;
							switch (this.roster[i].T.params[0]) {
								case sub.entity:
								case sub.foe:
									x = map.entity[this.roster[i].T.params[1] * 1.0].x;
									y = map.entity[this.roster[i].T.params[1] * 1.0].y;
									p = this.roster[i].T.params[2] * 1.0;
									break;
								case sub.cell:	
									x = this.roster[i].T.params[1] * 1.0;
									y = this.roster[i].T.params[2] * 1.0;
									p = this.roster[i].T.params[3] * 1.0;									
									break;
							}
							map.pass[y][x] = p;
							break;
						/* Hero jump */
						case tsk.jump: 
							hero.doJump(this.roster[i].T.params[0], this.roster[i].T.params[1], this.roster[i].T.params[2]);
							break;
						/* Hero teleport */
						case tsk.teleport: 	
							var x = this.roster[i].T.params[0] * map.cellWidth;
							var y = this.roster[i].T.params[1] * map.cellHeight;
							if (x > map.heroView) {
								if (x - map.heroView > map.width - screenWidth) {
									map.P.x = screenWidth - map.width;
									hero.R.x = x + map.P.x;
								} else {
									hero.R.x = map.heroView;
									map.P.x = map.heroView - x;
								}
							} else {
								hero.R.x = x;
								map.P.x = 0;
							}
							hero.R.y = y; //it's should be replaced for vertical-type maps... but not now
							hero.jumpTimer = 0;
							document.getElementById("deep-space").style.left = map.P.x + 'px';
							map.drawEntity();
							break;
						/* Message on the screen */
						case tsk.message:
							var el = document.getElementById(this.roster[i].T.params[0]);
							if (el == null) {
								el = document.createElement('div');
								el.id = this.roster[i].T.params[0];
								el.className = 'message';								
								document.body.appendChild(el);
							}
							el.style.left = this.roster[i].T.params[1] + 'px'; 
							el.style.top = this.roster[i].T.params[2] + 'px';
							el.width = this.roster[i].T.params[3] + 'px';
							el.innerHTML = this.roster[i].T.params[4];
							break;
						/* Clear message */
						case tsk.clear: 
							var el = document.getElementById(this.roster[i].T.params[0]);
							if (el != null) el.remove();
							break;
					}
				}
			if (this.timer < 10000) this.timer++;
			if (this.timer == this.restore) {
				map.debugIns('Trigger finished', 3);
				this.timer = -1;
			}
		}
	}
	
}



/* >> 03. KEYBOARD >> >> */

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



/* >> 04. START >> >> */

var screenWidth = 640;

var hero = new Hero('Jimmy');
var map = new Map('jupiter', 'space.jpg', true);

//just for tests (actually it's should be read from the file)
var mapTextExample =
'Space marine adventures\n' + 
'Debug Map\n' + 
'\n' + 
'[options]\n' + 
'debug = yes\n' + 
'planet = jupiter\n' + 
'background = space.jpg\n' + 
'\n' + 
'[pregame]\n' + 
'lobby:{\n' + 
'00 start\n' + 
'}\n' + 
'\n' + 
'[physics]\n' + 
'#gravity = 10\n' + 
'#jumpPower = -6\n' + 
'#jumpDuration = 12\n' + 
'crawling = 3\n' + 
'run = 6\n' + 
'climbing = 3\n' + 
'slipping = 2\n' + 
'\n' + 
'[map]\n' + 
'structure:{\n' + 
'|____________________________________________________________|\n' + 
'|D                                                           |\n' + 
'|                                                            |\n' + 
'|                                                            |\n' + 
'|                                                            |\n' + 
'|   XXX                                                      |\n' + 
'|          W       =                                        R|\n' + 
'|X                 #                                       ==|\n' + 
'|                  #                                       ##|\n' + 
'| =                #                                    =  ##|\n' + 
'|H                 #                                       ##|\n' + 
'|==>   <>          #         J                       =     ##|\n' + 
'|###> <##>       J #        <=      J          ==          ##|\n' + 
'|####=####^^^=^^==^#^^^===^^##^^^^^^=^^^^^^=^^^##^=^^^^^^^^##|\n' + 
'}\n' + 
'\n' + 
'[triggers]\n' + 
'# [timing]\n' + 
'# [?/! landed/inSquare/vertical/onScreen] {}\n' + 
'# [sprite/pass/jump/teleport/message/clear : en/fo/ce : params]\n' + 
'\n' + 
'gears = JFW\n' + 
'\n' + 
'J:{\n' + 
'?landed:en:#\n' + 
'00 sprite:en:#:2\n' + 
'00 pass:en:#:4\n' + 
'10 ?landed:en:# jump:-20:-16:14\n' + 
'10 sprite:en:#:1\n' + 
'10 pass:en:#:1\n' + 
'R 20\n' + 
'}\n' + 
'\n' + 
'F:{\n' + 
'?landed:en:#\n' + 
'05 fall:en:#\n' + 
'}\n' + 
'\n' + 
'W:{\n' + 
'?inSquare:en:#\n' + 
'00 teleport:50:3\n' + 
'R 10\n' + 
'}\n' + 
'\n' + 
'machinery:{\n' + 
'50 message:hello:350:330:0:Hello, cosmonaut!\n' + 
'150 clear:hello\n' + 
'\n' + 
'100 message:tooltip:350:345:0:This is test map for SMA.\n' + 
'200 clear:tooltip\n' + 
'\n' + 
'150 message:goodluck:350:360:0:Good luck in your little journey.\n' + 
'250 clear:goodluck\n' + 
'\n' +
'?landed:ce:0:7\n' + 
'0 message:secret:10:200:0:You found secret block\n' + 
'50 clear:secret\n' + 
'}\n' + 
'\n'
;
map.load(hero, mapTextExample); //tests

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
		map.debugIns('Level complete!', 3);
		map.load(hero);
	}
	
	/* Check fell into chasm */
	if (hero.R.bottom >= map.height - map.cellHeight / 2) {
		map.debugIns('Fell into chasm :(', 3);
		map.load(hero);
	}
	
	/* Triggers */
	for (var i = 0; i < map.triggers.length; i++) 
		map.triggers[i].launcher(hero, map);
	
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

	map.gameTimer++;
	gameProcess = setTimeout("game()", interval);
}

/* The end <"-)_(-"> */