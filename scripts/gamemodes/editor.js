const EditorMode = new GameMode();
GameManager.addMode(EditorMode);
const GAME_EDITOR = EditorMode.id;
EditorMode.start = function() {
  devEnabled = true;
  this.addGui();
  EditorTools.enabled = true;
  EditorTools.Actor.initSpawnGhosts();
  GameManager.overrideTick(this.tick);
};
EditorMode.quit = function() {
  devEnabled = false;
  this.removeGui();
  EditorTools.enabled = false;
  EditorTools.Actor.removeSpawnGhosts();
  GameManager.overrideTick(false);
};
EditorMode.tick = function() {
  if (focused) window.requestAnimationFrame(drawGame);
  doGlobalControls(globalKeyboard);
  GuiElement.callForAll("update");
  Particle.callForAll("update");
};
EditorMode.onLevelLoad = function() {
  G$("LevelSettingsClose").onClickFunction();
  EditorTools.Actor.removeSpawnGhosts();
  EditorTools.Actor.initSpawnGhosts();
};
EditorMode.addGui = function() {
  buildDevToolsHud();
  View.create("EditorToolbar",0,0,0,hudWidth,70,"tint","purple");
	View.create("EditorHud",0,0,0,hudWidth,70).show();
	TextElement.create("EditorModeText","EditorHud",70,40,fontMenuEdit,"Mode",hudWidth,LEFT);

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
		let tools = ["BoxTool","LineTool","ActorTool"];
		let found = false;
		for (var i in tools) {
			if (G$(tools[i]).on) {
				found = true;
				break;
			}
		}
		if (found) G$("EditorModeText").show();
		else G$("EditorModeText").hide();
		this.setIcon("GUI-Icons.png",0,1,42,4);
		this.toggleState = 0;
	}).setIcon("GUI-Icons.png",0,1,42,4).show();

	Button.create("BoxTool","EditorToolbar",80,10,50,50).setOnClick(function() {
		EditorTools.setMode(0);
	}).setRadioGroup(["LineTool","ActorTool","EraserTool"]).setIcon("GUI-Icons.png",0,2,42,4).show();
	Button.create("LineTool","EditorToolbar",150,10,50,50).setOnClick(function() {
		EditorTools.setMode(1);
	}).setRadioGroup(["BoxTool","ActorTool","EraserTool"]).setIcon("GUI-Icons.png",1,2,42,4).show();
	Button.create("ActorTool","EditorToolbar",220,10,50,50).setOnClick(function() {
		EditorTools.setMode(2);
	}).setRadioGroup(["BoxTool","LineTool","EraserTool"]).setIcon("GUI-Icons.png",2,2,42,4).show();

	Button.create("EraserTool","EditorToolbar",hudWidth-130,10,50,50).setOnClick(function() {
		this.on = !this.on;
		let button = G$(EditorTools.getModeText()+"Tool");
		if (!button.on) this.on = false;
		EditorTools.setEraserOn(this.on);
	}).setIcon("GUI-Icons.png",3,2,42,4).show();

	Button.create("EditPropBttn","EditorToolbar",hudWidth-60,10,50,50).setToggle(function() {
		G$("EditPropView").show();
		this.on = true;
		this.toggleState = 1;
	},
	function() {
		G$("EditPropView").hide();
		this.on = false;
		this.toggleState = 0;
	}).setIcon("GUI-Icons.png",2,1,42,4).show();

	View.create("EditPropView",0,0,70,hudWidth,60,"tint","green");
	Button.create("EditPropOnShown","EditPropView",0,0,0,0).setOnViewShown(function() {
		let view = G$("EditPropView");
		let props = EditorTools.getToolProperties();
		view.propNum = 0;
		for (var i = 0; i < props.length; i++) {
			let input = G$("EditProp:"+i); //try to find the input for property i
			if (TextInput.getAll().indexOf(input)==-1) { //if input wasn't found
				//make the input
				let x = 10+105*(i%6), y = 80+45*Math.floor(i/6);
				input = TextInput.create("EditProp:"+i,"EditPropView",x,y,99,40,props[i].type,props[i].val,props[i].name,"Enter a value for "+props[i].name).setOnInputChange(function(value) {
					EditorTools.setToolProperty(this.text,value,parseInt(this.name.split(":")[1]));
				});
			}
			input.show();
			input.setType(props[i].type);
			input.storedVal = props[i].val;
			input.text = props[i].name;
			input.promptMsg = "Enter a value for "+props[i].name;
			view.propNum = i+1;
			view.height = input.y-20;
		}
		if (view.propNum<view.largestPropNum) {
			for (var i = view.propNum; i < view.largestPropNum; i++) {
				G$("EditProp:"+i).hide();
			}
		}
		else view.largestPropNum = view.propNum;
	}).largestPropNum = 0;

	Button.create("LevelSettingsBttn","EditorHud",hudWidth-60,10,50,50).setOnClick(function() {
		G$("LevelSettingsView").show();
		G$("EditorHud").hide();
	}).setIcon("GUI-Icons.png",1,1,42,4).show();

	View.create("LevelSettingsView",1,0,0,hudWidth,hudHeight,"tint","purple");
	Button.create("LevelSettingsClose","LevelSettingsView",hudWidth-60,10,50,50).setOnClick(function() {
		G$("LevelSettingsView").hide();
		G$("EditorHud").show();
	}).
	setOnViewShown(function() {
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
	}).setIcon("GUI-Icons.png",3,0,42,4).setClose(true).show();
	TextElement.create("LS:Title","LevelSettingsView",hudWidth/2,30,fontMenuTitle,"Level Properties",hudWidth,CENTER).show();

	Button.create("FSToggle","LevelSettingsView",hudWidth-130,10,50,50).setToggle(function() {
		callPrefixedFunction(canvas,"requestFullscreen");
		callPrefixedFunction(canvas,"requestFullScreen");
	},
	function() {
		callPrefixedFunction(document,"exitFullscreen");
		callPrefixedFunction(document,"exitFullScreen");
	},true).setIcon("GUI-Icons.png",2,0,42,4).show();
	Button.create("LS:LoadLevel","LevelSettingsView",10,10,150,40,"Load From File").setOnClick(Level.openLocalFile,true).show().setPressDelay(1);

	TextElement.create("LS:Dimensions","LevelSettingsView",hudWidth/4-150,100+55*0,fontMenuItem,"Dimensions",hudWidth,LEFT).show();
	TextInput.create("LS:Dimensions:width","LevelSettingsView",hudWidth/2-175,75,100,40,"number",Level.level.width,"width","Enter a width").setOnInputChange(function(val) {
		Level.level.width = val;
	}).show();
	TextInput.create("LS:Dimensions:height","LevelSettingsView",hudWidth/2-70,75,100,40,"number",Level.level.height,"height","Enter a height").setOnInputChange(function(val) {
		Level.level.height = val;
	}).show();

	TextElement.create("LS:CamStart","LevelSettingsView",hudWidth/4-150,155,fontMenuItem,"Camera Start",hudWidth,LEFT).show();
	TextInput.create("LS:CamStart:x","LevelSettingsView",hudWidth/2-175,130,100,40,"number",Level.level.camStart.x,"x","Enter starting x point").setOnInputChange(function(val) {
		Level.level.camStart.x = val;
	}).show();
	TextInput.create("LS:CamStart:y","LevelSettingsView",hudWidth/2-70,130,100,40,"number",Level.level.camStart.y,"y","Enter starting y point").setOnInputChange(function(val) {
		Level.level.camStart.y = val;
	}).show();

	TextElement.create("LS:ScrollBuffer","LevelSettingsView",hudWidth/4-150,210,fontMenuItem,"Scroll Buffer",hudWidth,LEFT).show();
	TextInput.create("LS:ScrollBuffer:hor","LevelSettingsView",hudWidth/2-175,185,100,40,"number",Level.level.horScrollBuffer,"horizontal","Enter horizontal scroll buffer").setOnInputChange(function(val) {
		Level.level.horScrollBuffer = val;
	}).show();
	TextInput.create("LS:ScrollBuffer:vert","LevelSettingsView",hudWidth/2-70,185,100,40,"number",Level.level.vertScrollBuffer,"vertical","Enter vertical scroll buffer").setOnInputChange(function(val) {
		Level.level.vertScrollBuffer = val;
	}).show();

	TextElement.create("LS:ZoomLimit","LevelSettingsView",hudWidth/4-150,265,fontMenuItem,"Zoom Limits",hudWidth,LEFT).show();
	TextInput.create("LS:ZoomLimit:min","LevelSettingsView",hudWidth/2-175,240,100,40,"number",Level.level.minZoom,"min","Enter minimum zoom level").setOnInputChange(function(val) {
		Level.level.minZoom = val;
	}).show();
	TextInput.create("LS:ZoomLimit:max","LevelSettingsView",hudWidth/2-70,240,100,40,"number",Level.level.maxZoom,"max","Enter maximum zoom level").setOnInputChange(function(val) {
		Level.level.maxZoom = val;
	}).show();

	TextElement.create("LS:Edge","LevelSettingsView",hudWidth/4-150,320,fontMenuItem,"Edge Behavior",hudWidth,LEFT).show();
	TextInput.create("LS:Edge:top","LevelSettingsView",hudWidth/2-175,295,100,40,"accessor:EDGE_NONE,EDGE_SOLID,EDGE_WRAP,EDGE_KILL",EDGE_NONE,"top","Enter top edge behavior").setOnInputChange(function(val) {
		Level.level.edge.top = val;
	}).show();
	TextInput.create("LS:Edge:bottom","LevelSettingsView",hudWidth/2-70,295,100,40,"accessor:EDGE_NONE,EDGE_SOLID,EDGE_WRAP,EDGE_KILL",EDGE_SOLID,"bottom","Enter bottom edge behavior").setOnInputChange(function(val) {
		Level.level.edge.bottom = val;
	}).show();
	TextInput.create("LS:Edge:left","LevelSettingsView",hudWidth/2+35,295,100,40,"accessor:EDGE_NONE,EDGE_SOLID,EDGE_WRAP,EDGE_KILL",EDGE_WRAP,"left","Enter left edge behavior").setOnInputChange(function(val) {
		Level.level.edge.left = val;
	}).show();
	TextInput.create("LS:Edge:right","LevelSettingsView",hudWidth/2+140,295,100,40,"accessor:EDGE_NONE,EDGE_SOLID,EDGE_WRAP,EDGE_KILL",EDGE_WRAP,"right","Enter right edge behavior").setOnInputChange(function(val) {
		Level.level.edge.right = val;
	}).show();

	TextElement.create("LS:ZoomScale","LevelSettingsView",hudWidth*2/3-50,100,fontMenuItem,"Zoom Scale",hudWidth,LEFT).show();
	TextInput.create("LS:ZoomScale:num","LevelSettingsView",hudWidth/2+190,75,100,40,"number",Level.level.zoomScale,"zoom scale","Enter preferred zoom level").setOnInputChange(function(val) {
		Level.level.zoomScale = val;
	}).show();

	TextElement.create("LS:BGScale","LevelSettingsView",hudWidth*2/3-50,155,fontMenuItem,"BG Scale",LEFT).show();
	TextInput.create("LS:BGScale:num","LevelSettingsView",hudWidth/2+190,130,100,40,"number",Level.level.bgScale,"bg scale","Enter the background scale").setOnInputChange(function(val) {
		Level.level.bgScale = val;
	}).show();
};
EditorMode.removeGui = function() {
  G$("EditorToolbar").remove();
  G$("EditorHud").remove();
  G$("ExpandButtonView").remove();
  G$("EditPropView").remove();
  G$("LevelSettingsView").remove();
};
