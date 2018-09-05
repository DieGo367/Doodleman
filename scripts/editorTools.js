const EditorTools = {
  enabled: false,
  ready: false,
  modes: ["Box","Line","Actor"],
  mode: 0,
  eraserOn: false,
  Box: {
    x: null,
    y: null,
    color: "black",
    img: null,
    collisionType: C_INFINIMASS,
    onClick: function() {
      if (this.x==null||this.y==null) {
        this.x = Pointer.camX();
        this.y = Pointer.camY();
      }
      else {
        let xx = Pointer.camX(), yy = Pointer.camY();
        let width = xx-this.x, height = yy-this.y;
        if (globalKeyboard.pressed("Shift")) {
          let size = Math.min(Math.abs(width),Math.abs(height));
          width = (xx<this.x?-1:1)*size;
          height = (yy<this.y?-1:1)*size;
        }
        let x = this.x, y = this.y;
        if (width<0) x += width;
        if (height>0) y += height;
        width = Math.abs(width);
        height = Math.abs(height);
        let definition = {
          type: 0,
          properties: [this.color,this.img,true,this.collisionType],
          pieces: [[x,y,width,height]]
        };
        TerrainManager.make(definition);
        Level.addTerrainData(definition);
        this.clear();
      }
    },
    erase: function() {
      let box = this.parent.findAt(Pointer.camX(),Pointer.camY(),0);
      if (box) {
        Level.removeTerrainData(box.rawTerrainData);
        box.remove();
      }
    },
    clear: function() {
      this.x = null;
      this.y = null;
    },
    draw: function() {
      if (this.x==null||this.y==null) return;
      else {
        c.strokeStyle = "hotpink";
        let xx = Pointer.camX(), yy = Pointer.camY();
        let width = xx-this.x, height = yy-this.y;
        if (globalKeyboard.pressed("Shift")) {
          let size = Math.min(Math.abs(width),Math.abs(height));
          width = (xx<this.x?-1:1)*size;
          height = (yy<this.y?-1:1)*size;
        }
        c.strokeRect(this.x,this.y,width,height);
      }
    },
    getPropStrings: function() {
      return {
        names: ["color","img","collisionType"],
        types: ["string","string","number"]
      }
    }
  },
  Line: {
    x: null,
    y: null,
    stroke: "black",
    lineWidth: 1,
    direction: LINE_UP,
    useBoxCorners: true,
    onClick: function() {
      if (this.x==null||this.y==null) {
        this.x = Pointer.camX();
        this.y = Pointer.camY();
      }
      else {
        let xx = Pointer.camX(), yy = Pointer.camY();
        if (globalKeyboard.pressed("Shift")) {
          let angledPt = this.calcLineSnap();
          xx = angledPt[0];
          yy = angledPt[1];
        }
        let definition = {
          type: 1,
          properties: [this.lineWidth,this.stroke,this.direction,this.useBoxCorners],
          pieces: [[this.x,this.y,xx,yy]]
        };
        TerrainManager.make(definition);
        Level.addTerrainData(definition);
        this.clear();
      }
    },
    erase: function() {
      let line = this.parent.findAt(Pointer.camX(),Pointer.camY(),1);
      if (line) {
        Level.removeTerrainData(line.rawTerrainData);
        line.remove();
      }
    },
    clear: function() {
      this.x = null;
      this.y = null;
    },
    draw: function() {
      if (this.x==null||this.y==null) return;
      else {
        c.strokeStyle = "hotpink";
        let xx = Pointer.camX(), yy = Pointer.camY();
        if (globalKeyboard.pressed("Shift")) {
          let angledPt = this.calcLineSnap();
          xx = angledPt[0], yy = angledPt[1];
        }
        drawLine(this.x,this.y,Pointer.camX(),Pointer.camY());
        if (devEnabled) c.strokeText(toDegrees(new Line(this.x,this.y,xx,yy).angle2()),Pointer.x+40,Pointer.y+40);
      }
    },
    getPropStrings: function() {
      return {
        names: ["stroke","lineWidth","direction","useBoxCorners"],
        types: ["string","number","number","boolean"]
      }
    },
    calcLineSnap: function() {
      // Returns new destination point [xx,yy] for line creation by snapping it to angles of 15 degrees

      let x = this.x, y = this.y, xx = Pointer.camX(), yy = Pointer.camY();
      let line = new Line(x,y,xx,yy);
      // find our new angle
      let angle = toDegrees(line.angle2()) + 180;
      let newAngle = 0;
      if (angle%15<=7) { //round down
        newAngle = Math.round(angle - angle%15);
      }
      else { //round up
        newAngle = Math.round(angle + 15 - angle%15);
      }

      // convert back to radians
      let angleDiffRad = toRadians(newAngle-angle);
      let newAngleRad = toRadians(newAngle);

      // find our new magnitude
      let oldMag = Math.sqrt(Math.pow(xx-x,2)+Math.pow(yy-y,2));
      let newMag = oldMag * Math.cos(angleDiffRad);

      // adjust our points to match new line
      xx = x - newMag * Math.cos(newAngleRad);
      yy = y - newMag * Math.sin(newAngleRad);

      return [xx,yy];
    }
  },
  Actor: {
    id: 10,
    properties: [],
    tempActor: null,
    onClick: function() {
      if (ActorManager.getActorValueNames(this.id).length==0) return;
      let propNum = G$("EditPropView").propNum;
      if (propNum>1) {
        for (var i = 1; i < propNum; i++) {
          if (this.properties[i-1]==void(0)) return;
        }
      }
      let x = Pointer.camX(), y = Pointer.camY();
      let data = [this.id,x,y,...this.properties];
      ActorManager.make(...data);
      Level.addActorData(data);
    },
    erase: function() {
      let actor = this.parent.findAt(Pointer.camX(),Pointer.camY(),2);
      if (actor) {
        Level.removeActorData(actor.rawActorData);
        actor.remove();
      }
    },
    clear: function() {

    },
    draw: function() {
      if (this.tempActor==null) this.refreshTempActor();
      if (this.tempActor!=null) {
        this.tempActor.x = Pointer.camX();
        this.tempActor.y = Pointer.camY();
        this.tempActor.draw();
      }
    },
    refreshTempActor: function() {
      if (this.tempActor!=null) delete this.tempActor;
      if (ActorManager.getActorValueNames(this.id).length==0) return this.tempActor = null;
      let x = Pointer.camX(), y = Pointer.camY();
      this.tempActor = ActorManager.makeGhostActor(this.id,x,y,...this.properties);
    },
    getPropStrings: function() {
      let vals = ActorManager.getActorValueNames(this.id);
      let props = {
        names: ["id"],
        types: ["number"]
      }
      for (var i = 2; i < vals.length; i++) { //start at 2 to skip x and y
        let name = vals[i];
        if (name.charAt(0)=="#") {
          name = name.slice(1);
          props.types.push("number");
        }
        else if (name.charAt(0)=="?") {
          name = name.slice(1);
          props.types.push("boolean");
        }
        else props.types.push("string");
        props.names.push(name);
      }
      return props;
    }
  },
  init: function() {
    for (var i in this.modes) {
      this[this.modes[i]].parent = this;
    }
    this.ready = true;
  },
  onClick: function() {
    let tool = this[this.getModeText()];
    let button = G$(this.getModeText()+"Tool");
    if (button.on) {
      if (this.eraserOn) tool.erase();
      else tool.onClick();
    }
  },
  setMode: function(mode) {
    if (!this.ready) this.init();
    this.mode = mode;
    G$("EditorModeText").text = this.getModeText();
    let p = G$("EditPropBttn");
    if (p.on) p.states[0].call(p);
    this.setEraserOn(false);
  },
  getModeText: function() {
    return this.modes[this.mode];
  },
  setEraserOn: function(bool) {
    this.eraserOn = !!bool;
    this.Box.clear();
    this.Line.clear();
    this.Actor.clear();
    this.setCursor();
  },
  setCursor: function() {
    if (this.eraserOn) Pointer.cursor = POINTER_ERASER;
    else {
      let button = G$(this.getModeText()+"Tool");
      if (button.on) Pointer.cursor = [POINTER_PENCIL,POINTER_PENCIL,POINTER_NONE][this.mode];
      else Pointer.cursor = POINTER_CROSSHAIR;
    }
  },
  findAt: function(x,y,type) {
    let tryAll = (type==void(0));
    if (type==0||tryAll) {
      let all = PhysicsBox.getAll().reverse();
      for (var i in all) {
        if (all[i].isTerrain&&!(all[i] instanceof Line)&&all[i].containsPoint(x,y)) return all[i];
      }
    }
  	if (type==1||tryAll) {
      let all = Line.getAll().reverse();
  		for (var i in all) {
  			if (all[i].isTerrain&&all[i].hitboxContainsPoint(x,y)) {
  				let lx = all[i].valueAt(y,'y');
  				let ly = all[i].valueAt(x,'x');
  				let diffX = Math.abs(x-lx);
  				let diffY = Math.abs(y-ly);
  				let slope = Math.abs(all[i].slope());
  				if ((slope=="vertical tangent"||slope>50)&&diffX<15) return all[i];
  				if (diffY<15) return all[i];
  			}
  		}
  	}
    if (type==2||tryAll) {
      let all = Box.getAll().reverse();
      for (var i in all) {
        if (all[i].isActor&&all[i].containsPoint(x,y)) return all[i];
      }
    }
  },
  getToolProperties: function() {
    let tool = this[this.getModeText()];
    let strings = tool.getPropStrings();
    let props = [];
    let prop = function(name,type,index,checkActor) {
      this.name = name;
      if (checkActor&&index>0) {
        this.val = tool.properties[index-1];
        tool.propNum = index;
      }
      else this.val = tool[name];
      this.type = type;
      props.push(this);
    }
    for (var i = 0; i < strings.names.length; i++) new prop(strings.names[i],strings.types[i],i,tool==this.Actor);
    return props;
  },
  setToolProperty: function(name,val,sourceIndex) {
    let tool = this[this.getModeText()];
    if (tool==this.Actor&&sourceIndex>0) {
      if (!isNaN(parseFloat(val))) val = parseFloat(val);
      tool.properties[sourceIndex-1] = val;
      tool.refreshTempActor();
    }
    else if (tool[name]!==void(0)) {
      tool[name] = val;
      if (name=="id"&&tool==this.Actor) {
        tool.properties = [];
        tool.refreshTempActor();
        this.propNum = 0;
        let p = G$("EditPropBttn");
        p.states[0].call(p);
      }
    }
  },
  draw: function() {
    let button = G$(this.getModeText()+"Tool");
    if (button.on) {
      if (this.eraserOn) {
        let thing = this.findAt(Pointer.camX(),Pointer.camY(),this.mode);
        if (thing) thing.drawHighlighted("red");
      }
      else {
        this[this.getModeText()].draw();
      }
    }
  }
}
