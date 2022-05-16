/*
	Space Marine Adventures v 1.2 Alpha
		© 2018 oykd
	
	last edit: 18.07.2018
	
	Using: 
		readInf.js - reading map info from some text
		lackey.js - auxiliary classes & functions, which could be used not only for this game
		maps.js - js-file using for storage maps
			* (no need in XMLHttpRequest and "--allow-file-access-from-files" for machines without http server)
	
	>> >> >>
	Contents:
		00. HERO
		01. MAP
		02. TRIGGERS
		03. DYNAMICS
		04. KEYBOARD
		05. START
		
	>> >> >>
	Notes:
		xx. Test vertical type maps 
			legsPx in hero.movement should be calculated with map.P.y (later)
			
		00. interaction issues
		00. check left and right interaction (some problems with climbing and moving blocks in the same time)
		01. chage sprites for map cells
		02. add slit
		03. add hero death by squeese
		04. add stairs
		05. add ropes
		06. async backgrounds
		07. frontal objects
		08. dash
		
	>> >> >>
	Explanations:
		map.structure - string array, which describes the solid (not dynamic) structure of the map;
		map.pass - 2D byte array, based on structure, which indicates passability of map cells;
				* could be dynamically changed by triggers
		map.trigger - sequential instruction set called by special conditions;
		map.entity - game object, which can interacts with hero, but cant moving;
				* trigger caller
		map.dynamic - game object, which can move and physically interacts with hero;
				* can be created and destroyed during the game process by triggers
				** can not be recommended as trigger caller itself
		
	However, precise 2D physics is not the most correct task for browser game, based on javascript. 
	Dont be surprise by some caveman ways of realization..
	
	https://github.com/oykd/sma
*/



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
		this.lay = false;
		this.incline = false;
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
	
	movement(map, interaction) {
		/* Map coords fix */
		// It's could happen after using teleport.
		if (map.P.x > 0) map.P.x = 0;
		if (map.P.x < (map.width - screenWidth) * -1) map.P.x = (map.width - screenWidth) * -1;
		
		/* Basic hero defaults */
		if (this.controls[btn.left]) this.direction = -1;
		if (this.controls[btn.right]) this.direction = 1;
		this.lay = false;
		this.incline = false;
		this.inAir = false;
		
		/* Lead-up; calculation of hero geometry */
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
		var floor = map.pass.length;
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
		var ceil = -1;
		for (var	i = head; i >= 0; i--)
			if (map.pass[i][m] == 1) { 
				ceil = i; 
				break; 
			}
		var ceilPx = (ceil + 1) * map.cellHeight; // ceil in pixels (Y)
		
		/* On the incline surface? */
		if (!interaction.border.floor && (map.pass[slFix][m] == 2 || map.pass[slFix][m] == 3)) this.incline = true;	
		
		/* INTERACTION */
		var harshPush = 0; // categorical horizontal bias
		if (interaction.effect) {
			if (interaction.border.floor && interaction.border.floor < floorPx) {
				floorName = 'dynamic';
				legsPx = interaction.border.floor;
				floorPx = interaction.border.floor;
				this.R.y = interaction.border.floor - this.R.h;
				this.jumpTimer = 0;
				this.jumpPower = 0;
			}
			if (interaction.border.ceil) {
				ceilPx = interaction.border.ceil;
				this.jumpTimer = 0;
			}
			if (interaction.border.left) {
				harshPush = interaction.border.left + map.P.x - this.R.x;
			}
			if (interaction.border.right) {
				harshPush = interaction.border.right + map.P.x - this.R.x - this.R.w;
			}
			
			if (interaction.push.ceil) {
				if (floorName == 'uphill' && legsPx == floorPx) {
					//harshPush = 30;
					//map.debugIns('dsfadsf', 4);
				}
				//if (floorName == 'downhill') harshPush = 10;
			}
			
			/* Hero smashed? */
			//....
		}
		
		/* debug */
		map.debugIns('Hero: ' + this.R.x + ':' + this.R.y + ' | Map: ' + map.P.x + ':' + map.P.y, 0);
		map.debugIns('Floor: ' + floorName + ' / ' + floorPx + ' | Ceil: ' + ceilPx, 1);

		/* on the ground */
		if (legsPx == floorPx) {
			map.debugIns(' >> ground >>', 2); //debug
			this.jumpTimer = 0;
		/* in Air */
		} else if (legsPx < floorPx) {
			map.debugIns(' >> air >>', 2); //debug
			this.inAir = true;			
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
		if (map.pass[slFix][m] == 2 || map.pass[slFix][m] == 3)	
			map.debugIns(' >> ground >>', 2); //debug
		
		/* Jump start */
		if (this.R.y + map.Ph.jumpPower + map.Ph.jumpStart > ceilPx && this.controls[btn.up]) {
			if (legsPx == floorPx) {
				this.R.y += map.Ph.jumpStart;
				this.jumpPower = map.Ph.jumpPower;
				this.jumpTimer = map.Ph.jumpDuration;
			} else if ((map.pass[legs][m] == 2 || map.pass[legs][m] == 3) && legsPx >= floorPx - map.Ph.run) {
				this.R.y += map.Ph.jumpStart;
				this.jumpPower = map.Ph.jumpPower;
				this.jumpTimer = map.Ph.jumpDuration;
			}
		}
		
		/* Run */ 
		// dx - final horizontal bias
		var dx = map.Ph.run; 
		dx = dx * (this.controls[btn.right] - this.controls[btn.left]);
		
		/* Slipping */
		if (!interaction.border.floor && (map.pass[slFix][m] == 2 || map.pass[slFix][m] == 3) && !(this.controls[btn.left] + this.controls[btn.right])) {
			if (map.pass[slFix][m] == 2 && harshPush >= 0) dx = map.Ph.slipping;
			if (map.pass[slFix][m] == 3 && harshPush <= 0) dx = -1 * map.Ph.slipping;
			// specially for this situation: ><
			let z = map.pass[slFix][Math.floor((this.R.x - map.P.x + this.R.w / 2 + dx) / map.cellWidth)];
			if ((z == 2 || z == 3) && z != map.pass[slFix][m]) dx = 0; 
			// inertia fixing some bugs between the blocks
			this.inertia = dx;
		}
		
		/* Inertia */
		// Even after slipping is over, we save motion moment for one more itteration
		if (dx == 0) {
			dx = this.inertia;
			this.inertia = 0;
		}
		
		/* Crawling */
		if (!this.inAir && this.controls[btn.down] && !(map.pass[legs][m] == 2 || map.pass[legs][m] == 3)) {
			dx = map.Ph.crawling * (this.controls[btn.right] - this.controls[btn.left]);
			if (dx * harshPush < 0) dx = 0; // push & dx should be same sign
			this.lay = true;
		}
			
		/* Interaction haul */
		if (interaction.haul * harshPush >= 0) dx += interaction.haul; // push & haul should be same sign
		
		/* Check horizontal barriers*/
		if ((map.pass[head][left] || map.pass[legs][left] == 1 || left < 0) && dx < 0) dx = 0;
		if ((map.pass[head][right] || map.pass[legs][right] == 1 || right > map.pass[0].length - 1) && dx > 0) dx = 0;	
		
		/* Climbing */
		// * it's must be after checking h-barriers
		if (this.R.y - map.Ph.climbing > ceilPx && !interaction.border.floor) {
			if ((map.pass[legs][left] == 2 || map.pass[legs][m] == 2) && this.controls[btn.left] && map.pass[head][left] != 1 && !interaction.border.left) {
				dx = -1 * map.Ph.climbing;
				this.R.y -= map.Ph.climbing;
			}
			if ((map.pass[legs][right] == 3 || map.pass[legs][m] == 3) && this.controls[btn.right] && map.pass[head][right] != 1 && !interaction.border.right) {
				dx = map.Ph.climbing;
				this.R.y -= map.Ph.climbing;
			}
		}
		
		/* Harsh push by moving borders of dynamic objects */
		dx += harshPush;
		
		// Critical check
		if (this.R.y + this.R.h > floorPx) {
			if (!interaction.border.ceil) this.R.y = floorPx - this.R.h; // FIX to the ground
			dx = 0;
		}
		
		/* Final accept DX to Hero or Map position */
		if (dx > 0 && this.R.x + dx < map.heroView || dx < 0 && this.R.x + dx > map.heroView) {
			this.R.x += dx;
		} else if (map.P.x - dx <= 0 && map.P.x - dx >= (map.width - screenWidth) * -1 && !map.screenFrozen) {
			map.P.x -= dx;
		} else {
			this.R.x += dx;
		}
		
		/* Set action */
		if (this.inAir && (this.controls[btn.left] + this.controls[btn.right]) && (map.pass[legs][m] == 2 || map.pass[legs][m] == 3)) this.action = act.climbing;
		else if (this.inAir && (map.pass[slFix][m] == 2 || map.pass[slFix][m] == 3)) this.action = act.slipping;		
		else if (this.R.y + this.R.h < floorPx - 10) this.action = act.jump;
		else if (this.controls[btn.down] && !(map.pass[legs][m] == 2 || map.pass[legs][m] == 3)) this.action = act.crawling;
		else if ((this.controls[btn.left] + this.controls[btn.right]) && dx) this.action = act.run;
		else this.action = act.stop;
		
		/* sprite delta */
		this.n = ((this.controls[btn.left] + this.controls[btn.right]) && dx) ? 1 - this.n : 0;
		
		return true;
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
	
	Draw() {
		document.getElementById("deep-space").style.left = map.P.x + 'px';
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
			/* Specific trigger for every "F" on the map */
			{
				sym: 'F',
				trigger: '?landed:en:#\n00 sprite:en:#:0\n00 pass:en:#:0\n00 dynamic:create:en:#:32:32:0:6\n05 dynamic:move:$:0:10\n20 dynamic:destroy:$'
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
			},
			/* Dynamic example */
			{
				sym: '',
				trigger: '00 dynamic:create:400:410:32:32:0:6'
			},
			{
				sym: '',
				trigger: '00 dynamic:move:0:-1:0\n50 dynamic:move:0:1:0\nR 100'
			}
		);
		
		
		this.Ph = new Object();
		this.Ph.gravity = 10; // X px per timer-period in falling
		this.Ph.jumpPower = -6; // X px in lift
		this.Ph.jumpDuration = 12; // Jump period in timer-periods
		this.Ph.jumpStart = -3; // First phase of jump spurt
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
			"invisible.gif",					// X
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
		this.lookTranslation = 'XJjWBRFGAS'; // look indexes
		this.entity = new Array();
		
		this.passability = 'H D^WBRGAS'; // passability = 0 (can pass)
		
		this.passTranslation = '**><j'; // passability indexes (>=2)
		
		/* Demo Map structure */
		this.structure = new Array(
			"____________________________________________________________",
			"                                                            ",
			"                                                            ",
			"                                                            ",
			"                                                            ",
			"                                                            ",
			"                  =                                        R",
			"                  #                                       ==",
			"                  #                                       ##",
			"                  #                                    F  ##",
			"H                 #                                       ##",
			"==>   <>          #         J                       F     ##",
			"###> <##>       J #        <=      J          FFFF        ##",
			"####=####^^^^^^^=^#^^^===^^##^^^^^^=^^^^^^=^^^^^^^^^^^^^^^##"
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
		if (this.dbg)
			document.write('<span id="debug">Debug info</span>');
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
		hero.clearControls();
		hero.jumpTimer = 0;
		
		if (typeof(this.trigger) !== 'undefined')
			this.finalizeTriggers(hero);
		
		/* Load from text */
		if (typeof(mapText) !== 'undefined') {
			this.gears = new Array();
			var value;
			/* options */
			this.dbg = readBool(mapText, 'options', 'debug', this.dbg);
			this.planet = readValue(mapText, 'options', 'planet', this.planet);
			this.background  = readValue(mapText, 'options', 'background', this.background);
			this.cellWidth = readInt(mapText, 'options', 'cellWidth', this.cellWidth);
			this.cellHeight = readInt(mapText, 'options', 'cellHeight', this.cellHeight);
			this.heroView = readInt(mapText, 'options', 'heroView', this.heroView);			
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
						t = '';
					}
					else
						t += (t != '') ? '\n' + value[i] : value[i];
			}
			/* end of reading */
		}
		
		this.screenFrozen = false;
		this.P = new Point(0, 0);
		var m = document.getElementById("deep-space");
		if (m != null) m.style.left = this.P.x + 'px';
		
		if (typeof(this.dynamic) !== 'undefined')
			this.drawDynamic(); //destroy dynamic elements if existed
				
		this.trigger = new Array();
		this.dynamic = new Array();
		this.entity = new Array();
		
		// Duplicate string-map with byte-map
		// * Create passability byte matrix (0/1) is probably faster operating with 
		this.pass = new Array(this.structure.length);
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
						if (this.gears[z].sym == this.structure[i][j]) {							
							this.trigger.push(new Trigger(this.gears[z].trigger.replace(new RegExp('#', 'g'), this.entity.length - 1)));
							//console.log(this.gears[z].trigger.replace(new RegExp('#', 'g'), this.entity.length - 1));
						}
				}
			}
		}
		for (var i = 0; i < this.gears.length; i++) 
			if (this.gears[i].sym == '') this.trigger.push(new Trigger(this.gears[i].trigger));
	}
	
	draw(i, prefix = 'entity') {
		var en = document.getElementById(prefix + i);
		if (en == null) {
			en = document.createElement('img');
			en.id = prefix + i;
			en.className = prefix;
			document.body.appendChild(en);
		}
		
		switch (prefix) {
			case "entity":
				en.width = this.cellWidth;
				en.height = this.cellHeight;
				if (this.entity[i].sprite != this.entity[i].prevSprite) {
					en.src = 'entity/' + this.planet + '/' + this.look[this.entity[i].sprite];
					this.entity[i].prevSprite = this.entity[i].sprite;
				}
				en.style.left = (this.entity[i].x * this.cellWidth + this.P.x) + 'px'; 
				en.style.top = (this.entity[i].y * this.cellHeight + this.P.y) + 'px';
				break;
			case "dynamic":
				en.width = this.dynamic[i].R.w;
				en.height = this.dynamic[i].R.h;
				if (this.dynamic[i].sprite != this.dynamic[i].prevSprite) {
					en.src = 'entity/' + this.planet + '/' + this.look[this.dynamic[i].sprite];
					this.dynamic[i].prevSprite = this.dynamic[i].sprite;
				}
				en.style.left = (this.dynamic[i].R.x + this.P.x) + 'px'; 
				en.style.top = (this.dynamic[i].R.y + this.P.y) + 'px';					
				break;
		}
	}
	
	drawEntity(id = -1) {
		if (id >= 0) this.draw(id);
		else for (var i = 0; i < this.entity.length; i++) this.draw(i);
	}
	
	drawDynamic(id = -1) {
		if (id >= 0) this.draw(id, 'dynamic');
		else for (var i = 0; i < this.dynamic.length; i++) 
			if (this.dynamic[i].exist)	this.draw(i, 'dynamic')
				else if (this.dynamic[i].sprite >= 0) {
					this.dynamic[i].sprite = -1;
					var en = document.getElementById('dynamic' + i);
					if (en != null) en.remove();
				}
	}	
	
	finalizeTriggers(hero) {
		for (var i = 0; i < this.trigger.length; i++)
			this.trigger[i].finalize(hero, this);
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
var tsk = Object.freeze({"sprite": 0, "pass": 1, "jump": 2, "teleport": 3, "message": 4, "clear": 5, "dynamic": 6}); 

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
				var x = Math.floor((hero.R.x - map.P.x + hero.R.w / 2) / map.cellWidth);
				var y = Math.floor((hero.R.y - map.P.y + 10) / map.cellHeight); // +10 is imprecise but working fix.. 
				switch (this.aspect) {
					case sub.entity:
					case sub.foe:
						if ((x == map.entity[this.id].x && (y + 1 == map.entity[this.id].y) && !hero.inAir) == this.mode) return true;
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
			case "dynamic": this.mission = tsk.dynamic; break;
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
		this.bag = '';
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
			this.timer = 0;
		}
		if (this.timer >= 0) {
			for (var i = 0; i < this.roster.length; i++)
				if (this.roster[i].timer == this.timer && this.roster[i].led.check(hero, map)) {
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
						/* Dynamic object */
						case tsk.dynamic:
							switch (this.roster[i].T.params[0]) {
								case 'create':
									if (this.roster[i].T.params[1] == sub.entity) {
										map.dynamic.push(new Dynamic(
											map.entity[this.roster[i].T.params[2] * 1.0].x * map.cellWidth,
											map.entity[this.roster[i].T.params[2] * 1.0].y * map.cellHeight,
											this.roster[i].T.params[3] * 1.0,
											this.roster[i].T.params[4] * 1.0,
											this.roster[i].T.params[5] * 1.0,
											this.roster[i].T.params[6] * 1.0
										));
									} else {
										map.dynamic.push(new Dynamic(
											this.roster[i].T.params[1] * 1.0,
											this.roster[i].T.params[2] * 1.0,
											this.roster[i].T.params[3] * 1.0,
											this.roster[i].T.params[4] * 1.0,
											this.roster[i].T.params[5] * 1.0,
											this.roster[i].T.params[6] * 1.0
										));
									}
									this.bag = map.dynamic.length - 1;
									break;
								case 'move':
									var id = (this.roster[i].T.params[1] != '$') ? this.roster[i].T.params[1] * 1.0 : this.bag * 1.0;
									map.dynamic[id].move(this.roster[i].T.params[2] * 1.0, this.roster[i].T.params[3] * 1.0);
									break;
								case 'stop':
									var id = (this.roster[i].T.params[1] != '$') ? this.roster[i].T.params[1] * 1.0 : this.bag * 1.0;
									map.dynamic[id].stop();
									break;
								case 'destroy':
									var id = (this.roster[i].T.params[1] != '$') ? this.roster[i].T.params[1] * 1.0 : this.bag * 1.0;
									map.dynamic[id].destroy();
									break;
							}
							break;
					}
				}
			if (this.timer < 10000) this.timer++;
			if (this.timer == this.restore) {
				this.timer = -1;
			}
		}
	}
	
}



/* >> 03. DYNAMICS >> >> */

class Dynamic {

	constructor(x, y, width, height, border, sprite) {
		this.R = new Rect(x - border, y - border, width + border * 2, height + border * 2);
		this.sprite = sprite;
		this.prevSprite = -1;
		this.dx = 0;
		this.dy = 0;
		this.exist = true;
	}
	
	move(dx = 0, dy = 0) {
		this.dx = dx;
		this.dy = dy;
	}
	
	stop() {
		this.dx = 0;
		this.dy = 0;
	}
	
	destroy() {
		this.exist = false;
	}
	
	movement(hero, map) {
		if (!this.exist) return false;
		/* Interaction of concrete object and hero */
		var interaction = new Object({
			effect: false,
			haul: 0, //can be only horizontal, when hero landed on moving object
			push: {left: 0, right: 0, floor: 0, ceil: 0}, // physical push to hero
			border: {left: 0, right: 0, floor: 0, ceil: 0} // hero geometry shoud not cross this borders
			});
		/* Hero geometry */
		var left = hero.R.x - map.P.x;
		var mid = hero.R.x - map.P.x + hero.R.w / 2;
		var right = hero.R.x - map.P.x + hero.R.w;
		var top = hero.R.y - map.P.y; 
		var bottom = hero.R.y - map.P.y + hero.R.h;
		var hR = new Rect(left + 5, top, hero.R.w - 10, hero.R.h + this.dy);
		/* Moving dynamic object */
		this.R.x += this.dx;
		this.R.y += this.dy;
		/* Set interaction, if object crossing with hero geometry */
		if (this.R.isCrossWith(hR)) {
			interaction.effect = true;
			
			
			
			
			// else if -> if ? to fix incline problem
			
			
			
			
			
			if (mid >= this.R.left && mid < this.R.right && bottom < this.R.top + this.R.height / 2) {
				interaction.haul = this.dx;
				interaction.push.floor = (this.dy < 0) ? this.dy : 0;
				interaction.border.floor = this.R.top;
			} else if (mid >= this.R.left && mid < this.R.right) {
				interaction.push.ceil = (this.dy > 0) ? this.dy : 0;
				interaction.border.ceil = this.R.bottom;
			} else if (top < this.R.bottom - 2 && bottom > this.R.top + 2 && mid < this.R.left + this.R.width / 2) {
				interaction.push.right = (this.dx < 0) ? this.dx : 0;
				interaction.border.right = this.R.left + 5;
			} else if (top < this.R.bottom - 2 && bottom > this.R.top + 2) {
				interaction.push.left = (this.dx > 0) ? this.dx : 0;
				interaction.border.left = this.R.right - 5;
			}
		}
		return interaction;
	}
}



/* >> 04. KEYBOARD >> >> */

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



/* >> 05. START >> >> */

var screenWidth = 640;

var hero = new Hero('Jimmy');
var map = new Map();

map.load(hero, maps.debug); //tests

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
	if (hero.R.isCrossWith(map.finish, map.P.x, map.P.y)) {
		map.debugIns('Level complete!', 5);
		map.load(hero);
	}
	
	/* Check fell into chasm */
	if (hero.R.bottom >= map.height - map.cellHeight / 2) {
		map.debugIns('Fell into chasm :(', 5);
		map.load(hero);
	}
	
	/* Triggers */
	for (var i = 0; i < map.trigger.length; i++) 
		map.trigger[i].launcher(hero, map);
	
	/* Dynamics */
	var interaction = new Object({
		effect: false,
		haul: 0, 
		push: {left: 0, right: 0, floor: 0, ceil: 0}, 
		border: {left: 0, right: 0, floor: 0, ceil: 0} 
		});
	// Sum up interaction of all dynamic objects into result interaction
	for (var i = 0; i < map.dynamic.length; i++) {
		var z = map.dynamic[i].movement(hero, map);
		if (z.effect) {
			interaction.effect = true;
			if (z.border.floor != 0 && (z.border.floor < interaction.border.floor || interaction.border.floor == 0)) {
				interaction.border.floor = z.border.floor;
				interaction.push.floor = z.push.floor;
				interaction.haul = z.haul;
			}
			if (z.border.ceil != 0 && z.border.ceil > interaction.border.ceil || interaction.border.ceil == 0) { 
				interaction.border.ceil = z.border.ceil;
				interaction.push.ceil = z.push.ceil;
			}
			if (z.border.left != 0 && z.border.left > interaction.border.left || interaction.border.left == 0) { 
				interaction.border.left = z.border.left;
				interaction.push.left = z.push.left;
			}
			if (z.border.right != 0 && z.border.right < interaction.border.right || interaction.border.right == 0) { 
				interaction.border.right = z.border.right;
				interaction.push.right = z.push.right;
			}
		}
	}
	
	/* Hero movement */
	if (!hero.movement(map, interaction)) {
		map.debugIns('Flatten & compressed :(', 5);
		map.load(hero);
	}
	
	hero.Draw();
	map.drawEntity();
	map.drawDynamic();

	map.gameTimer++;
	gameProcess = setTimeout("game()", interval);
}

/* The end <"-)_(-"> */