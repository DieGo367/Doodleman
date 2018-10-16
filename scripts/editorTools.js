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
        this.cancel();
      }
    },
    erase: function() {
      let box = this.findAt(Pointer.camX(),Pointer.camY());
      if (box) {
        Level.removeTerrainData(box.rawTerrainData);
        box.remove();
      }
    },
    cancel: function() {
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
        types: ["string","string","accessor:C_NONE,C_WEAK,C_PUSHABLE,C_SOLID,C_INFINIMASS"]
      }
    },
    findAt: function(x,y) {
      let all = PhysicsBox.getAll().reverse();
      for (var i in all) {
        if (all[i].isTerrain&&!(all[i] instanceof Line)&&all[i].containsPoint(x,y)) return all[i];
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
        this.cancel();
      }
    },
    erase: function() {
      let line = this.findAt(Pointer.camX(),Pointer.camY());
      if (line) {
        Level.removeTerrainData(line.rawTerrainData);
        line.remove();
      }
    },
    cancel: function() {
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
        drawLine(this.x,this.y,xx,yy);
      }
    },
    getPropStrings: function() {
      return {
        names: ["stroke","lineWidth","direction","useBoxCorners"],
        types: ["string","number","accessor:LINE_UP,LINE_DOWN,LINE_LEFT,LINE_RIGHT","boolean"]
      }
    },
    findAt: function(x,y) {
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
      xx = Math.round(x - newMag * Math.cos(newAngleRad));
      yy = Math.round(y - newMag * Math.sin(newAngleRad));

      return [xx,yy];
    }
  },
  Actor: {
    id: 10,
    properties: [],
    tempActor: null, spawnGhosts: [],
    onClick: function() {
      let props = ActorManager.getActorValueNames(this.id);
      if (props.length==0) return;
      else for (var i = 0; i < props.length-2; i++) {
        if (this.properties[i]==void(0)) return;
      }
      let x = Pointer.camX(), y = Pointer.camY();
      let data = [this.id,x,y,...this.properties];
      if (this.id==0) {
        data.splice(0,1);
        this.setLevelSpawn(...data);
        this.setSpawnGhost(...data);
      }
      else {
        ActorManager.make(...data);
        Level.addActorData(data);
      }
    },
    erase: function() {
      let actor = this.findAt(Pointer.camX(),Pointer.camY());
      if (actor) {
        if (this.id==0) {
          this.killSpawnGhost(actor.slot);
          this.removeLevelSpawn(actor.slot);
        }
        else Level.removeActorData(actor.rawActorData);
        actor.remove();
      }
    },
    cancel: function() { },
    draw: function() {
      if (this.tempActor==null) this.refreshTempActor();
      if (this.tempActor!=null) {
        this.tempActor.x = Pointer.camX();
        this.tempActor.y = Pointer.camY();
        c.globalAlpha = 0.5;
        this.tempActor.draw();
        c.globalAlpha = 1;
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
      if (this.id==0) {
        this.properties[0] = 0, this.properties[1] = RIGHT;
      }
      for (var i = 2; i < vals.length; i++) { //start at 2 to skip x and y
        let name = vals[i];
        switch (name.charAt(0)) {
          case '#':
            name = name.slice(1);
            props.types.push("number");
            break;
          case '?':
            name = name.slice(1);
            props.types.push("boolean");
            break;
          case '@':
            name = name.slice(1).split(":");
            props.types.push("accessor:"+name[1]);
            name = name[0];
          default:
            props.types.push("string");
        }
        props.names.push(name);
      }
      return props;
    },
    findAt: function(x,y) {
      let all = (this.id==0? [].concat(this.spawnGhosts).reverse(): Box.getAll().reverse());
      for (var i in all) {
        if (all[i]&&all[i].isActor&&all[i].containsPoint(x,y)) return all[i];
      }
    },
    initSpawnGhosts: function() {
      for (var i = 0; i < Level.level.playerSpawns.length; i++) {
        let spawn = Level.level.playerSpawns[i];
        this.setSpawnGhost(spawn.x,spawn.y,i,spawn.direction);
      }
    },
    setSpawnGhost: function(x,y,playerNumber,direction) {
      if (this.spawnGhosts[playerNumber]) this.killSpawnGhost(playerNumber);
      this.spawnGhosts[playerNumber] = ActorManager.makeGhostActor(0,x,y,playerNumber,direction);
    },
    killSpawnGhost: function(slot) {
      let ghosts = this.spawnGhosts;
      if (ghosts[slot]) {
        delete ghosts[slot];
        while (ghosts.length>0&&ghosts[ghosts.length-1]==null) ghosts.splice(ghosts.length-1);
      }
    },
    drawSpawnGhosts: function() {
      for (var i in this.spawnGhosts) this.spawnGhosts[i].draw();
    },
    removeSpawnGhosts: function() {
      for (var i = this.spawnGhosts.length-1; i >= 0; i--) this.killSpawnGhost(i);
    },
    setLevelSpawn: function(x,y,playerNumber,direction) {
      let spawn = Level.level.playerSpawns[playerNumber];
      if (!spawn) spawn = Level.level.playerSpawns[playerNumber] = {x: 0, y:0, direction: RIGHT};
      spawn.x = x, spawn.y = y, spawn.direction = direction;
      return spawn;
    },
    removeLevelSpawn: function(playerNumber) {
      let spawns = Level.level.playerSpawns;
      delete spawns[playerNumber];
      trimListEnd(spawns);
    }
  },
  init: function() {
    for (var i in this.modes) {
      this[this.modes[i]].parent = this;
    }
    this.ready = true;
  },
  onClick: function(found) {
    let tool = this[this.getModeText()];
    let button = G$(this.getModeText()+"Tool");
    if (Pointer.focusLayer!=0||found) return tool.cancel();
    if (button.on) {
      if (this.eraserOn) tool.erase();
      else tool.onClick();
    }
  },
  onRightClick: function() {
    this[this.getModeText()].cancel();
  },
  setMode: function(mode) {
    if (!this.ready) this.init();
    this.mode = mode;
    let button = G$(this.getModeText()+"Tool");
    G$("EditorModeText").text = button.on?this.getModeText():"";
    let p = G$("EditPropBttn");
    if (p.on) p.callToggleState(0);
    this.setEraserOn(false);
  },
  getModeText: function() {
    return this.modes[this.mode];
  },
  clearMode: function() {
    this.setMode(0);
    G$("BoxTool").on = false;
    this.setCursor();
  },
  setEraserOn: function(bool) {
    this.eraserOn = !!bool;
    this.Box.cancel();
    this.Line.cancel();
    this.Actor.cancel();
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
  getToolProperties: function() {
    let tool = this[this.getModeText()];
    let strings = tool.getPropStrings();
    let props = [];
    let prop = function(name,type,index,checkActor) {
      this.name = name;
      if (checkActor&&index>0) {
        this.val = tool.properties[index-1];
      }
      else this.val = tool[name];
      this.type = type;
      if (type.split(":")[0]=="accessor") {
        this.val = Constants.getKey(this.val,type.split(":")[1].split(","));
      }
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
    else if (tool.hasOwnProperty(name)) {
      tool[name] = val;
      if (name=="id"&&tool==this.Actor) {
        tool.properties = [];
        tool.refreshTempActor();
        G$("EditPropBttn").callToggleState(0);
      }
    }
  },
  draw: function() {
    let button = G$(this.getModeText()+"Tool");
    if (button.on) {
      if (this.eraserOn) {
        let thing = this[this.getModeText()].findAt(Pointer.camX(),Pointer.camY());
        if (thing) thing.drawHighlighted("red");
      }
      else {
        this[this.getModeText()].draw();
      }
    }
    this.Actor.drawSpawnGhosts();
  },
  testLevel: function(mode) {
    this.clearMode();
    this.levelCopy = clone(Level.level);
    Game.mode = mode;
    Level.load(JSON.stringify(this.levelCopy),false);
  },
  doControls: function(ctrl) {
    if (!ctrl.type==KEYBOARD||viewLock||Pointer.focusLayer!=0) return;
    for (var i in this.modes) if (ctrl.ready(this.modes[i]+"Tool")) {
      G$(this.modes[i]+"Tool").onClick(ctrl,true);
      ctrl.use(this.modes[i]+"Tool");
    }
    if (ctrl.ready("EraserTool")) {
      G$("EraserTool").onClick(ctrl,true);
      ctrl.use("EraserTool");
    }
    if (ctrl.ready("PropMenu")) {
      if (!G$("EditorToolbar").visible) G$("ExpandButton").onClick(ctrl,true);
      else if (!G$("EditPropView").visible) G$("EditPropBttn").onClick(ctrl,true);
      else {
        G$("EditPropBttn").onClick(ctrl,true);
        G$("ExpandButton").onClick(ctrl,true);
      }
      ctrl.use("PropMenu");
    }
    if (ctrl.ready("fullScreen")) {
      G$("FSToggle").onClick(ctrl,true);
      ctrl.use("fullScreen");
    }
  }
}
