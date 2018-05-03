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
					loadLevel(data);
				});
			}).show();
		}
	});

	Button.create("LSFileButton","LevelSelectView",hudWidth-170,hudHeight-60,150,40,"Load From File").setOnClick(openLocalFile,true).show().setPressDelay(1);
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
		this.text = getCtrlDisplayName(Player.keyMaps[0],"keyboard");
		this.playerSlot = 0;
	}).setOnClick(function() {
		buildControllerSelector([wasd,ijkl],"keyboard",this);
	}).show();
  Button.create("CtrlP1GamePad","CtrlSettingsView",hudWidth/2-260,180,250,40,"GamePad").setOnViewShown(function() {
		var globalGPCtrl = Player.globalGPCtrls[0];
		if (globalGPCtrl) this.text = globalGPCtrl.gamepadName;
		else this.text = "None";
		this.playerSlot = 0;
	}).setOnClick(function() {
		buildControllerSelector(GamePad.slotsFilled(),"gamepad",this);
	}).show();
	Button.create("CtrlP1Touch","CtrlSettingsView",hudWidth/2-260,230,250,40,"Touch Controls").setOnViewShown(function() {
		this.text = getCtrlDisplayName(Player.tapMaps[0],"touch");
		this.playerSlot = 0;
	}).setOnClick(function() {
		buildControllerSelector([tscr],"touch",this);
	}).show();

  Button.create("CtrlP2Keyboard","CtrlSettingsView",hudWidth/2+10,130,250,40,"Keyboard").setOnViewShown(function() {
		this.text = getCtrlDisplayName(Player.keyMaps[1],"keyboard");
		this.playerSlot = 1;
	}).setOnClick(function() {
		buildControllerSelector([wasd,ijkl],"keyboard",this);
	}).show();
	Button.create("CtrlP2GamePad","CtrlSettingsView",hudWidth/2+10,180,250,40,"GamePad").setOnViewShown(function() {
		var globalGPCtrl = Player.globalGPCtrls[1];
		if (globalGPCtrl) this.text = globalGPCtrl.gamepadName;
		else this.text = "None";
		this.playerSlot = 1;
	}).setOnClick(function() {
		buildControllerSelector(GamePad.slotsFilled(),"gamepad",this);
	}).show();
	Button.create("CtrlP2Touch","CtrlSettingsView",hudWidth/2+10,230,250,40,"Touch Controls").setOnViewShown(function() {
		this.text = getCtrlDisplayName(Player.tapMaps[1],"touch");
		this.playerSlot = 1;
	}).setOnClick(function() {
		buildControllerSelector([tscr],"touch",this);
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
		var mapSettings = [Player.keyMaps,Player.gpIds,Player.tapMaps][["keyboard","gamepad","touch"].indexOf(type)];
		if (mapSettings.indexOf(list[i])==-1 || list[i]==mapSettings[sourceButton.playerSlot]) {
			finalList.push(list[i]);
			names.push(getCtrlDisplayName(list[i],type));
		}
	}
	finalList.push("None");
	names.push("None");

	buildSelector(names,function(i,item) {
		sourceButton.text = item;
		changeControlSlots(type,sourceButton.playerSlot,finalList[i]);
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
		buildControlList(this.b,this.a);
	}

	TextElement.create("HelpTitle","HelpView",hudWidth/2,30,"Controls","Catamaran, sans-serif",30,false,"white",CENTER,true,"gray",5,true,"black",3,8).show();
	var bWasd = Button.create("WASDPage","HelpView",10,100,100,40,"WASD").setOnClick(onClick).show();
	bWasd.b = ["A / D", "W", "S", "G", "E"], bWasd.a = actions;
	var bIjkl = Button.create("IJKLPage","HelpView",10,150,100,40,"IJKL").setOnClick(onClick).show();
	bIjkl.b = ["J / L", "I", "K", "'", "O"], bIjkl.a = actions;
	var bMoves = Button.create("MovesPage","HelpView",10,250,100,40,"Moves").setOnClick(onClick).show();
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
		else if (GamePad.ctrlMaps[id]==gpad) this.setOnClick(function() {
			G$("MapperTool").selectedId = id;
			G$("MapperTool").show();
		});
		else {
			this.setOnClick(null);
			this.mode = BUTTON_NO;
		}
	}).show();
	Button.create("MapperSetDefault","MapperView",hudWidth*2/3-100,hudHeight-90,200,40,"Reset to Default").setOnViewShown(function() {
		var id = G$("MapperGPSelect").selectedId;
		if (GamePad.ctrlMaps[id]==gpad) {
			this.setOnClick(null);
			this.mode = BUTTON_NO;
		}
		else this.setOnClick(function() {
			var id = G$("MapperGPSelect").selectedId;
			GamePad.changeMap(id,gpad);
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
function genMapDetails(standardMap,globalMap) {
	if (!standardMap||!standardMap.actions||!standardMap.mappings) return ["none",""];
	var name = ["A","B","Dpad","Up","Down","Left","Right","AnalogL_X","AnalogL_Y","Start","Select","BumperL","BumperR","AnalogR_X","AnalogR_Y"];
	var note = ["(A)","(B)","U","D","L","R","Dpd","AX","AY","Paus","Sel","LB","RB","CX","CY"];
	var results1 = [], results2 = [];
	var targetResult = results1;
	for (var i in name) {
		var mapIndex;
		if ((mapIndex=standardMap.inputs.indexOf(name[i]))!=-1) {
			targetResult.push(note[i] + ": " + standardMap.mappings[mapIndex]);
		}
		else if (globalMap&&(mapIndex=globalMap.inputs.indexOf(name[i]))!=-1) {
			targetResult.push(note[i] + ": " + globalMap.mappings[mapIndex]);
		}
		else targetResult.push(note[i] + ": none");
		if (i==8) targetResult = results2;
	}
	return [results1.join(", "),results2.join(", ")];
}

function buildMapperTool() {
	View.create("MapperTool",2,20,20,hudWidth-40,hudHeight-40,"window");
	Button.create("MapperToolClose","MapperTool",hudWidth-75,25,50,50).setOnClick(function() {
		G$("MapperTool").hide();
		GamePad.buttonListeners = [];
		GamePad.axisListeners = [];
	}).setIcon("GUI-Icons.png",3,0,42,4).setClose(true).show();

	var titles = ["Press A","Press B","Press Start","Press Select","Press Left Bumper","Press Right Bumper",
	"Move Left Stick Left/Right","Move Left Stick Up/Down","Move Right Stick Left/Right","Move Right Up/Down",
	"Press on the DPad","Press Up","Press Down","Press Left","Press Right"];
	TextElement.create("MapperToolText","MapperTool",hudWidth/2,90,"Press A","Catamaran, sans-serif",30,true,"white",CENTER,true,"gray",5,true,"black",3,8).show();
	TextElement.create("MapperToolResult","MapperTool",hudWidth/2,150,"-","Catamaran, sans-serif",30,true,"white",CENTER,true,"gray",5,true,"black",3,8).show();

	Button.create("MapperToolSkip","MapperTool",hudWidth/2-50,hudHeight-65,100,40,"Skip").setOnViewShown(function() {
		var id = G$("MapperTool").selectedId;
		if (!GamePad.controllers[id]) G$("MapperToolClose").onClickFunction();
		this.mode = BUTTON_NO;
		G$("MapperToolResult").text = "-";
		mapperStep(id,0,titles,"button");
	}).show();
}
function mapperStep(gpId,step,titles,type) {
	G$("MapperTool").step = step;
	G$("MapperToolText").text = titles[step];
	console.log(step);
	if (!GamePad.controllers[gpId]) G$("MapperToolClose").onClickFunction();
	else switch(type) {
		case "button":
			GamePad.onNextButtonPress(gpId,function(buttonId,gp) {
				G$("MapperToolResult").text = buttonId;
				var nextStep = G$("MapperTool").step+1;
				if (nextStep < 6) mapperStep(gp.index,nextStep,titles,"button");
				else if (nextStep < 10) mapperStep(gp.index,nextStep,titles,"axis");
				else if (nextStep < titles.length) mapperStep(gp.index,nextStep,titles,"button");
				else {
					G$("MapperToolText").text = "done";
					G$("MapperToolSkip").setOnClick(G$("MapperToolClose").onClickFunction);
				}
			});
			break;
		case "axis":
			GamePad.onNextAxisPress(gpId,function(axisId,gp) {
				G$("MapperToolResult").text = 'a'+axisId;
				var nextStep = G$("MapperTool").step+1;
				if (nextStep < 10) mapperStep(gp.index,nextStep,titles,"axis");
				else mapperStep(gp.index,nextStep,titles,"dpad");
			});
			break;
		case "dpad":
			GamePad.onNextButtonPress(gpId,function(buttonId,gp) {
				GamePad.axisListeners = [];
				G$("MapperToolResult").text = buttonId;
				var nextStep = G$("MapperTool").step+1;
				mapperStep(gp.index,nextStep,titles,"button");
			});
			GamePad.onNextAxisChange(gpId,function(axisId,gp) {
				G$("MapperToolResult").text = 'a'+axisId;
				G$("MapperToolText").text = "done";
				G$("MapperToolSkip").setOnClick(G$("MapperToolClose").onClickFunction);
			});
			break;
	}
}

function buildDevToolsHud() {
  View.create("DevTools",0,hudWidth-70,70,70,210,"tint","lightBlue");
	var setOn = function() {
		this.on = !this.on;
		for (var i in this.view.children) {
			if (this.view.children[i]!=this) this.view.children[i].on = false;
		}
		if (G$("DevPencil").on) Pointer.cursor = "pencil";
		else Pointer.cursor = "crosshair";
	}
	Button.create("DevSpawnPM","DevTools",hudWidth-60,80,50,50).setOnClick(setOn).setIcon("GUI-Icons.png",0,1,42,4).show();
	Button.create("DevPencil","DevTools",hudWidth-60,150,50,50).setOnClick(setOn).setIcon("GUI-Icons.png",1,1,42,4).show();
	Button.create("DevEraser","DevTools",hudWidth-60,220,50,50).setOnClick(function() {
		if (this.on) this.on = false;
		else if (G$("DevSpawnPM").on||G$("DevPencil").on) this.on = true;
		Pointer.cursor = this.on?"eraser":(G$("DevPencil").on?"pencil":"crosshair");
	}).setIcon("GUI-Icons.png",2,1,42,4).show();
}

function buildEditorTools() {
	View.create("EditorToolbar",0,0,0,hudWidth,70,"tint","purple");
	View.create("EditorHud",0,0,0,70,70).show();

	Button.create("ExpandButton","EditorHud",10,10,50,50,">").setToggle(function() {
		G$("EditorToolbar").show();
		G$("ExpandButton").text = "x";
		G$("ExpandButton").toggleState = 1;
	}, function() {
		G$("EditorToolbar").hide();
		G$("ExpandButton").text = ">";
		G$("ExpandButton").toggleState = 0;
	}).show();

	Button.create("BoxTool","EditorToolbar",80,10,50,50).setOnClick(function() {
		this.on = !this.on;
	}).show();
}
