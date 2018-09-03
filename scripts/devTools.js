const DevTools = {
  LineMaker: {
  	mode: 'line',
  	x: null,
  	y: null,
  	xx: null,
  	yy: null,
  	dir: null,
  	fill: "",
  	size: 1,
  	isBuilding: false,
  	clear: function() {
  		this.x = this.y = this.xx = this.yy = this.dir = null;
  		this.isBuilding = false;
  	},
  	makeLine: function() {
      var properties = [this.x,this.y,this.xx,this.yy,this.size,this.fill,this.dir];
  		Line.create(...properties);
  		this.clear();
  	},
  	makeBox: function() {
      var properties = [this.x,this.y,this.xx-this.x,this.yy-this.y,this.fill,null,true,C_INFINIMASS,false,0];
      PhysicsBox.create(...properties);
      this.clear();
  	},
  	input: function(x,y) {
  		if (this.x==null) {
  			this.x = x;
  			this.y = y;
  		}
  		else switch(this.mode) {
  			case 'line':
  				if (this.xx==null) {
  					this.xx = x;
  					this.yy = y;
  				}
  				else if (this.dir) {
  					this.makeLine();
  				}
  				break;
  			case 'box':
  				this.makeBox(x,y);
  		}
  	},
  	calcDir: function(x,y) {
  		if (!this.xx) return 0;
  		var midX = (this.xx-this.x)/2+this.x;
  		var midY = (this.yy-this.y)/2+this.y;
  		var slope = Math.abs((y-midY)/(x-midX));
  		if (y<midY&&slope>1) return this.dir = LINE_UP;
  		else if (y>midY&&slope>1) return this.dir = LINE_DOWN;
  		else if (x>midX&&slope<1) return this.dir = LINE_RIGHT;
  		else if (x<midX&&slope<1) return this.dir = LINE_LEFT;
  		else return this.dir = 0;
  	},
  	getColor: function(dir) {
  		switch(dir) {
  			case LINE_DOWN: return "red";
  			case LINE_LEFT: return "green";
  			case LINE_RIGHT: return "orange";
  			case LINE_UP: return "blue";
  			default: return "darkGray";
  		}
  	},
  	draw: function() {
      if (!G$("DevPencil").on||G$("DevEraser").on||this.x==null) return;
  		c.lineWidth = 1;
  		switch(this.mode) {
  			case 'line':
  				if (this.xx==null) {
  					c.strokeStyle = "hotpink";
  					drawLine(this.x,this.y,Pointer.camX(),Pointer.camY());
  				}
  				else {
  					var midX = (this.xx-this.x)/2+this.x;
  					var midY = (this.yy-this.y)/2+this.y;
  					c.strokeStyle = this.getColor(this.calcDir(Pointer.camX(),Pointer.camY()));
  					drawLine(midX,midY,Pointer.camX(),Pointer.camY());
  					c.strokeStyle = "darkGray";
  					drawLine(this.x,this.y,this.xx,this.yy);
  				}
  				break;
  			case 'box':
  				if (this.xx==null) {
  					c.strokeStyle = "hotpink";
  					c.strokeRect(this.x,this.y,Pointer.camX(),Pointer.camY());
  				}
  		}
  	}
  },
  onClick: function() {
    if (!G$("DevEraser").on) {
      if (G$("DevSpawnPM").on) addPM(Pointer.camX(),Pointer.camY());
      else if (G$("DevPencil").on) DevTools.LineMaker.input(Pointer.camX(),Pointer.camY());
    }
    else {
      var type = G$("DevSpawnPM").on?0:1;
      var thing = findTopThing(Pointer.camX(),Pointer.camY(),type);
      if (thing) {
        Particle.generate(Pointer.camX(),Pointer.camY(),0,15,5,30,false,type==0?"#6a00d8":thing.stroke,-90,45,8,2);
        thing.remove();
      }
    }
  }
}
