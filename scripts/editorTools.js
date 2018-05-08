const EditorTools = {
  enabled: false,
  mode: 0,
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
    clear: function() {
      this.id = 10;
    }
  },
  onClick: function() {
    if (G$("EditorToolbar").visible) {
      let tool = [this.Box,this.Line,this.Sprite][this.mode];
      let button = G$(["BoxTool","LineTool","SpriteTool"][this.mode]);
      if (button.on) tool.onClick();
    }
  },
  setMode: function(mode) {
    this.mode = mode;
    this.Box.clear();
    this.Line.clear();
    this.Sprite.clear();
  }
}
