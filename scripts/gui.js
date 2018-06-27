function G$(query) {
	var v = View.getAll(), g = GuiElement.getAll();
	for (var i in v) {
		if (v[i].name==query) return v[i];
	}
	for (var i in g) {
		if (g[i].name==query) return g[i];
	}
	return {hide:function(){}, show:function(){}, on:function(){return false;}}
}
G$.hide = function(q) { return this(q).hide(); }
G$.show = function(q) { return this(q).show(); }
G$.on = function(q) {
	var g = this(q);
	if (g instanceof GuiElement) {
		return g.on;
	}
}

function buildMainHud() {
  View.create("Hud",0,0,0,hudWidth,hudHeight).show();
	Button.create("RespawnP1Button","Hud",hudWidth/2-50,50,100,40,"Respawn").setOnClick(function() {
		addPlayer(0);
	});
	Button.create("AddP1Button","Hud",hudWidth/2-110,50,100,40,"P1 Start").setOnClick(function() {
		addPlayer(0);
	});
	Button.create("AddP2Button","Hud",hudWidth/2+10,50,100,40,"P2 Start").setOnClick(function() {
		addPlayer(1);
	});
	Button.create("PauseButton","Hud",hudWidth-60,10,50,50).setOnClick(function() {
		pauseGame(true);
	}).setIcon("GUI-Icons.png",0,0,42,4).show();
}

function buildPauseMenu() {
  View.create("PauseMenu",0,0,0,hudWidth,hudHeight,"tint","black");

	TextElement.create("PauseText","PauseMenu",hudWidth/2,hudHeight/2,"Paused","Catamaran, sans-serif",60,true,"yellow",CENTER,true,"darkOrange",5,true,"orange",3,8).show();
	TextElement.create("PauseFocusMsg","PauseMenu",hudWidth/2,hudHeight/2+55,"Click to focus","Catamaran, sans-serif",30,false,"#ff6f6b",CENTER,false,"#ad2f2b",3,true,"#ad2f2b",3,8);

  Button.create("PauseClose","PauseMenu",hudWidth-60,10,50,50).setOnClick(function() {
		pauseGame(false);
	}).setIcon("GUI-Icons.png",1,0,42,4).show();

  Button.create("MultiJumpToggle","PauseMenu",20,hudHeight-120,130,40,"MultiJump").setOnClick(function() {
		this.on = !this.on;
		Player.prototype.multiJump = this.on;
	}).show();

	Button.create("LevelSelectButton","PauseMenu",20,hudHeight-60,130,40,"Level Select").setOnClick(function() {
		G$("LevelSelectView").show();
		G$("PauseMenu").hide();
	}).show().setPressDelay(1);

	Button.create("GameModeToggle","PauseMenu",hudWidth-150,hudHeight-60,130,40,"Sandbox Mode")./*setOnClick(function(ctrl) {
		setGameMode(gameMode+1);
	}).*/show();

  Button.create("MPToggle","PauseMenu",hudWidth-150,hudHeight-120,130,40,"Singleplayer").setOnClick(function(ctrl) {
		multiplayer = !multiplayer;
		G$("MPToggle").text = multiplayer?"Multiplayer":"Singleplayer";
		if (multiplayer) {
			G$("RespawnP1Button").hide();
			for (var i in Player.slots) {
				if (!Player.respawnButtons[i]) continue;
				if (!Player.slots[i]) Player.respawnButtons[i].show();
				else Player.respawnButtons[i].hide();
			}
		}
		else {
			for (var i in Player.slots) if (Player.respawnButtons[i]) Player.respawnButtons[i].hide();
			if (!Player.slots[0]) G$("RespawnP1Button").show();
			else G$("RespawnP1Button").hide();
		}
	}).show();

  Button.create("FSToggle","PauseMenu",hudWidth-130,10,50,50).setToggle(function() {
		callPrefixedFunction(canvas,"requestFullscreen");
		callPrefixedFunction(canvas,"requestFullScreen");
	}, function() {
		callPrefixedFunction(document,"exitFullscreen");
		callPrefixedFunction(document,"exitFullScreen");
	},true).setIcon("GUI-Icons.png",2,0,42,4).show();

  Button.create("CtrlSettingsButton","PauseMenu",10,10,50,50,"Controller Settings").setOnClick(function() {
		G$("CtrlSettingsView").show();
		G$("PauseMenu").hide();
	}).setIcon("GUI-Icons.png",3,1,42,4).show();

	Button.create("HelpButton","PauseMenu",70,10,50,50,"Help").setOnClick(function() {
		G$("HelpView").show();
		G$("PauseMenu").hide();
	}).show();

  // TextElement.create("UserInfo","PauseMenu",hudWidth/2,hudHeight-30,"Logged in as "+User.name,"Catamaran, sans-serif",15,false,"white",CENTER)//.show();
	// Button.create("LoginoutButton","PauseMenu",hudWidth/2-50,hudHeight-20,100,15,User.loggedIn?"Logout":"Login").setOnClick(function() {
	// 	User.useLink();
	// })//.show();
}

function buildLevelSelectMenu() {
  View.create("LevelSelectView",1,0,0,hudWidth,hudHeight,"tint","black");

  TextElement.create("LSText","LevelSelectView",hudWidth/2,30,"Select a level","Catamaran, sans-serif",30,false,"white",CENTER,true,"gray",5,true,"black",3,8).show();

	Button.create("LSClose","LevelSelectView",hudWidth-60,10,50,50).setOnClick(function() {
		G$("LevelSelectView").hide();
		G$("PauseMenu").show();
	}).setIcon("GUI-Icons.png",3,0,42,4).setClose(true).show();

  ResourceManager.request("levels/_list_.json", function(data) {
		var levelNames = JSON.parse(data);
		for (var i in levelNames) {
			var name = levelNames[i].split(".")[0];
			var y = Math.floor(i/2);
			var x = i%2==0?20:240;
			Button.create("LSLevel"+i,"LevelSelectView",x,50+y*60,200,40,name).setOnClick(function() {
				ResourceManager.request("levels/"+this.text+".json",function(data) {
					Level.load(data);
				});
			}).show();
		}
	});

	Button.create("LSFileButton","LevelSelectView",hudWidth-170,hudHeight-60,150,40,"Load From File").setOnClick(Level.openLocalFile,true).show().setPressDelay(1);
}

function buildControllerSettingsMenu() {
  View.create("CtrlSettingsView",1,0,0,hudWidth,hudHeight,"tint","black");
	TextElement.create("CtrlSettingsText","CtrlSettingsView",hudWidth/2,30,"Controller Settings","Catamaran, sans-serif",30,false,"white",CENTER,true,"gray",5,true,"black",3,8).show();

  Button.create("CtrlSettingsClose","CtrlSettingsView",hudWidth-60,10,50,50).setOnClick(function() {
		G$("CtrlSettingsView").hide();
		G$("PauseMenu").show();
	}).setIcon("GUI-Icons.png",3,0,42,4).setClose(true).show();

  TextElement.create("CtrlP1","CtrlSettingsView",hudWidth/2-135,100,"Player 1","Catamaran, sans-serif",20,false,"yellow",CENTER,true,"darkOrange",2,false).show();
	TextElement.create("CtrlP2","CtrlSettingsView",hudWidth/2+135,100,"Player 2","Catamaran, sans-serif",20,false,"yellow",CENTER,true,"darkOrange",2,false).show();

  Button.create("CtrlP1Keyboard","CtrlSettingsView",hudWidth/2-260,130,250,40,"Keyboard").setOnViewShown(function() {
		this.text = Ctrl.getDisplayName(KEYBOARD,Player.keyIds[0]);
		this.playerSlot = 0;
	}).setOnClick(function() {
		buildControllerSelector([0,1],KEYBOARD,this);
	}).show();
  Button.create("CtrlP1GamePad","CtrlSettingsView",hudWidth/2-260,180,250,40,"GamePad").setOnViewShown(function() {
		this.text = Ctrl.getDisplayName(GAMEPAD,Player.gpIds[0]);
		this.playerSlot = 0;
	}).setOnClick(function() {
		buildControllerSelector(GamePad.slotsFilled(),GAMEPAD,this);
	}).show();
	Button.create("CtrlP1Touch","CtrlSettingsView",hudWidth/2-260,230,250,40,"Touch Controls").setOnViewShown(function() {
		this.text = Ctrl.getDisplayName(TOUCH,Player.tapIds[0]);
		this.playerSlot = 0;
	}).setOnClick(function() {
		buildControllerSelector([0],TOUCH,this);
	}).show();

  Button.create("CtrlP2Keyboard","CtrlSettingsView",hudWidth/2+10,130,250,40,"Keyboard").setOnViewShown(function() {
		this.text = Ctrl.getDisplayName(KEYBOARD,Player.keyIds[1]);
		this.playerSlot = 1;
	}).setOnClick(function() {
		buildControllerSelector([0,1],KEYBOARD,this);
	}).show();
	Button.create("CtrlP2GamePad","CtrlSettingsView",hudWidth/2+10,180,250,40,"GamePad").setOnViewShown(function() {
		this.text = Ctrl.getDisplayName(GAMEPAD,Player.gpIds[1]);
		this.playerSlot = 1;
	}).setOnClick(function() {
		buildControllerSelector(GamePad.slotsFilled(),GAMEPAD,this);
	}).show();
	Button.create("CtrlP2Touch","CtrlSettingsView",hudWidth/2+10,230,250,40,"Touch Controls").setOnViewShown(function() {
		this.text = Ctrl.getDisplayName(TOUCH,Player.tapIds[1]);
		this.playerSlot = 1;
	}).setOnClick(function() {
		buildControllerSelector([0],TOUCH,this);
	}).show();

	Button.create("CtrlDevMode","CtrlSettingsView",hudWidth-15,hudHeight-15,10,10).setOnClick(function() {
		this.on = devEnabled = !devEnabled;
	}).show();

	Button.create("CtrlMapperBttn","CtrlSettingsView",5,hudHeight-45,200,40,"Gamepad Mapper").setOnViewShown(function() {
		var ids = GamePad.slotsFilled();
		if (ids.length==0) {
			this.setOnClick(null);
			this.mode = BUTTON_NO;
		}
		else this.setOnClick(function() {
			G$("CtrlSettingsView").hide();
			G$("MapperView").show();
		});
	}).show();
}
function buildControllerSelector(list,type,sourceButton) {
	var finalList = [], names = [];
	for (var i in list) {
		var mapSettings = [Player.keyIds,Player.gpIds,Player.tapIds][[KEYBOARD,GAMEPAD,TOUCH].indexOf(type)];
		if (mapSettings.indexOf(list[i])==-1 || list[i]==mapSettings[sourceButton.playerSlot]) {
			finalList.push(list[i]);
			names.push(Ctrl.getDisplayName(type,list[i]));
		}
	}
	finalList.push("None");
	names.push("None");

	buildSelector(names,function(i,item) {
		sourceButton.text = item;
		Player.changeControlSlots(sourceButton.playerSlot,type,finalList[i]);
	},null,2);
}

function buildSelector(list,onSelect,onCancel,viewLayer) {
	View.create("Selector",viewLayer===void(0)?1:viewLayer,0,0,hudWidth,hudHeight,"tint","darkBlue").show();
	for (var i in list) {
		Button.create("Selector::"+i,"Selector",hudWidth/2-150,30+50*i,300,40,list[i]).setOnClick(function() {
			if (typeof onSelect=="function") onSelect(this.name.split("::")[1],this.text);
			G$("SelectorClose").onClickFunction();
		}).show();
	}
	Button.create("SelectorClose","Selector",hudWidth/2-150,hudHeight-70,300,40,"Cancel").setOnClick(function() {
		if (typeof onCancel=="function") onCancel();
		var view = G$("Selector");
		for (var i in view.children) view.children[i].remove();
		view.hide().remove();
	}).setClose(true).show();
}

function buildHelpPage() {
	View.create("HelpView",1,0,0,hudWidth,hudHeight,"tint","black");
	Button.create("HelpClose","HelpView",hudWidth-60,10,50,50).setOnClick(function() {
		G$("WASDPage").onClickFunction();
		G$("HelpView").hide();
		G$("PauseMenu").show();
	}).setIcon("GUI-Icons.png",3,0,42,4).setClose(true).show();

	var actions = ["Move Left / Right", "Jump", "Crouch", "Attack", "Enter Door / Up"];
	var onClick = function() {
		this.on = true;
		buildControlList(this.b,this.a);
	}

	TextElement.create("HelpTitle","HelpView",hudWidth/2,30,"Controls","Catamaran, sans-serif",30,false,"white",CENTER,true,"gray",5,true,"black",3,8).show();
	var bWasd = Button.create("WASDPage","HelpView",10,100,100,40,"WASD").setOnClick(onClick).setRadioGroup(["IJKLPage","MovesPage"]).show();
	bWasd.b = ["A / D", "W", "S", "G", "E"], bWasd.a = actions; bWasd.on = true;
	var bIjkl = Button.create("IJKLPage","HelpView",10,150,100,40,"IJKL").setOnClick(onClick).setRadioGroup(["WASDPage","MovesPage"]).show();
	bIjkl.b = ["J / L", "I", "K", "'", "O"], bIjkl.a = actions;
	var bMoves = Button.create("MovesPage","HelpView",10,250,100,40,"Moves").setOnClick(onClick).setRadioGroup(["WASDPage","IJKLPage"]).show();
	bMoves.b = ["Lift","Charge","Stab Down","Swipe Up","Air Jab"];
	bMoves.a = ["[Crouch + Attack] on top of object","Hold [Attack] and release","[Crouch + Attack] when in air","[Up + Attack] or [Crouch] on Charge","[Up + Attack] or [Jump + Attack] in air"];

	buildControlList(bWasd.b,actions);
}
function buildControlList(buttons,actions) {
	buttons = buttons||[], actions = actions||[];
	for (var i in actions) {
		var te = G$("HelpItem-A::"+i);
		if (te instanceof TextElement) te.text = actions[i];
		else TextElement.create("HelpItem-A::"+i,"HelpView",hudWidth/2-50,100+55*i,actions[i],"Catamaran, sans-serif",20,false,"yellow",LEFT,true,"darkOrange",2).show();
	}
	for (var i in buttons) {
		var te = G$("HelpItem-B::"+i);
		if (te instanceof Button) te.text = buttons[i];
		else Button.create("HelpItem-B::"+i,"HelpView",hudWidth/5+5,70+55*i,120,50,buttons[i]).show();
	}
}

function buildMapperView() {
  View.create("MapperView",1,0,0,hudWidth,hudHeight,"tint","black");
	// ImgElement.create("MapperImg","MapperView",hudWidth/2,hudHeight/2,"GUI-Controller.png",640,360).show();
	TextElement.create("MapperTitle","MapperView",hudWidth/2,30,"Gamepad Mapper","Catamaran, sans-serif",30,false,"white",CENTER,true,"gray",5,true,"black",3,8).show();

	Button.create("MapperClose","MapperView",hudWidth-60,10,50,50).setOnClick(function() {
		G$("MapperView").hide();
		G$("CtrlSettingsView").show();
	}).setIcon("GUI-Icons.png",3,0,42,4).setClose(true).show();

	TextElement.create("MapperSelectText","MapperView",hudWidth/3-5,115,"Settings for: ","Catamaran, sans-serif",20,false,"yellow",RIGHT,true,"darkOrange",2).show();
	Button.create("MapperGPSelect","MapperView",hudWidth/3+5,90,300,40).setOnViewShown(function() {
		var ids = GamePad.slotsFilled();
		if (ids.length==0) G$("MapperClose").onClickFunction();
		else {
			this.selectedId = ids[0];
			this.text = GamePad.controllers[ids[0]].name;
			updateMapText(ids[0]);
		}
	}
	).setOnClick(function() {
		var ids = GamePad.slotsFilled(), names = [];
		for (var i in ids) names.push(GamePad.controllers[ids[i]].name);
		buildSelector(names,function(i,item) {
			var b = G$("MapperGPSelect");
			b.text = item;
			b.selectedId = ids[i];
		},null,2);
	}).show();

	TextElement.create("MapperCurrentMapText","MapperView",hudWidth/3-5,165,"Current Mapping: ","Catamaran, sans-serif",20,false,"yellow",RIGHT,true,"darkOrange",2).show();
	TextElement.create("MapperMappingName","MapperView",hudWidth/3+5,165,"__","Catamaran, sans-serif",20,false,"yellow",LEFT,true,"darkOrange",2).show();
	TextElement.create("MapperMappingDetails","MapperView",hudWidth/2,205,"none","Catamaran, sans-serif",20,false,"lime",CENTER,true,"darkGreen",2,null,null,null,null,hudWidth-20).show();
	TextElement.create("MapperMappingDetails2","MapperView",hudWidth/2,245,"","Catamaran, sans-serif",20,false,"lime",CENTER,true,"darkGreen",2,null,null,null,null,hudWidth-20).show();

	Button.create("MapperRemap","MapperView",hudWidth/3-100,hudHeight-90,200,40,"Change Mappings").setOnViewShown(function() {
		var id = G$("MapperGPSelect").selectedId;
		if (!GamePad.controllers[id]) G$("MapperClose").onClickFunction();
		else this.setOnClick(function() {
			G$("MapperTool").selectedId = id;
			G$("MapperTool").show();
		});
	}).show();
	Button.create("MapperSetDefault","MapperView",hudWidth*2/3-100,hudHeight-90,200,40,"Reset to Default").setOnViewShown(function() {
		var id = G$("MapperGPSelect").selectedId;
		if (GamePad.ctrlMaps[id]==GamePad.customMaps[0]) {
			this.setOnClick(null);
			this.mode = BUTTON_NO;
		}
		else this.setOnClick(function() {
			var id = G$("MapperGPSelect").selectedId;
			GamePad.changeMap(id,GamePad.customMaps[0]);
			updateMapText(id);
		});
	}).show();
}
function updateMapText(id) {
	var map = GamePad.ctrlMaps[id]
	G$("MapperMappingName").text = map.name;
	strs = genMapDetails(map);
	G$("MapperMappingDetails").text = strs[0];
	G$("MapperMappingDetails2").text = strs[1];
}
function genMapDetails(standardMap) {
	if (!standardMap||!standardMap.actions||!standardMap.mappings) return ["none",""];
	var name = ["A","B","Start","Select","BumperL","BumperR","AnalogL_X","AnalogL_Y","AnalogR_X","AnalogR_Y","Dpad","Up","Down","Left","Right"];
	var note = ["(0)","(1)","Paus","Sel","LB","RB","ALX","ALY","ARX","ARY","Dpd","U","D","L","R"];
	var results1 = [], results2 = [];
	var targetResult = results1;
	for (var i in name) {
		let mapIndex = standardMap.inputs.indexOf(name[i]);
		if (mapIndex!=-1) {
			targetResult.push(note[i] + ": " + standardMap.mappings[mapIndex]);
		}
		else targetResult.push(note[i] + ": none");
		if (i==7) targetResult = results2;
	}
	return [results1.join(", "),results2.join(", ")];
}

function buildMapperTool() {
	View.create("MapperTool",2,70,70,hudWidth-140,hudHeight-140,"window");
	Button.create("MapperToolClose","MapperTool",hudWidth-130,80,50,50).setOnClick(function() {
		G$("MapperTool").hide();
		GamePad.buttonListeners = [];
		GamePad.axisListeners = [];
	}).setIcon("GUI-Icons.png",3,0,42,4).setClose(true).show();

	var titles = ["Press Button 0","Press Button 1","Press Start","Press Select","Press Left Bumper","Press Right Bumper",
	"Move Left Stick Left/Right","Move Left Stick Up/Down","Move Right Stick Left/Right","Move Right Up/Down",
	"Press on the DPad","Press Up","Press Down","Press Left","Press Right"];
	TextElement.create("MapperToolText","MapperTool",hudWidth/2,150,"Press A","Catamaran, sans-serif",30,true,"white",CENTER,true,"gray",5,true,"black",3,8).show();
	Button.create("MapperToolSkip","MapperTool",hudWidth/2-50,hudHeight-150,100,40,"Skip").setOnViewShown(function() {
		var id = G$("MapperTool").selectedId;
		if (!GamePad.controllers[id]) G$("MapperToolClose").onClickFunction();
		this.mode = BUTTON_NO;
		mapperStep(id,0,titles,"button");
	}).show();
}
function mapperStep(gpId,step,titles,type,mappings) {
	if (!mappings) mappings = [];
	G$("MapperTool").step = step;
	G$("MapperToolText").text = titles[step];
	let skip = G$("MapperToolSkip").setOnClick(function() {
		GamePad.buttonListeners = [];
		GamePad.axisListeners = [];
		this.mappings.push(null);
		var nextStep = G$("MapperTool").step+1;
		switch(this.type) {
			case "button":
				if (nextStep < 6) mapperStep(this.gpId,nextStep,this.titles,"button",this.mappings);
				else if (nextStep < 10) mapperStep(this.gpId,nextStep,this.titles,"axis",this.mappings);
				else if (nextStep < titles.length) mapperStep(this.gpId,nextStep,this.titles,"button",this.mappings);
				else this.finish();
				break;
			case "axis":
				if (nextStep < 10) mapperStep(this.gpId,nextStep,this.titles,"axis",this.mappings);
				else mapperStep(this.gpId,nextStep,this.titles,"dpad",this.mappings);
				break;
			case "dpad":
				this.mappings.push(null,null,null,null);
				finish();
		}
	});
	skip.text = "Skip";
	skip.gpId = gpId;
	skip.titles = titles;
	skip.type = type;
	skip.mappings = mappings;

	let finish = function() {
		G$("MapperToolText").text = "done";
		G$("MapperToolSkip").setOnClick(function() {
			G$("MapperToolClose").onClickFunction();
			G$("MapperView").hide().show();
		}).text = "Done";
		let c = new CtrlMap("custom-"+GamePad.customMaps.length,GAMEPAD,dmInputs,mappings,dmActions,gpadGroupings);
		GamePad.customMaps.push(c);
		GamePad.ctrlMaps[gpId] = c;
		Player.relinkCtrls();
	}
	skip.finish = finish;

	if (!GamePad.controllers[gpId]) G$("MapperToolClose").onClickFunction();
	else switch(type) {
		case "button":
			GamePad.onNextButtonPress(gpId,function(buttonId,gp) {
				mappings.push(buttonId);
				var nextStep = G$("MapperTool").step+1;
				if (nextStep < 6) mapperStep(gp.index,nextStep,titles,"button",mappings);
				else if (nextStep < 10) mapperStep(gp.index,nextStep,titles,"axis",mappings);
				else if (nextStep < titles.length) mapperStep(gp.index,nextStep,titles,"button",mappings);
				else finish();
			});
			break;
		case "axis":
			GamePad.onNextAxisPress(gpId,function(axisId,gp) {
				mappings.push('a'+axisId);
				var nextStep = G$("MapperTool").step+1;
				if (nextStep < 10) mapperStep(gp.index,nextStep,titles,"axis",mappings);
				else mapperStep(gp.index,nextStep,titles,"dpad",mappings);
			});
			break;
		case "dpad":
			GamePad.onNextButtonPress(gpId,function(buttonId,gp) {
				GamePad.axisListeners = [];
				mappings.push(null);
				var nextStep = G$("MapperTool").step+1;
				mapperStep(gp.index,nextStep,titles,"button",mappings);
			});
			GamePad.onNextAxisPress(gpId,function(axisId,gp) {
				GamePad.buttonListeners = [];
				mappings.push('a'+axisId,null,null,null,null);
				finish();
			});
			break;
	}
}

function buildDevToolsHud() {
  View.create("DevTools",0,hudWidth-70,70,70,210,"tint","lightBlue");
	let setOn = function() {
		if (G$("DevPencil").on) Pointer.cursor = POINTER_PENCIL;
		else Pointer.cursor = POINTER_CROSSHAIR;
	}
	Button.create("DevSpawnPM","DevTools",hudWidth-60,80,50,50).setOnClick(setOn).setRadioGroup(["DevPencil","DevEraser"]).setIcon("GUI-Icons.png",2,2,42,4).show();
	Button.create("DevPencil","DevTools",hudWidth-60,150,50,50).setOnClick(setOn).setRadioGroup(["DevSpawnPM","DevEraser"]).setIcon("GUI-Icons.png",1,2,42,4).show();
	Button.create("DevEraser","DevTools",hudWidth-60,220,50,50).setOnClick(function() {
		if (this.on) this.on = false;
		else if (G$("DevSpawnPM").on||G$("DevPencil").on) this.on = true;
		Pointer.cursor = this.on?POINTER_ERASER:(G$("DevPencil").on?POINTER_PENCIL:POINTER_CROSSHAIR);
	}).setIcon("GUI-Icons.png",3,2,42,4).show();
}

function buildEditorTools() {
	View.create("EditorToolbar",0,0,0,hudWidth,70,"tint","purple");
	View.create("EditorHud",0,0,0,70,70).show();
	TextElement.create("EditorModeText","EditorHud",70,40,"Mode","Catamaran, sans-serif",20,false,"fuchsia",LEFT,true,"purple",2);

	Button.create("ExpandButton","EditorHud",10,10,50,50).setToggle(function() {
		G$("EditorToolbar").show();
		G$("EditorModeText").hide();
		this.setIcon("GUI-Icons.png",3,0,42,4);
		this.toggleState = 1;
	},
	function(ctrl) {
		let p = G$("EditPropBttn");
		if (p.on) p.states[1].call(p,ctrl);
		G$("EditorToolbar").hide();
		let tools = ["BoxTool","LineTool","SpriteTool"];
		let found = false;
		for (var i in tools) {
			if (G$(tools[i]).on) {
				found = true;
				break;
			}
		}
		if (found) G$("EditorModeText").show();
		this.setIcon("GUI-Icons.png",0,1,42,4);
		this.toggleState = 0;
	}).setIcon("GUI-Icons.png",0,1,42,4).show();

	Button.create("BoxTool","EditorToolbar",80,10,50,50).setOnClick(function() {
		EditorTools.setMode(0);
	}).setRadioGroup(["LineTool","SpriteTool","EraserTool"]).setIcon("GUI-Icons.png",0,2,42,4).show();
	Button.create("LineTool","EditorToolbar",150,10,50,50).setOnClick(function() {
		EditorTools.setMode(1);
	}).setRadioGroup(["BoxTool","SpriteTool","EraserTool"]).setIcon("GUI-Icons.png",1,2,42,4).show();
	Button.create("SpriteTool","EditorToolbar",220,10,50,50).setOnClick(function() {
		EditorTools.setMode(2);
	}).setRadioGroup(["BoxTool","LineTool","EraserTool"]).setIcon("GUI-Icons.png",2,2,42,4).show();

	Button.create("EraserTool","EditorToolbar",hudWidth-200,10,50,50).setOnClick(function() {
		this.on = !this.on;
		let button = G$(EditorTools.getModeText()+"Tool");
		if (!button.on) this.on = false;
		EditorTools.setEraserOn(this.on);
	}).setIcon("GUI-Icons.png",3,2,42,4).show();

	Button.create("EditPropBttn","EditorToolbar",hudWidth-130,10,50,50).setToggle(function() {
		G$("EditPropView").show();
		this.on = true;
		this.toggleState = 1;
	},
	function() {
		G$("EditPropView").hide();
		this.on = false;
		this.toggleState = 0;
	}).setIcon("GUI-Icons.png",1,1,42,4).show();

	Button.create("LevelSettingsBttn","EditorToolbar",hudWidth-60,10,50,50).setOnClick(function() {
		G$("LevelSettingsView").show();
	}).setIcon("GUI-Icons.png",1,1,42,4).show();

	View.create("EditPropView",0,0,70,hudWidth,60,"tint","green");
	Button.create("EditPropOnShown","EditPropView",0,0,0,0).setOnViewShown(function() {
		let view = G$("EditPropView");
		let props = EditorTools.getToolProperties();
		view.propNum = 0;
		for (var i = 0; i < props.length; i++) {
			let button = G$("EditProp:"+i);
			if (Button.getAll().indexOf(button)==-1) {
				let x = 10+140*(i%4), y = 80+45*Math.floor(i/4);
				button = Button.create("EditProp:"+i,"EditPropView",x,y,125,40,props[i].name+": "+props[i].val).setOnClick(function() {
					let response = prompt("Enter value to replace ["+this.propVal+"]");
					if (response===void(0)) response = "";
					if (this.propType=="number"&&!isNaN(parseInt(response))) response = parseInt(response);
					if (typeof response==this.propType) {
						if (response==="") response = null;
						this.propVal = response;
						this.text = this.propName+": "+response;
						EditorTools.setToolProperty(this.propName,response);
					}
				});
			}
			button.show();
			button.propName = props[i].name;
			button.propVal = props[i].val;
			button.propType = props[i].type;
			button.text = props[i].name +": "+props[i].val;
			view.propNum = i+1;
			view.height = button.y-20;
		}
		if (view.propNum<view.largestPropNum) {
			for (var i = view.propNum; i < view.largestPropNum; i++) {
				G$("EditProp:"+i).hide();
			}
		}
		else view.largestPropNum = view.propNum;
	}).largestPropNum = 0;

	View.create("LevelSettingsView",1,0,0,hudWidth,hudHeight,"tint","orange");
	Button.create("LevelSettingsClose","LevelSettingsView",hudWidth-60,10,50,50).setOnClick(function() {
		G$("LevelSettingsView").hide();
	}).setIcon("GUI-Icons.png",3,0,42,4).setClose(true).show();

}
