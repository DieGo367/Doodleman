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
  actionResult: null,
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
    if (this.toolOn) {
      if (tool.name=="Eraser") for (var i in this.selection) {
        if (this.selection[i].pointerHovered()) {
          selectionColor = "red";
          break;
        }
      }
      if (tool.name=="Move") {
        if (tool.grabbed=="selection") selectionColor = null;
        else for (var i in this.selection) {
          if (this.selection[i].pointerHovered()) {
            selectionColor = "blue";
          }
        }
      }
    }
    if (selectionColor) for (var i in this.selection) this.selection[i].drawHighlighted(selectionColor);
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
  execAction: function(action) {
    switch(action.action) {
      case "group":
        let results = [];
        for (var i in action.list) {
          results.push(this.execAction(action.list[i]));
        }
        return results;
      case "create":
        switch(action.objectType) {
          case "terrain":
            let def = clone(action.definition);
            Level.addTerrainData(def);
            return TerrainManager.make(def)[0];
          case "actor":
            let data = clone(action.definition);
            Level.addActorData(data);
            return ActorManager.make(...data);
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
      case "move":
        this.execAction({
          action: "delete",
          objectType: action.objectType,
          definition: action.definition
        });
        let newDef = clone(action.definition);
        this.tool("Move").shiftDefinition(action.objectType,newDef,action.delta);
        return this.execAction({
          action: "create",
          objectType: action.objectType,
          definition: newDef
        });
      case "spawn":
        Level.setSpawn(...action.spawnData);
        return this.tool("Actor").setSpawnGhost(...action.spawnData);
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
      move: "move",
      spawnremove: "spawn",
      spawn: "spawnremove"
    }
    action.action = inverses[action.action];
    switch (action.action) {
      case "group":
        for (var i in action.list) this.invertAction(action.list[i]);
        break;
      case "move":
        this.tool("Move").shiftDefinition(action.objectType,action.definition,action.delta);
        action.delta.x *= -1;
        action.delta.y *= -1;
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
    this.actionResult = this.execAction(action);
    this.history.push(action);
    this.future = [];
    return this.actionResult;
  },
  undoAction: function() {
    if (this.history.length<1) return;
    let action = this.history.pop();
    let undo = clone(action);
    this.invertAction(undo);
    this.actionResult = this.execAction(undo);
    this.future.push(action);
    return this.actionResult;
  },
  redoAction: function() {
    if (this.future.length<1) return;
    let action = this.future.pop();
    this.actionResult = this.execAction(action);
    this.history.push(action);
    return this.actionResult;
  },
  runGroupAction: function(action) {
    let group, result = this.actionResult;
    if (this.history.length>0) group = this.history[this.history.length-1];
    if (!group || !group.open) {
      group = {
        action: "group",
        list: [],
        open: true
      };
      result = this.runAction(group);
    }
    group.list.push(action);
    result.push(this.execAction(action));
    return this.actionResult = result;
  },
  closeGroupAction: function() {
    let previous;
    if (this.history.length>0) previous = this.history[this.history.length-1];
    if (previous) previous.open = false;
    return this.actionResult;
  },
  select: function(obj,mod) {
    if (mod=="remove") this.selection.remove(obj);
    else this.selection.add(obj);
  },
  clearSelection: function() {
    for (var i in this.selection) this.selection.remove(this.selection[i]);
  },
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
  findAt: function(x,y) {
    let all = PhysicsBox.getAll().reverse();
    for (var i in all) {
      if (all[i].isTerrain&&all[i].containsPoint(x,y)) return all[i];
    }
  },
  getPropTypes: function() {
    return ["gfx","@collisionType:C_NONE,C_WEAK,C_PUSHABLE,C_SOLID,C_INFINIMASS"];
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
  findAt: function(x,y) {
    let all = Line.getAll().reverse();
    for (var i in all) if (all[i].isTerrain&&all[i].pointNearLine(x,y,3)) return all[i];
  },
  getPropTypes: function() {
    return ["stroke","#lineWidth",
    "@direction:LINE_UP,LINE_DOWN,LINE_LEFT,LINE_RIGHT","?useBoxCorners"];
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
  findAt: function(x,y) {
    let all = [].concat(Box.getAll().reverse()).concat([].concat(this.spawnGhosts).reverse());
    for (var i in all) {
      if (all[i]&&all[i].isActor&&all[i].containsPoint(x,y)) return all[i];
    }
  },
  getPropTypes: function() {
    let names = ActorManager.getActorValueNames(this.id);
    let props = ["#id"];
    if (this.id==0) this.properties[0] = 0, this.properties[1] = RIGHT;
    // start at 2 to skip x and y
    return props.concat(names.slice(2));
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
  getProp: function(prop,annotation,srcIndex) {
    let result;
    if (srcIndex>0) result = this.properties[srcIndex-1];
    else result = this[prop];
    if (annotation.is("accessor")) return Constants.getKey(result,annotation.getNotes());
    else return result;
  },
  refreshTempActor: function() {
    if (this.tempActor!=null) delete this.tempActor;
    if (ActorManager.getActorValueNames(this.id).length==0) return this.tempActor = null;
    let x = Pointer.camX(), y = Pointer.camY();
    this.tempActor = ActorManager.makeGhostActor(this.id,x,y,...this.properties);
  },
  initSpawnGhosts: function() {
    for (var i = 0; i < Level.level.playerSpawns.length; i++) {
      let spawn = Level.level.playerSpawns[i];
      this.setSpawnGhost(spawn.x,spawn.y,i,spawn.direction);
    }
  },
  setSpawnGhost: function(x,y,playerNumber,direction) {
    if (this.spawnGhosts[playerNumber]) this.killSpawnGhost(playerNumber);
    return this.spawnGhosts[playerNumber] = ActorManager.makeGhostActor(0,x,y,playerNumber,direction);
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
EditorTools.addTool(new EditTool("Move",POINTER_MOVE,{
  grabbed: null, grabPt: null,
  onDown: function() {
    if (this.grabbed&&this.grabPt) return;
    let hovered = this.host.findAnyAt(Pointer.camPoint());
    if (hovered) {
      if (this.host.selection.has(hovered)) {
        this.grabbed = "selection";
        for (var i in this.host.selection) this.host.selection[i].isLoaded = false;
      }
      else {
        this.grabbed = hovered;
        this.grabbed.isLoaded = false;
      }
      this.grabPt = Pointer.camPoint();
    }
  },
  onClick: function() {
    if (!this.grabbed||!this.grabPt) return this.cancel();
    let pt = Pointer.camPoint();
    let diff = new Point(pt.x-this.grabPt.x,pt.y-this.grabPt.y);
    let obj = this.grabbed;
    this.cancel();
    if (obj=="selection") {
      let group = this.host.selection.getAll();
      this.host.clearSelection();
      for (var i in group) {
        let s = group[i];
        if (s.isGhost) this.host.runGroupAction({
          action: "spawn",
          slot: s.slot,
          spawnData: [s.x+diff.x,s.y+diff.y,s.slot,s.direction],
          previous: [s.x,s.y,s.slot,s.direction]
        });
        else this.host.runGroupAction({
          action: "move",
          objectType: s.isTerrain?"terrain":"actor",
          definition: clone(s.rawTerrainData || s.rawActorData),
          delta: diff
        });
      }
      let results = this.host.closeGroupAction();
      for (var i in results) {
        this.host.selection.add(results[i]);
      }
      return;
    }
    else if (obj.isGhost) this.host.runAction({
      action: "spawn",
      slot: obj.slot,
      spawnData: [obj.x+diff.x,obj.y+diff.y,obj.slot,obj.direction],
      previous: [obj.x,obj.y,obj.slot,obj.direction]
    });
    else this.host.runAction({
      action: "move",
      objectType: obj.isTerrain?"terrain":"actor",
      definition: clone(obj.rawTerrainData || obj.rawActorData),
      delta: diff,
    });
  },
  cancel: function() {
    if (this.grabbed) {
      if (typeof this.grabbed == "object") this.grabbed.isLoaded = true;
      else if (this.grabbed=="selection") for (var i in this.host.selection) {
        this.host.selection[i].isLoaded = true;
      }
    }
    this.grabbed = this.grabPt = null;
  },
  draw: function() {
    if (this.grabbed&&this.grabPt) {
      let pt = Pointer.camPoint();
      let diff = new Point(pt.x-this.grabPt.x,pt.y-this.grabPt.y);
      if (this.grabbed=="selection") {
        for (var i in this.host.selection) {
          this.drawObjectShifted(this.host.selection[i],diff);
        }
      }
      else this.drawObjectShifted(this.grabbed,diff);
    }
    else {
      let hovered = this.host.findAnyAt(Pointer.camPoint());
      if (hovered) hovered.drawHighlighted("blue");
    }
  },
  shiftDefinition: function(objectType,def,delta) {
    switch(objectType) {
      case "terrain":
        let d = def.pieces[0];
        d[0] += delta.x;
        d[1] += delta.y;
        if (def.type==1) {
          d[2] += delta.x;
          d[3] += delta.y;
        }
        break;
      case "actor":
        def[1] += delta.x;
        def[2] += delta.y;
    }
    return def;
  },
  shiftObject: function(obj,delta,k) {
    if (k==void(0)) k = 1;
    obj.x += delta.x*k;
    obj.y += delta.y*k;
    if (obj instanceof Line) {
      obj.x2 += delta.x*k;
      obj.y2 += delta.y*k;
    }
    return obj;
  },
  drawObjectShifted: function(obj,delta) {
    this.shiftObject(obj,delta);
    obj.isLoaded = true;
    obj.drawHighlighted("blue");
    obj.isLoaded = false;
    this.shiftObject(obj,delta,-1);
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
  cancel: function() {
    this.pt = null;
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
  }
}));
EditorTools.addTool(new EditTool("Eraser",POINTER_ERASER,{
  onClick: function() {
    let hovered = this.host.findAnyAt(Pointer.camPoint());
    if (hovered) {
      if (this.host.selection.has(hovered)) {
        let group = this.host.selection.getAll();
        this.host.clearSelection();
        for (var i in group) {
          let s = group[i];
          if (s.isGhost) this.host.runGroupAction({
            action: "spawnremove",
            slot: s.slot,
            spawnData: [s.x,s.y,s.slot,s.direction]
          });
          else this.host.runGroupAction({
            action: "delete",
            objectType: s.isTerrain?"terrain":"actor",
            definition: clone(s.rawTerrainData || s.rawActorData)
          });
        }
        this.host.closeGroupAction();
      }
      else {
        if (hovered.isGhost) this.host.runAction({
          action: "spawnremove",
          slot: hovered.slot,
          spawnData: [hovered.x, hovered.y, hovered.slot, hovered.direction]
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
