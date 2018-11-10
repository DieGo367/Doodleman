const EditorTools = {
  enabled: false,
  ready: false,
  modes: ["Box","Line","Actor"],
  mode: 0,
  eraserOn: false,
  selectOn: false,
  selectA: null,
  selectB: null,
  history: [],
  future: [],
  Box: {
    x: null,
    y: null,
    gfx: "black",
    collisionType: C_INFINIMASS,
    onDown: function() {
      if (this.x==null||this.y==null) {
        this.x = Pointer.camX();
        this.y = Pointer.camY();
      }
    },
    onClick: function() {
      if (this.x==null||this.y==null) return;
      let xx = Pointer.camX(), yy = Pointer.camY();
      if (this.x==xx||this.y==yy) return this.cancel();
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
        properties: [this.gfx,true,this.collisionType],
        pieces: [[x,y,width,height]]
      };
      EditorTools.runAction({
        action: "create",
        objectType: "terrain",
        definition: definition
      });
      this.cancel();
    },
    erase: function() {
      let box = this.findAt(Pointer.camX(),Pointer.camY());
      if (box) {
        EditorTools.runAction({
          action: "delete",
          objectType: "terrain",
          definition: box.rawTerrainData
        });
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
        names: ["gfx","collisionType"],
        types: ["string","accessor:C_NONE,C_WEAK,C_PUSHABLE,C_SOLID,C_INFINIMASS"]
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
    onDown: function() {
      if (this.x==null||this.y==null) {
        this.x = Pointer.camX();
        this.y = Pointer.camY();
      }
    },
    onClick: function() {
      if (this.x==null||this.y==null) return;
      let xx = Pointer.camX(), yy = Pointer.camY();
      if (this.x==xx&&this.y==yy) return this.cancel();
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
      EditorTools.runAction({
        action: "create",
        objectType: "terrain",
        definition: definition
      });
      this.cancel();
    },
    erase: function() {
      let line = this.findAt(Pointer.camX(),Pointer.camY());
      if (line) {
        EditorTools.runAction({
          action: "delete",
          objectType: "terrain",
          definition: line.rawTerrainData
        });
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
    onDown: function() {},
    onClick: function() {
      let props = ActorManager.getActorValueNames(this.id);
      if (props.length==0) return;
      else for (var i = 0; i < props.length-2; i++) {
        if (this.properties[i]==void(0)) return;
      }
      let x = Pointer.camX(), y = Pointer.camY();
      let data = [this.id,x,y,...this.properties];
      if (this.id==0) {
        let slot = data[3];
        let prev = Level.level.playerSpawns[slot];
        prev = prev? [prev.x, prev.y, slot, prev.direction] : null;
        EditorTools.runAction({
          action: "spawn",
          slot: slot,
          spawnData: data.splice(1),
          previous: prev
        });
      }
      else EditorTools.runAction({
        action: "create",
        objectType: "actor",
        definition: data
      });
    },
    erase: function() {
      let actor = this.findAt(Pointer.camX(),Pointer.camY());
      if (actor) {
        if (this.id==0) EditorTools.runAction({
          action: "spawnremove",
          slot: actor.slot,
          spawnData: [actor.x, actor.y, actor.slot, actor.direction]
        });
        else EditorTools.runAction({
          action: "delete",
          objectType: "actor",
          definition: actor.rawActorData
        });
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
        if (devEnabled) this.tempActor.drawDebug();
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
    }
  },
  init: function() {
    for (var i in this.modes) {
      this[this.modes[i]].parent = this;
    }
    this.ready = true;
  },
  setup: function() {
    this.enabled = true;
    if (this.levelCopy) Level.load(JSON.stringify(this.levelCopy),false);
    this.Actor.initSpawnGhosts();
    this.history = [];
    this.future = [];
  },
  onDown: function(found) {
    let tool = this[this.getModeText()];
    let button = G$(this.getModeText()+"Tool");
    if (Pointer.focusLayer!=0||found) return tool.cancel();
    if (this.selectOn) this.startSelection();
    else if (button.on) tool.onDown();
  },
  onClick: function(found) {
    let tool = this[this.getModeText()];
    let button = G$(this.getModeText()+"Tool");
    if (Pointer.focusLayer!=0||found) return tool.cancel();
    if (this.selectOn) this.endSelection();
    else if (button.on) {
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
  setSelectOn: function(bool) {
    this.selectOn = bool;
    this.setEraserOn(false);
  },
  setCursor: function() {
    if (this.eraserOn) Pointer.cursor = POINTER_ERASER;
    else if (this.selectOn) Pointer.cursor = POINTER_CROSSHAIR;
    else {
      let button = G$(this.getModeText()+"Tool");
      if (button.on) Pointer.cursor = [POINTER_PENCIL,POINTER_PENCIL,POINTER_NONE][this.mode];
      else Pointer.cursor = POINTER_NORMAL;
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
    if (this.selectOn) {
      if (this.selectA) {
        let x = this.selectA.x, y = this.selectA.y;
        let xx, yy;
        if (this.selectB) xx = this.selectB.x, yy = this.selectB.y;
        else xx = Pointer.camX(), yy = Pointer.camY();
        c.strokeStyle = "orange";
        c.setLineDash([5]);
        c.strokeRect(x,y,xx-x,yy-y);
        c.setLineDash([]);
      }
    }
    else if (button.on) {
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
    if (ctrl.pressed("Ctrl")) {
      if (ctrl.ready("z")) {
        if (ctrl.pressed("Shift")) this.redoAction();
        else this.undoAction();
        ctrl.use("z");
      }
    }
    if (ctrl.ready("fullScreen")) {
      G$("FSToggle").onClick(ctrl,true);
      ctrl.use("fullScreen");
    }
  },
  execAction: function(action) {
    switch(action.action) {
      case "create":
        switch(action.objectType) {
          case "terrain":
            let def = clone(action.definition);
            TerrainManager.make(def);
            Level.addTerrainData(def);
            break;
          case "actor":
            let data = clone(action.definition);
            ActorManager.make(...data);
            Level.addActorData(data);
        }
        break;
      case "delete":
        switch (action.objectType) {
          case "terrain":
            let piece = TerrainManager.searchFor(action.definition);
            if (piece) piece.remove();
            else console.warn("Couldn't delete missing terrain");
            Level.removeTerrainData(action.definition);
            break;
          case "actor":
            let actor = ActorManager.searchFor(action.definition);
            if (actor) actor.remove();
            else console.warn("Couldn't delete missing actor")
            Level.removeActorData(action.definition);
        }
        break;
      case "spawn":
        Level.setSpawn(...action.spawnData);
        this.Actor.setSpawnGhost(...action.spawnData);
        break;
      case "spawnremove":
        Level.removeSpawn(action.slot);
        this.Actor.killSpawnGhost(action.slot);
        break;
    }
  },
  invertAction: function(action) {
    let inverses = {
      create: "delete",
      delete: "create",
      spawnremove: "spawn",
      spawn: "spawnremove"
    }
    action.action = inverses[action.action];
    switch (action.action) {
      case "spawnremove":
        if (action.previous!=null) {
          action.action = "spawn";
          let temp = action.spawnData;
          action.spawnData = action.previous;
          action.previous = temp;
        }
        break;
    }
    return action;
  },
  runAction: function(action) {
    this.execAction(action);
    this.history.push(action);
    this.future = [];
  },
  undoAction: function() {
    if (this.history.length<1) return;
    let action = this.history.pop();
    let undo = clone(action);
    this.invertAction(undo);
    this.execAction(undo);
    this.future.push(action);
  },
  redoAction: function() {
    if (this.future.length<1) return;
    let action = this.future.pop();
    this.execAction(action);
    this.history.push(action);
  },
  startSelection: function() {
    this.selectA = Pointer.camPoint();
    this.selectB = null;
  },
  endSelection: function() {
    if (!this.selectA) return;
    this.selectB = Pointer.camPoint();
    if (this.selectA.x==this.selectB.x&&this.selectA.y==this.selectB.y) this.selectA = this.selectB = null;
  }
}
