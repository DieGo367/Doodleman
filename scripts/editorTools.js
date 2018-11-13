
const EditorTools = {
  enabled: false,
  ready: false,
  rebuildRequired: false,
  tools: [],
  currentTool: 0,
  toolOn: false,
  selection: new UIDStore(),
  history: [],
  future: [],
  setup: function() {
    this.enabled = true;
    if (this.levelCopy) Level.load(JSON.stringify(this.levelCopy),false);
    for (var i in this.tools) this.tools[i].setup()
    this.history = [];
    this.future = [];
  },
  canUseTools: function() {
    return Pointer.focusLayer==0 && !Button.underPointer();
  },
  onDown: function() {
    let tool = this.getTool();
    if (!this.canUseTools()) tool.cancel();
    else if (this.toolOn) tool.onDown();
  },
  onClick: function() {
    let tool = this.getTool();
    if (!this.canUseTools()) tool.cancel();
    else if (this.toolOn) tool.onClick();
  },
  onRightClick: function() {
    this.getTool().onRightClick();
  },
  addTool: function(tool) {
    this.tools.push(tool);
    tool.host = this;
  },
  getTool: function() {
    return this.tools[this.currentTool];
  },
  setTool: function(id) {
    this.currentTool = Math.max(0,Math.min(id,this.tools.length-1));
    this.setCursor();
  },
  tool: function(name) {
    for (var i in this.tools) if (this.tools[i].name==name) return this.tools[i];
  },
  getToolName: function() {
    return this.getTool().name;
  },
  setCursor: function() {
    if (this.toolOn) Pointer.cursor = this.getTool().cursor;
    else Pointer.cursor = POINTER_NORMAL;
  },
  getToolPropertyNames: function() {
    let tool = this.getTool();
    return tool.getPropTypes();
  },
  getToolProperty: function(name,annotation,sourceIndex) {
    return this.getTool().getProp(name,annotation,sourceIndex);
  },
  setToolProperty: function(name,val,sourceIndex) {
    this.getTool().setProp(name,val,sourceIndex);
  },
  draw: function() {
    let tool = this.getTool();
    if (this.toolOn) tool.draw();
    let selectionColor = "orange";
    if (this.toolOn&&this.getToolName()=="Eraser") {
      for (var i in this.selection) if (this.selection[i].pointerHovered()) {
        selectionColor = "red";
        break;
      }
    }
    for (var i in this.selection) this.selection[i].drawHighlighted(selectionColor);
    this.tool("Actor").drawSpawnGhosts();
  },
  findAnyAt: function(x,y) {
    for (var i in this.tools) {
      let result = this.tools[i].findAt(x,y);
      if (result) return result;
    }
  },
  testLevel: function(mode) {
    this.getTool().cancel();
    this.levelCopy = clone(Level.level);
    Game.mode = mode;
    Level.load(JSON.stringify(this.levelCopy),false);
  },
  doControls: function(ctrl) {
    // this function should be moved to editor.js
    if (!ctrl.type==KEYBOARD||viewLock||Pointer.focusLayer!=0) return;
    for (var i in this.tools) if (ctrl.ready(this.tools[i].name+"Tool")) {
      G$(this.tools[i].name+"Tool").onClick(ctrl,true);
      ctrl.use(this.tools[i].name+"Tool");
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
      case "group":
        for (var i in action.list) {
          this.execAction(action.list[i]);
        }
        break;
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
        this.tool("Actor").setSpawnGhost(...action.spawnData);
        break;
      case "spawnremove":
        Level.removeSpawn(action.slot);
        this.tool("Actor").killSpawnGhost(action.slot);
        break;
    }
  },
  invertAction: function(action) {
    let inverses = {
      group: "group",
      create: "delete",
      delete: "create",
      spawnremove: "spawn",
      spawn: "spawnremove"
    }
    action.action = inverses[action.action];
    switch (action.action) {
      case "group":
        for (var i in action.list) this.invertAction(action.list[i]);
        break;
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
  runGroupAction: function(template,list,pairToPrevious) {
    let actionList = [];
    for (var i in list) {
      let action = clone(template);
      if (list[i].isGhost) {
        action.slot = list[i].slot;
        action.spawnData = [list[i].x, list[i].y, list[i].slot, list[i].direction];
      }
      else {
        if (list[i].isTerrain) action.objectType = "terrain";
        if (list[i].isActor) action.objectType = "actor";
        action.definition = clone(list[i].rawTerrainData || list[i].rawActorData);
      }
      actionList.push(action);
    }
    if (pairToPrevious&&this.history.length>0) {
      let previous = this.history[this.history.length-1];
      if (previous.action=="group") {
        this.execAction({
          action: "group",
          list: actionList
        });
        previous.list = previous.list.concat(actionList);
        return;
      }
    }
    this.runAction({
      action: "group",
      list: actionList
    });
  },
  select: function(obj,mod) {
    if (mod=="remove") this.selection.remove(obj);
    else this.selection.add(obj);
  },
  clearSelection: function() {
    for (var i in this.selection) this.selection.remove(this.selection[i]);
  },
  deleteSelection: function() {
    let normal = [], ghosts = [];
    for (var i in this.selection) {
      let s = this.selection[i];
      if (s.isGhost) ghosts.push(s);
      else normal.push(s);
    }
    let doNormal = normal.length>0, doGhost = ghosts.length>0;
    if (doNormal) this.runGroupAction({
      action: "delete"
    },normal);
    if (doGhost) this.runGroupAction({
      action: "spawnremove"
    },ghosts,doNormal);
    this.clearSelection();
  }
}
class EditTool {
  constructor(name,cursor,mods) {
    this.name = name;
    this.cursor = cursor;
    for (var p in mods) {
      this[p] = mods[p];
    }
  }
  setup() {}
  onDown() {}
  onClick() {}
  onRightClick() { this.cancel(); }
  cancel() {}
  draw() {}
  getPropStrings() { return {names:[], strings:[]}}
  findAt(x,y) {}
  getPropTypes() { return []; }
  setProp(prop,val,srcIndex) { this[prop] = val; }
  getProp(prop,annotation,srcIndex) {
    if (annotation.is("accessor")) return Constants.getKey(this[prop],annotation.getNotes());
    else return this[prop];
  }
}
EditorTools.addTool(new EditTool("Box",POINTER_PENCIL,{
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
    this.host.runAction({
      action: "create",
      objectType: "terrain",
      definition: definition
    });
    this.cancel();
  },
  erase: function() {
    let box = this.findAt(Pointer.camX(),Pointer.camY());
    if (box) {
      this.host.runAction({
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
  getPropTypes: function() {
    return ["gfx","@collisionType:C_NONE,C_WEAK,C_PUSHABLE,C_SOLID,C_INFINIMASS"];
  },
  findAt: function(x,y) {
    let all = PhysicsBox.getAll().reverse();
    for (var i in all) {
      if (all[i].isTerrain&&all[i].containsPoint(x,y)) return all[i];
    }
  }
}));
EditorTools.addTool(new EditTool("Line",POINTER_PENCIL,{
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
    this.host.runAction({
      action: "create",
      objectType: "terrain",
      definition: definition
    });
    this.cancel();
  },
  erase: function() {
    let line = this.findAt(Pointer.camX(),Pointer.camY());
    if (line) {
      this.host.runAction({
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
  getPropTypes: function() {
    return ["stroke","#lineWidth",
    "@direction:LINE_UP,LINE_DOWN,LINE_LEFT,LINE_RIGHT","?useBoxCorners"];
  },
  findAt: function(x,y) {
    let all = Line.getAll().reverse();
    for (var i in all) if (all[i].isTerrain&&all[i].pointNearLine(x,y,3)) return all[i];
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
}));
EditorTools.addTool(new EditTool("Actor",POINTER_NONE,{
  id: 10,
  properties: [],
  tempActor: null, spawnGhosts: [],
  setup: function() {
    for (var i = 0; i < Level.level.playerSpawns.length; i++) {
      let spawn = Level.level.playerSpawns[i];
      this.setSpawnGhost(spawn.x,spawn.y,i,spawn.direction);
    }
  },
  setProp: function(prop,val,srcIndex) {
    if (srcIndex>0) {
      this.properties[srcIndex-1] = val;
    }
    else {
      this[prop] = val;
      this.properties = [];
      this.host.rebuildRequired = true;
    }
    this.refreshTempActor();
  },
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
      this.host.runAction({
        action: "spawn",
        slot: slot,
        spawnData: data.splice(1),
        previous: prev
      });
    }
    else this.host.runAction({
      action: "create",
      objectType: "actor",
      definition: data
    });
  },
  erase: function() {
    let actor = this.findAt(Pointer.camX(),Pointer.camY());
    if (actor) {
      if (this.id==0) this.host.runAction({
        action: "spawnremove",
        slot: actor.slot,
        spawnData: [actor.x, actor.y, actor.slot, actor.direction]
      });
      else this.host.runAction({
        action: "delete",
        objectType: "actor",
        definition: actor.rawActorData
      });
    }
  },
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
  getPropTypes: function() {
    let names = ActorManager.getActorValueNames(this.id);
    let props = ["#id"];
    if (this.id==0) this.properties[0] = 0, this.properties[1] = RIGHT;
    // start at 2 to skip x and y
    return props.concat(names.slice(2));
  },
  getProp: function(prop,annotation,srcIndex) {
    let result;
    if (srcIndex>0) result = this.properties[srcIndex-1];
    else result = this[prop];
    if (annotation.is("accessor")) return Constants.getKey(result,annotation.getNotes());
    else return result;
  },
  findAt: function(x,y) {
    let all = [].concat(Box.getAll().reverse()).concat(this.spawnGhosts.reverse());
    for (var i in all) {
      if (all[i]&&all[i].isActor&&all[i].containsPoint(x,y)) return all[i];
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
}));
EditorTools.addTool(new EditTool("Select",POINTER_CROSSHAIR,{
  pt: null, modifier: null,
  checkModifier: function() {
    if (Pointer.downButton==3) return "remove";
    let ctrl = globalKeyboard;
    if (ctrl.pressed("Shift")) return "append";
    if (ctrl.pressed("Alt")) return "remove";
  },
  onDown: function() {
    this.modifier = this.checkModifier();
    if (!this.modifier) this.host.clearSelection();
    this.pt = Pointer.camPoint();
  },
  onClick: function() {
    if (!this.pt) return;
    let end = Pointer.camPoint();
    if (this.pt.x==end.x||this.pt.y==end.y) {
      if (!this.modifier) this.cancel();
      return;
    }
    let width = Math.abs(end.x-this.pt.x);
    let height = Math.abs(end.y-this.pt.y);
    let x = Math.min(this.pt.x,end.x)+width/2;
    let y = Math.max(this.pt.y,end.y);
    let selectBox = new Box(x,y,width,height);
    let boxes = PhysicsBox.getAll(), lines = Line.getAll(), ghosts = this.host.tool("Actor").spawnGhosts;
    for (var i in boxes) {
      if (selectBox.intersect(boxes[i])) this.host.select(boxes[i],this.modifier);
    }
    for (var i in lines) {
      if (lines[i].crossesBox(selectBox)) this.host.select(lines[i],this.modifier);
    }
    for (var i in ghosts) {
      if (selectBox.intersect(ghosts[i])) this.host.select(ghosts[i],this.modifier);
    }
    this.pt = null;
  },
  onRightClick: function() {
    this.onClick();
  },
  draw: function() {
    if (this.pt) {
      let x = this.pt.x, y = this.pt.y;
      let xx = Pointer.camX(), yy = Pointer.camY();
      c.strokeStyle = this.modifier=="remove"?"red":"darkOrange";
      c.lineWidth = 2;
      c.setLineDash([5]);
      c.lineDashOffset = (Timer.now()/5)%10;
      c.strokeRect(x,y,xx-x,yy-y);
      c.setLineDash([]);
      c.lineDashOffset = 0;
      c.lineWidth = 1;
    }
  },
  cancel: function() {
    this.pt = null;
  }
}));
EditorTools.addTool(new EditTool("Eraser",POINTER_ERASER,{
  onClick: function() {
    let hovered = this.host.findAnyAt(Pointer.camPoint());
    if (hovered) {
      if (this.host.selection.has(hovered)) this.host.deleteSelection();
      else {
        if (hovered.isGhost) this.host.runAction({
          action: "spawnremove",
          slot: hovered.slot,
          definition: [hovered.x, hovered.y, hovered.slot, hovered.direction]
        });
        else this.host.runAction({
          action: "delete",
          objectType: hovered.isTerrain?"terrain":"actor",
          definition: clone(hovered.rawTerrainData || hovered.rawActorData)
        });
      }
    }
  },
  draw: function() {
    let hovered = this.host.findAnyAt(Pointer.camPoint());
    if (hovered) hovered.drawHighlighted("red");
  }
}));
