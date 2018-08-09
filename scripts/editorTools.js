const EditorTools = {
  enabled: false,
  ready: false,
  modes: ["Box","Line","Sprite"],
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
        let width = Math.abs(xx-this.x), height = Math.abs(yy-this.y);
        if (globalKeyboard.pressed("Shift")) {
          width = height = Math.min(width,height);
        }
        let x = Math.min(xx,this.x);
        let y = Math.max(yy,this.y);
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
        let width = Pointer.camX()-this.x, height = Pointer.camY()-this.y;
        if (globalKeyboard.pressed("Shift")) {
          width = height = Math.min(width,height);
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
    collisionType: C_LINE,
    direction: LINE_UP,
    onClick: function() {
      if (this.x==null||this.y==null) {
        this.x = Pointer.camX();
        this.y = Pointer.camY();
      }
      else {
        let xx = Pointer.camX(), yy = Pointer.camY();
        let definition = {
          type: 1,
          properties: [this.lineWidth,this.stroke,this.direction],
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
        if (globalKeyboard.pressed("Shift")) {
          let line = new Line(this.x,this.y,Pointer.camX(),Pointer.camY());
          let angle = Math.abs(line.angle()*180/Math.PI);
          if (angle%15<=7) { //round down
            angle = angle - angle%15;
          }
          else { //round up
            angle = angle + 15 - angle%15;
          }
          //now make the new target
        }
        drawLine(this.x,this.y,Pointer.camX(),Pointer.camY());
      }
    },
    getPropStrings: function() {
      return {
        names: ["stroke","lineWidth","collisionType","direction"],
        types: ["string","number","number","number"]
      }
    }
  },
  Sprite: {
    id: 10,
    properties: [],
    tempSprite: null,
    onClick: function() {
      if (SpriteManager.getSpriteValueNames(this.id).length==0) return;
      let propNum = G$("EditPropView").propNum;
      if (propNum>1) {
        for (var i = 1; i < propNum; i++) {
          if (this.properties[i-1]==void(0)) return;
        }
      }
      let x = Pointer.camX(), y = Pointer.camY();
      let data = [this.id,x,y,...this.properties];
      SpriteManager.make(...data);
      Level.addSpriteData(data);
    },
    erase: function() {
      let sprite = this.parent.findAt(Pointer.camX(),Pointer.camY(),2);
      if (sprite) {
        Level.removeSpriteData(sprite.rawSpriteData);
        sprite.remove();
      }
    },
    clear: function() {

    },
    draw: function() {
      if (this.tempSprite==null) this.refreshTempSprite();
      if (this.tempSprite!=null) {
        this.tempSprite.x = Pointer.camX();
        this.tempSprite.y = Pointer.camY();
        this.tempSprite.draw();
      }
    },
    refreshTempSprite: function() {
      if (this.tempSprite!=null) delete this.tempSprite;
      if (SpriteManager.getSpriteValueNames(this.id).length==0) return this.tempSprite = null;
      let x = Pointer.camX(), y = Pointer.camY();
      this.tempSprite = SpriteManager.makeGhostSprite(this.id,x,y,...this.properties);
    },
    getPropStrings: function() {
      // let count = SpriteManager.getSpriteValuesLength(this.id) - 2; //get rid of x and y
      let vals = SpriteManager.getSpriteValueNames(this.id);
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
    this.Sprite.clear();
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
        if (all[i].isTerrain&&!(all[i] instanceof SolidLineHitBox)&&all[i].containsPoint(x,y)) return all[i];
      }
    }
  	if (type==1||tryAll) {
      let all = SolidLine.getAll().reverse();
  		for (var i in all) {
  			if (all[i].isTerrain&&all[i].hitbox.containsPoint(x,y)) {
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
        if (all[i].isSprite&&all[i].containsPoint(x,y)) return all[i];
      }
    }
  },
  getToolProperties: function() {
    let tool = this[this.getModeText()];
    let strings = tool.getPropStrings();
    let props = [];
    let prop = function(name,type,index,checkSprite) {
      this.name = name;
      if (checkSprite&&index>0) {
        this.val = tool.properties[index-1];
        tool.propNum = index;
      }
      else this.val = tool[name];
      this.type = type;
      props.push(this);
    }
    for (var i = 0; i < strings.names.length; i++) new prop(strings.names[i],strings.types[i],i,tool==this.Sprite);
    return props;
  },
  setToolProperty: function(name,val,sourceIndex) {
    let tool = this[this.getModeText()];
    if (tool==this.Sprite&&sourceIndex>0) {
      if (!isNaN(parseFloat(val))) val = parseFloat(val);
      tool.properties[sourceIndex-1] = val;
      tool.refreshTempSprite();
    }
    else if (tool[name]!==void(0)) {
      tool[name] = val;
      if (name=="id"&&tool==this.Sprite) {
        tool.properties = [];
        tool.refreshTempSprite();
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
        if (thing) thing.drawHighlighted();
      }
      else {
        this[this.getModeText()].draw();
      }
    }
  }
}
