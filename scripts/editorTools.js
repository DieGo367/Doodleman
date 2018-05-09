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
        c.strokeRect(this.x,this.y,Pointer.camX()-this.x,Pointer.camY()-this.y);
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
    onClick: function() {
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
      this.id = 10;
    },
    draw: function() {

    },
    getPropStrings: function() {
      //let count = SpriteManager.getSpriteValueCount() - 2;
      let count = 0;
      let props = {
        names: [],
        types: []
      }
      for (var i in count) {
        props.names.push("i");
        props.types.push("string");
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
      if (button.on) Pointer.cursor = [POINTER_PENCIL,POINTER_PENCIL,POINTER_CROSSHAIR][this.mode];
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
      let all = Enemy.getAll().reverse();
      for (var i in all) {
        if (all[i].isSprite&&all[i].containsPoint(x,y)) return all[i];
      }
    }
  },
  getToolProperties: function(type) {
    let tool = this[type==void(0)?this.getModeText():type];
    let strings = tool.getPropStrings();
    let props = [];
    let prop = function(name,val,type) {
      this.name = name;
      this.val = val;
      this.type = type;
      props.push(this);
    }
    for (var i in strings.names) new prop(strings.names[i],tool[strings.names[i]],strings.types[i]);
    return props;
  },
  setToolProperty: function(name,val) {
    let tool = this[this.getModeText()];
    if (tool[name]!==void(0)) {
      tool[name] = val;
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
