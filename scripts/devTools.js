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
  		SolidLine.create(this.x,this.y,this.xx,this.yy,this.size,this.fill,this.dir);
  		output.show();
  		output.html(output.html()+"\nSolidLine:"+this.x+","+this.y+","+this.xx+","+this.yy+","+(this.fill?this.fill:"null")+","+this.dir);
  		this.clear();
  	},
  	makeBox: function() {
  		PhysicsBox.create(this.x,this.y,this.xx-this.x,this.yy-this.y,this.fill,null,true,C_INFINIMASS,false,0);
  		output.show();
  		output.html(output.html()+"\nPhysicsBox:"+this.x+","+this.y+","+(this.xx-this.x)+","+(this.yy-this.y)+","+(this.fill?this.fill:"null")+",null,true,C_INFINIMASS,false,0");
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
      if (!G$("DevPencil").on||G$("DevEraser").on||LineMaker.x==null) return;
  		c.lineWidth = 1;
  		switch(this.mode) {
  			case 'line':
  				if (LineMaker.xx==null) {
  					c.strokeStyle = "hotpink";
  					drawLine(LineMaker.x,LineMaker.y,Pointer.camX(),Pointer.camY());
  				}
  				else {
  					var midX = (LineMaker.xx-LineMaker.x)/2+LineMaker.x;
  					var midY = (LineMaker.yy-LineMaker.y)/2+LineMaker.y;
  					c.strokeStyle = LineMaker.getColor(LineMaker.calcDir(Pointer.camX(),Pointer.camY()));
  					drawLine(midX,midY,Pointer.camX(),Pointer.camY());
  					c.strokeStyle = "darkGray";
  					drawLine(LineMaker.x,LineMaker.y,LineMaker.xx,LineMaker.yy);
  				}
  				break;
  			case 'box':
  				if (LineMaker.xx==null) {
  					c.strokeStyle = "hotpink";
  					c.strokeRect(LineMaker.x,LineMaker.y,Pointer.camX(),Pointer.camY());
  				}
  		}
  	}
  }
}
