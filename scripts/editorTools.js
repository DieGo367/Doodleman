const EditorTools = {
  enabled: false,
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
      let box = EditorTools.findAt(Pointer.camX(),Pointer.camY(),0);
      if (box) {
        Level.removeTerrainData(box.rawTerrainData);
        box.remove();
      }
    },
    clear: function() {
      this.x = null;
      this.y = null;
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
      let line = EditorTools.findAt(Pointer.camX(),Pointer.camY(),1);
      if (line) {
        Level.removeTerrainData(line.rawTerrainData);
        line.remove();
      }
    },
    clear: function() {
      this.x = null;
      this.y = null;
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
      let sprite = EditorTools.findAt(Pointer.camX(),Pointer.camY(),2);
      if (sprite) {
        Level.removeSpriteData(sprite.rawSpriteData);
        sprite.remove();
      }
    },
    clear: function() {
      this.id = 10;
    }
  },
  onClick: function() {
    let tool = [this.Box,this.Line,this.Sprite][this.mode];
    let button = G$(["BoxTool","LineTool","SpriteTool"][this.mode]);
    if (button.on) {
      if (this.eraserOn) tool.erase();
      else tool.onClick();
    }
  },
  setMode: function(mode) {
    this.mode = mode;
    this.Box.clear();
    this.Line.clear();
    this.Sprite.clear();
    G$("EditorModeText").text = ["Box","Line","Sprite"][mode];
    this.setEraserOn(false);
  },
  setEraserOn: function(bool) {
    this.eraserOn = !!bool;
    this.setCursor();
  },
  setCursor: function() {
    if (this.eraserOn) Pointer.cursor = POINTER_ERASER;
    else {
      let button = G$(["BoxTool","LineTool","SpriteTool"][this.mode]);
      if (button.on) Pointer.cursor = [POINTER_PENCIL,POINTER_PENCIL,POINTER_CROSSHAIR][this.mode];
      else Pointer.cursor = POINTER_CROSSHAIR;
    }
  },
  findAt: function(x,y,type) {
    let tryAll = (type==void(0));
    if (type==0||tryAll) {
      let all = PhysicsBox.getAll();
      for (var i in all) {
        if (all[i].isTerrain&&all[i].containsPoint(x,y)) return all[i];
      }
    }
  	if (type==1||tryAll) {
      let all = SolidLine.getAll();
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
      let all = Enemy.getAll();
      for (var i in all) {
        if (all[i].isSprite&&all[i].containsPoint(x,y)) return all[i];
      }
    }
  }
}
