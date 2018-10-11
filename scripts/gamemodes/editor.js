const GAME_EDITOR = GameManager.addMode(new GameMode({
  start: function() {
    devEnabled = true;
    Tap.ctrlEnabled = false;
    this.addGui();
    EditorTools.enabled = true;
    if (EditorTools.levelCopy) Level.load(JSON.stringify(EditorTools.levelCopy),false);
    EditorTools.Actor.initSpawnGhosts();
    GameManager.overrideTick(this.tick);
  },
  quit: function() {
    devEnabled = false;
    Tap.controlEnabled = true;
    this.removeGui();
    EditorTools.enabled = false;
    EditorTools.Actor.removeSpawnGhosts();
    GameManager.overrideTick(false);
  },
  tick: function() {
    if (!focused) return;
    window.requestAnimationFrame(drawGame);
    doGlobalControls(globalKeyboard);
    EditorTools.doControls(globalKeyboard);
    GuiElement.callForAll("update");
    Particle.callForAll("update");
  },
  onLevelLoad: function() {
    G$("LevelSettingsClose").onClickFunction();
    EditorTools.Actor.removeSpawnGhosts();
    EditorTools.Actor.initSpawnGhosts();
  },
  onPause: function() {
    if (!G$("LevelSettingsView").visible) {
      if (G$("EditPropView").visible) G$("EditPropBttn").onClick(null,true);
      if (G$("EditorToolbar").visible) G$("ExpandButton").onClick(null,true);
      G$("LevelSettingsBttn").onClick(null,true);
    }
    else {
      G$("LevelSettingsClose").onClick(null,true);
    }
  },
  onPointerMove: function(x,y) {
    if (G$(EditorTools.getModeText()+"Tool").on && !globalKeyboard.pressed("Ctrl")) {
			let pts = Level.getSnappingPoints();
			let minDist = 5;
			let closestPoint = null;
			for (var i in pts) {
				let pt = pts[i];
				pt[0] = (pt[0] - Camera.x)*Camera.zoom + WIDTH/2;
				pt[1] = (pt[1] - Camera.y)*Camera.zoom + HEIGHT/2;
				let dist = Math.sqrt(Math.pow(pt[0]-x,2)+Math.pow(pt[1]-y,2));
				if (dist<=minDist) {
					minDist = dist;
					closestPoint = pt;
				}
			}
			if (closestPoint!=null) return {x: closestPoint[0], y: closestPoint[1]};
		}
  },
  addGui: function() {
    buildDevToolsHud();
    View.create("EditorToolbar",0,0,0,WIDTH,70,"tint","purple");
    View.create("EditorHud",0,0,0,WIDTH,70).show();
    TextElement.create("EditorModeText","EditorHud",70,40,fontMenuEdit,"",WIDTH,LEFT).show();

    View.create("ExpandButtonView",0,0,0,70,70).show();
    Button.create("ExpandButton","ExpandButtonView",10,10,50,50).setToggle(function() {
      G$("EditorToolbar").show();
      G$("EditorHud").hide();
      this.setIcon("GUI-Icons.png",3,0,42,4);
      this.toggleState = 1;
    },
    function(ctrl) {
      let p = G$("EditPropBttn");
      if (p.on) p.states[1].call(p,ctrl);
      G$("EditorToolbar").hide();
      G$("EditorHud").show();
      this.setIcon("GUI-Icons.png",0,1,42,4);
      this.toggleState = 0;
    }).setIcon("GUI-Icons.png",0,1,42,4).show();

    Button.create("BoxTool","EditorToolbar",80,10,50,50).setIcon("GUI-Icons.png",0,2,42,4).show();
    Button.create("LineTool","EditorToolbar",150,10,50,50).setIcon("GUI-Icons.png",1,2,42,4).show();
    Button.create("ActorTool","EditorToolbar",220,10,50,50).setIcon("GUI-Icons.png",2,2,42,4).show();
    Button.setRadioGroup(["BoxTool","LineTool","ActorTool"],function() {
      EditorTools.setMode(this.radioGroupIndex);
      G$("EraserTool").on = false;
    },false);

    Button.create("EraserTool","EditorToolbar",WIDTH-130,10,50,50).setOnClick(function() {
      this.on = !this.on;
      let button = G$(EditorTools.getModeText()+"Tool");
      if (!button.on) this.on = false;
      EditorTools.setEraserOn(this.on);
    }).setIcon("GUI-Icons.png",3,2,42,4).show();

    Button.create("EditPropBttn","EditorToolbar",WIDTH-60,10,50,50).setToggle(function() {
      G$("EditPropView").show();
      this.on = true;
      this.toggleState = 1;
    },
    function() {
      G$("EditPropView").hide();
      this.on = false;
      this.toggleState = 0;
    }).setIcon("GUI-Icons.png",2,1,42,4).show();

    View.create("EditPropView",0,0,70,WIDTH,60,"tint","green");
    Button.create("EditPropOnShown","EditPropView",0,0,0,0).setOnViewShown(function() {
      let view = this.view;
      //remove all children except the first one (this)
      for (var i = view.children.length-1; i > 0; i--) view.children[i].remove();
      let props = EditorTools.getToolProperties();
      view.propNum = props.length;
      for (var i = 0; i < props.length; i++) {
        //make the input
        let x = 10+105*(i%6), y = 80+45*Math.floor(i/6);
        input = TextInput.create("EditProp:"+i,"EditPropView",x,y,99,40,props[i].type,props[i].val,props[i].name,"Enter a value for "+props[i].name).setOnInputChange(function(value) {
          EditorTools.setToolProperty(this.text,value,parseInt(this.name.split(":")[1]));
        }).show();
        view.height = input.y-20;
      }
    });

    Button.create("LevelSettingsBttn","EditorHud",WIDTH-60,10,50,50).setOnClick(function() {
      G$("LevelSettingsView").show();
      G$("EditorHud").hide();
    }).setIcon("GUI-Icons.png",1,1,42,4).show();

    View.create("LevelSettingsView",1,0,0,WIDTH,HEIGHT,"tint","purple");
    Button.create("LevelSettingsClose","LevelSettingsView",WIDTH-60,10,50,50).setOnClick(function() {
      G$(this.view.activeMenu).hide();
      G$("LevelSettingsView").hide();
      G$("EditorHud").show();
    }).
    setOnViewShown(function() {
      if (!this.view.activeMenu) this.view.activeMenu = "LS:File:Menu";
      G$(this.view.activeMenu).show();
      G$("LS:Dimensions:width").storedVal = Level.level.width;
      G$("LS:Dimensions:height").storedVal = Level.level.height;
      G$("LS:CamStart:x").storedVal = Level.level.camStart.x;
      G$("LS:CamStart:y").storedVal = Level.level.camStart.y;
      G$("LS:ScrollBuffer:hor").storedVal = Level.level.horScrollBuffer;
      G$("LS:ScrollBuffer:vert").storedVal = Level.level.vertScrollBuffer;
      G$("LS:ZoomLimit:min").storedVal = Level.level.minZoom;
      G$("LS:ZoomLimit:max").storedVal = Level.level.maxZoom;
      G$("LS:ZoomScale:num").storedVal = Level.level.zoomScale;
      G$("LS:BGScale:num").storedVal = Level.level.bgScale;
      G$("LS:Edge:top").storeAccessor(Level.level.edge.top);
      G$("LS:Edge:bottom").storeAccessor(Level.level.edge.bottom);
      G$("LS:Edge:left").storeAccessor(Level.level.edge.left);
      G$("LS:Edge:right").storeAccessor(Level.level.edge.right);
      G$("LS:BG:Type:Value").text = Level.level.bgType;
      G$("LS:BG:Name:input").storedVal = Level.level.bgName;
      G$("LS:File:Name:input").storedVal = Level.level.name;
    }).setIcon("GUI-Icons.png",3,0,42,4).setClose(true).show();
    TextElement.create("LS:Title","LevelSettingsView",WIDTH/2,30,fontMenuTitle,"Level Properties",WIDTH,CENTER).show();

    Button.create("FSToggle","LevelSettingsView",WIDTH-130,10,50,50).setToggle(function() {
      callPrefixedFunction(canvas,"requestFullscreen");
      callPrefixedFunction(canvas,"requestFullScreen");
    },
    function() {
      callPrefixedFunction(document,"exitFullscreen");
      callPrefixedFunction(document,"exitFullScreen");
    },true).setIcon("GUI-Icons.png",2,0,42,4).show();

    Button.create("LS:File","LevelSettingsView",WIDTH*1/5-50,75,100,40,"File").show().on = true;
    Button.create("LS:Edit","LevelSettingsView",WIDTH*2/5-50,75,100,40,"Edit").show();
    Button.create("LS:Cam","LevelSettingsView",WIDTH*3/5-50,75,100,40,"Camera").show();
    Button.create("LS:BG","LevelSettingsView",WIDTH*4/5-50,75,100,40,"BG").show();
    Button.setRadioGroup(["LS:File","LS:Edit","LS:Cam","LS:BG"],function() {
      G$(this.view.activeMenu).hide();
      this.view.activeMenu = this.name+":Menu";
      G$(this.view.activeMenu).show();
    },true);

    View.create("LS:File:Menu",1,0,0,WIDTH,HEIGHT);
    TextElement.create("LS:File:Name","LS:File:Menu",WIDTH/4-150,155,fontMenuItem,"Level Name",WIDTH,LEFT).show();
    TextInput.create("LS:File:Name:input","LS:File:Menu",WIDTH/2-175,130,205,40,"string",Level.level.name,"name","Enter the level name").setOnInputChange(function(val) {
      Level.level.name = val;
    }).show();
    Button.create("LS:File:Load","LS:File:Menu",WIDTH*2/3-50,130,205,40,"Load From File").setOnClick(Level.openLocalFile,true).show().setPressDelay(1);
    TextElement.create("LS:File:Save","LS:File:Menu",WIDTH/4-150,210,fontMenuItem,"Save Level",WIDTH,LEFT).show();
    Button.create("LS:File:Copy","LS:File:Menu",WIDTH/2-175,185,205,40,"Copy to Clipboard").setOnClick(Level.copy,true).show();
    Button.create("LS:File:Export","LS:File:Menu",WIDTH*2/3-50,185,205,40,"Export Level").setOnClick(Level.export,true).show();
    TextElement.create("LS:File:Test","LS:File:Menu",WIDTH/4-150,265,fontMenuItem,"Test Level",WIDTH,LEFT).show();
    TextInput.create("LS:File:Test:Mode","LS:File:Menu",WIDTH/2-175,240,100,40,"accessor:GAME_SURVIVAL,GAME_SANDBOX").storeAccessor(GAME_SANDBOX).show();
    TextInput.create("LS:File:Test:MP","LS:File:Menu",WIDTH/2-70,240,100,40,"boolean",false,"multiplayer").show();
    Button.create("LS:File:Test:Button","LS:File:Menu",WIDTH*2/3-50,240,205,40,"Test Level").setOnClick(function() {
      multiplayer = G$("LS:File:Test:MP").storedVal;
      EditorTools.testLevel(G$("LS:File:Test:Mode").accessValue());
    }).show();

    View.create("LS:Edit:Menu",1,0,0,WIDTH,HEIGHT);
    TextElement.create("LS:Dimensions","LS:Edit:Menu",WIDTH/4-150,155+55*0,fontMenuItem,"Dimensions",WIDTH,LEFT).show();
    TextInput.create("LS:Dimensions:width","LS:Edit:Menu",WIDTH/2-175,130,100,40,"number",Level.level.width,"width","Enter a width").setOnInputChange(function(val) {
      Level.level.width = val;
    }).show();
    TextInput.create("LS:Dimensions:height","LS:Edit:Menu",WIDTH/2-70,130,100,40,"number",Level.level.height,"height","Enter a height").setOnInputChange(function(val) {
      Level.level.height = val;
    }).show();
    TextElement.create("LS:Edge","LS:Edit:Menu",WIDTH/4-150,210,fontMenuItem,"Edge Types",WIDTH,LEFT).show();
    TextInput.create("LS:Edge:top","LS:Edit:Menu",WIDTH/2-175,185,100,40,"accessor:EDGE_NONE,EDGE_SOLID,EDGE_WRAP,EDGE_KILL",EDGE_NONE,"top","Enter top edge behavior").setOnInputChange(function(val) {
      Level.level.edge.top = val;
    }).show();
    TextInput.create("LS:Edge:bottom","LS:Edit:Menu",WIDTH/2-70,185,100,40,"accessor:EDGE_NONE,EDGE_SOLID,EDGE_WRAP,EDGE_KILL",EDGE_SOLID,"bottom","Enter bottom edge behavior").setOnInputChange(function(val) {
      Level.level.edge.bottom = val;
    }).show();
    TextInput.create("LS:Edge:left","LS:Edit:Menu",WIDTH/2+35,185,100,40,"accessor:EDGE_NONE,EDGE_SOLID,EDGE_WRAP,EDGE_KILL",EDGE_WRAP,"left","Enter left edge behavior").setOnInputChange(function(val) {
      Level.level.edge.left = val;
    }).show();
    TextInput.create("LS:Edge:right","LS:Edit:Menu",WIDTH/2+140,185,100,40,"accessor:EDGE_NONE,EDGE_SOLID,EDGE_WRAP,EDGE_KILL",EDGE_WRAP,"right","Enter right edge behavior").setOnInputChange(function(val) {
      Level.level.edge.right = val;
    }).show();

    View.create("LS:Cam:Menu",1,0,0,WIDTH,HEIGHT);
    TextElement.create("LS:CamStart","LS:Cam:Menu",WIDTH/4-150,155,fontMenuItem,"Camera Start",WIDTH,LEFT).show();
    TextInput.create("LS:CamStart:x","LS:Cam:Menu",WIDTH/2-175,130,100,40,"number",Level.level.camStart.x,"x","Enter starting x point").setOnInputChange(function(val) {
      Level.level.camStart.x = val;
    }).show();
    TextInput.create("LS:CamStart:y","LS:Cam:Menu",WIDTH/2-70,130,100,40,"number",Level.level.camStart.y,"y","Enter starting y point").setOnInputChange(function(val) {
      Level.level.camStart.y = val;
    }).show();
    TextElement.create("LS:ScrollBuffer","LS:Cam:Menu",WIDTH/4-150,210,fontMenuItem,"Scroll Buffer",WIDTH,LEFT).show();
    TextInput.create("LS:ScrollBuffer:hor","LS:Cam:Menu",WIDTH/2-175,185,100,40,"number",Level.level.horScrollBuffer,"horizontal","Enter horizontal scroll buffer").setOnInputChange(function(val) {
      Level.level.horScrollBuffer = val;
    }).show();
    TextInput.create("LS:ScrollBuffer:vert","LS:Cam:Menu",WIDTH/2-70,185,100,40,"number",Level.level.vertScrollBuffer,"vertical","Enter vertical scroll buffer").setOnInputChange(function(val) {
      Level.level.vertScrollBuffer = val;
    }).show();
    TextElement.create("LS:ZoomLimit","LS:Cam:Menu",WIDTH/4-150,265,fontMenuItem,"Zoom Limits",WIDTH,LEFT).show();
    TextInput.create("LS:ZoomLimit:min","LS:Cam:Menu",WIDTH/2-175,240,100,40,"number",Level.level.minZoom,"min","Enter minimum zoom level").setOnInputChange(function(val) {
      Level.level.minZoom = val;
    }).show();
    TextInput.create("LS:ZoomLimit:max","LS:Cam:Menu",WIDTH/2-70,240,100,40,"number",Level.level.maxZoom,"max","Enter maximum zoom level").setOnInputChange(function(val) {
      Level.level.maxZoom = val;
    }).show();
    TextElement.create("LS:ZoomScale","LS:Cam:Menu",WIDTH*2/3-50,155,fontMenuItem,"Zoom Scale",WIDTH,LEFT).show();
    TextInput.create("LS:ZoomScale:num","LS:Cam:Menu",WIDTH/2+190,130,100,40,"number",Level.level.zoomScale,"zoom scale","Enter preferred zoom level").setOnInputChange(function(val) {
      Level.level.zoomScale = val;
    }).show();

    View.create("LS:BG:Menu",1,0,0,WIDTH,HEIGHT);
    TextElement.create("LS:BG:Type","LS:BG:Menu",WIDTH/4-150,155,fontMenuItem,"Access Type",WIDTH,LEFT).show();
    TextElement.create("LS:BG:Type:Value","LS:BG:Menu",WIDTH/2-75,155,fontMenuData,"none",WIDTH,CENTER).show();
    TextElement.create("LS:BGScale","LS:BG:Menu",WIDTH*2/3-50,155,fontMenuItem,"Image Scale",WIDTH,LEFT).show();
    TextInput.create("LS:BGScale:num","LS:BG:Menu",WIDTH/2+190,130,100,40,"number",Level.level.bgScale,"bg scale","Enter the background scale").setOnInputChange(function(val) {
      Level.level.bgScale = val;
    }).show();
    TextElement.create("LS:BG:Name","LS:BG:Menu",WIDTH/4-150,210,fontMenuItem,"Image Name",WIDTH,LEFT).show();
    TextInput.create("LS:BG:Name:input","LS:BG:Menu",WIDTH/2-175,185,205,40,"string",Level.level.bgName,"bg image name","Enter the name of the image").setOnInputChange(function(val) {
      let set = function() {
        Level.level.bgName = val;
        G$("LS:BG:Type:Value").text = Level.level.bgType = "name";
      };
      if (Level.level.bgRaw!="") {
        return gameConfirm("This will delete the imported BG. Continue?",function(response) {
          if (response) {
            Level.level.bgRaw = "";
            set();
          }
          else G$("LS:BG:Name:input").storedVal = Level.level.bgName;
        })
      }
      else set();
    }).show();
    Button.create("LS:BG:Raw","LS:BG:Menu",WIDTH*2/3-50,185,205,40,"Import from File").setOnClick(function() {
      FileInput.ask(["png","jpg","jpeg","bmp","webp"],"readAsDataURL",function(result,file) {
        Level.level.bgRaw = result.split(",")[1];
        delete Images.imgData["BG-LevelRaw"];
        Images.loadImageB64("BG-LevelRaw",Level.level.bgRaw);
        G$("LS:BG:Type:Value").text = Level.level.bgType = "raw";
        G$("LS:BG:Name:input").storedVal = Level.level.bgName = "none";
      });
    }).show();
  },
  removeGui: function() {
    G$("EditorToolbar").remove();
    G$("EditorHud").remove();
    G$("ExpandButtonView").remove();
    G$("EditPropView").remove();
    G$("LevelSettingsView").remove();
    G$("LS:File:Menu").remove();
    G$("LS:Edit:Menu").remove();
    G$("LS:Cam:Menu").remove();
    G$("LS:BG:Menu").remove();
  }
}));
