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