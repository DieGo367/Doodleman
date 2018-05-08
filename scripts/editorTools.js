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
        let x = Math.min(xx,this.x)+width/2;
        let y = Math.max(yy,this.y);
        let properties = [x,y,width,height,this.color,this.img,true,this.collisionType];
        PhysicsBox.create(...properties).isTerrain = true;
        TerrainManager.updateLevelData(0,properties);
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
      let xx = Pointer.camX(), yy = Pointer.camY();
      let properties = [this.x,this.y,xx,yy,this.lineWidth,this.stroke,this.direction];
      SolidLine.create(...properties);
      TerrainManager.updateLevelData(1,properties);
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

    },
    clear: function() {
      this.id = 10;
    }
  },
  onClick: function() {
    [this.Box,this.Line,this.Sprite][this.mode].onClick();
  },
  setMode: function(mode) {
    this.mode = mode;
    this.Box.clear();
    this.Line.clear();
    this.Sprite.clear();
  }
}
