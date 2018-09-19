//gui query shorthand
const G$ = function G$(query) {
	let g = G$.all[query];
	if (g) return g;
	else return {hide:function(){}, show:function(){}, on:function(){return false;}}
}
G$.all = {};
G$.store = function(name,elem) { this.all[name] = elem; };
G$.delete = function(name) { delete this.all[name]; };
G$.hide = function(q) { return this(q).hide(); };
G$.show = function(q) { return this(q).show(); };
G$.on = function(q) {
	var g = this(q);
	if (g instanceof GuiElement) {
		return g.on;
	}
};

//useful game functions
function buildSelector(list,onSelect,onCancel,viewLayer) {
	View.create("_Selector_",viewLayer===void(0)?1:viewLayer,0,0,hudWidth,hudHeight,"tint","darkBlue").show();
	for (var i in list) {
		Button.create("_Selector_::"+i,"_Selector_",hudWidth/2-150,30+50*i,300,40,list[i]).setOnClick(function() {
			if (typeof onSelect=="function") onSelect(this.name.split("::")[1],this.text);
			G$("_SelectorClose_").onClickFunction();
		}).show();
	}
	Button.create("_SelectorClose_","_Selector_",hudWidth/2-150,hudHeight-70,300,40,"Cancel").setOnClick(function() {
		if (typeof onCancel=="function") onCancel();
		let view = G$("_Selector_");
		for (var i in view.children) view.children[i].remove();
		view.hide().remove();
	}).setClose(true).show();
}

function attemptUserAction(action,src) {
	if (src==Pointer) {
		action(src);
		return true;
	}
	else {
		viewLock = true;
		pauseGame(true);
		let uav = View.create("_UAV_",Pointer.focusLayer+1,15,15,hudWidth-30,hudHeight-30,"window");
		uav.action = action;
		TextElement.create("_UAText_","_UAV_",hudWidth/2,hudHeight/2,"Press any key or click the screen to continue.","Fredoka One",30,true,"white",CENTER,true,"gray",5,true,"black",3,8).show();
		uav.show();
		return false;
	}
}
function clearViewLock() {
	viewLock = false;
	let uav = G$("_UAV_");
	uav.action();
	uav.children[0].remove();
	uav.hide().remove();
}

function gameConfirm(text,onResponse) {
	let a = View.create("_Confirm_",Pointer.focusLayer+1,15,15,hudWidth-30,hudHeight-30,"window");
	TextElement.create("_ConfirmText_","_Confirm_",hudWidth/2,hudHeight/2,text,"Fredoka One",30,true,"white",CENTER,true,"gray",5,true,"black",3,8).show();
	let close = function() {
		for (var i in a.children) a.children[i].remove();
		a.hide().remove();
	}
	Button.create("_ConfirmYes_","_Confirm_",hudWidth/2-105,hudHeight-150,100,40,"OK!").setOnClick(function() {
		close();
		onResponse(true);
	}).show();
	Button.create("_ConfirmNo_","_Confirm_",hudWidth/2+5,hudHeight-150,100,40,"No").setClose(true).setOnClick(function() {
		close();
		onResponse(false);
	}).show();
	a.show();
}
function gameAlert(text,duration) {
	if (typeof duration != "number" || duration <= 0) return;
	let v = G$("_Alert_"), t = G$("_AlertText_");
	if (!v.visible) v = View.create("_Alert_",Pointer.focusLayer+1,0,hudHeight*7/8,hudWidth,hudHeight/8,"tint","black");
	if (!t.visible) {
		t = TextElement.create("_AlertText_","_Alert_",hudWidth/2,hudHeight*7/8+30,text,"Fredoka One",30,true,"white",CENTER,true,"gray",5,true,"black",3,8).show();
		t.update = function() {
			this.time--;
			if (this.time<=0) {
				let v = this.view;
				this.remove();
				v.hide().remove();
			}
		}
	}
	else t.text = text;
	t.time = duration;
	v.show();
}

//just definining menus and their functions

function buildTitleScreen() {
	View.create("Title",0,0,0,hudWidth,hudHeight);
	TextElement.create("TitleLogo","Title",hudWidth/2,hudHeight*11/36,"Doodleman","Gochi Hand",100,false,"black",CENTER,false,null,null,true,"white",5,9,hudWidth).show();
	TextElement.create("TitleYear","Title",10,hudHeight-10,"\u00A92018 DieGo","Gochi Hand",20,false,"black",LEFT,false,null,null,true,"white",5,9,hudWidth).show();

	Button.create("TitleMode:Survival","Title",hudWidth/2-100,hudHeight/2-30,200,60,"Survival").setOnClick(function() {
		this.view.hide();
		Game.mode = GAME_SURVIVAL;
	}).show();
	Button.create("TitleMode:Sandbox","Title",hudWidth/2-100,hudHeight/2+50,200,60,"Sandbox").setOnClick(function() {
		this.view.hide();
		Game.mode = GAME_SANDBOX;
	}).show();
}

function buildMainHud() {
  View.create("Hud",0,0,0,hudWidth,hudHeight);
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

	TextElement.create("PauseText","PauseMenu",hudWidth/2,hudHeight/2,"Paused","Fredoka One",60,true,"yellow",CENTER,true,"darkOrange",5,true,"orange",3,8).show();
	TextElement.create("PauseFocusMsg","PauseMenu",hudWidth/2,hudHeight/2+55,"Click to focus","Fredoka One",30,false,"#ff6f6b",CENTER,false,"#ad2f2b",3,true,"#ad2f2b",3,8);

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

	Button.create("QuitGame","PauseMenu",hudWidth-150,hudHeight-60,130,40,"Quit to Title").setOnClick(function(ctrl) {
		gameConfirm("Are you sure you want to quit?",function(response) {
			if (response) {
				pauseGame(false);
				Game.mode = GAME_TITLE;
			}
		})
	}).show();

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

  // TextElement.create("UserInfo","PauseMenu",hudWidth/2,hudHeight-30,"Logged in as "+User.name,"Fredoka One",15,false,"white",CENTER)//.show();
	// Button.create("LoginoutButton","PauseMenu",hudWidth/2-50,hudHeight-20,100,15,User.loggedIn?"Logout":"Login").setOnClick(function() {
	// 	User.useLink();
	// })//.show();
}

function buildLevelSelectMenu() {
  View.create("LevelSelectView",1,0,0,hudWidth,hudHeight,"tint","black");

  TextElement.create("LSText","LevelSelectView",hudWidth/2,30,"Select a level","Fredoka One",30,false,"white",CENTER,true,"gray",5,true,"black",3,8).show();

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
				Level.loadLevel(this.text+".json");
			}).show();
		}
	});

	Button.create("LSFileButton","LevelSelectView",hudWidth-170,hudHeight-60,150,40,"Load From File").setOnClick(Level.openLocalFile,true).show().setPressDelay(1);
}

function buildControllerSettingsMenu() {
  View.create("CtrlSettingsView",1,0,0,hudWidth,hudHeight,"tint","black");
	TextElement.create("CtrlSettingsText","CtrlSettingsView",hudWidth/2,30,"Controller Settings","Fredoka One",30,false,"white",CENTER,true,"gray",5,true,"black",3,8).show();

  Button.create("CtrlSettingsClose","CtrlSettingsView",hudWidth-60,10,50,50).setOnClick(function() {
		G$("CtrlSettingsView").hide();
		G$("PauseMenu").show();
	}).setIcon("GUI-Icons.png",3,0,42,4).setClose(true).show();

  TextElement.create("CtrlP1","CtrlSettingsView",hudWidth/2-135,100,"Player 1","Fredoka One",20,false,"yellow",CENTER,true,"darkOrange",2,false).show();
	TextElement.create("CtrlP2","CtrlSettingsView",hudWidth/2+135,100,"Player 2","Fredoka One",20,false,"yellow",CENTER,true,"darkOrange",2,false).show();

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

	TextElement.create("HelpTitle","HelpView",hudWidth/2,30,"Controls","Fredoka One",30,false,"white",CENTER,true,"gray",5,true,"black",3,8).show();
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
		else TextElement.create("HelpItem-A::"+i,"HelpView",hudWidth/2-50,100+55*i,actions[i],"Fredoka One",20,false,"yellow",LEFT,true,"darkOrange",2).show();
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
	TextElement.create("MapperTitle","MapperView",hudWidth/2,30,"Gamepad Mapper","Fredoka One",30,false,"white",CENTER,true,"gray",5,true,"black",3,8).show();

	Button.create("MapperClose","MapperView",hudWidth-60,10,50,50).setOnClick(function() {
		G$("MapperView").hide();
		G$("CtrlSettingsView").show();
	}).setIcon("GUI-Icons.png",3,0,42,4).setClose(true).show();

	TextElement.create("MapperSelectText","MapperView",hudWidth/3-5,115,"Settings for: ","Fredoka One",20,false,"yellow",RIGHT,true,"darkOrange",2).show();
	Button.create("MapperGPSelect","MapperView",hudWidth/3+5,90,300,40).setOnViewShown(function() {
		var ids = GamePad.slotsFilled();
		if (ids.length==0) G$("MapperClose").onClickFunction();
		else {
			this.selectedId = ids[0];
			this.text = GamePad.controllers[ids[0]].name;
			updateMapText(ids[0]);
		}
	}).
	setOnClick(function() {
		var ids = GamePad.slotsFilled(), names = [];
		for (var i in ids) names.push(GamePad.controllers[ids[i]].name);
		buildSelector(names,function(i,item) {
			var b = G$("MapperGPSelect");
			b.text = item;
			b.selectedId = ids[i];
			updateMapText(ids[i]);
		},null,2);
	}).show();

	TextElement.create("MapperCurrentMapText","MapperView",hudWidth/3-5,165,"Current Mapping: ","Fredoka One",20,false,"yellow",RIGHT,true,"darkOrange",2).show();
	TextElement.create("MapperMappingName","MapperView",hudWidth/3+5,165,"__","Fredoka One",20,false,"yellow",LEFT,true,"darkOrange",2).show();
	TextElement.create("MapperMappingDetails","MapperView",hudWidth/2,205,"none","Fredoka One",20,false,"lime",CENTER,true,"darkGreen",2,null,null,null,null,hudWidth-20).show();
	TextElement.create("MapperMappingDetails2","MapperView",hudWidth/2,245,"","Fredoka One",20,false,"lime",CENTER,true,"darkGreen",2,null,null,null,null,hudWidth-20).show();

	Button.create("MapperRemap","MapperView",hudWidth/3-100,hudHeight-90,200,40,"Change Mappings").setOnViewShown(function() {
		var id = G$("MapperGPSelect").selectedId;
		if (!GamePad.controllers[id]) G$("MapperClose").onClickFunction();
		else this.setOnClick(function() {
			let id = G$("MapperGPSelect").selectedId;
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
	TextElement.create("MapperToolText","MapperTool",hudWidth/2,150,"Press A","Fredoka One",30,true,"white",CENTER,true,"gray",5,true,"black",3,8).show();
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
			updateMapText(gpId);
		}).text = "Done";
		let c = new CtrlMap("custom-"+GamePad.customMaps.length,GAMEPAD,dmInputs,mappings,dmActions,gpadGroupings);
		GamePad.customMaps.push(c);
		GamePad.changeMap(gpId,c);
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
	View.create("EditorHud",0,0,0,hudWidth,70).show();
	TextElement.create("EditorModeText","EditorHud",70,40,"Mode","Fredoka One",20,false,"fuchsia",LEFT,true,"purple",2);

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
	TextElement.create("LS:Title","LevelSettingsView",hudWidth/2,30,"Level Properties","Fredoka One",30,false,"white",CENTER,true,"gray",5,true,"black",3,8).show();

	Button.create("FSToggle","LevelSettingsView",hudWidth-130,10,50,50).setToggle(function() {
		callPrefixedFunction(canvas,"requestFullscreen");
		callPrefixedFunction(canvas,"requestFullScreen");
	},
	function() {
		callPrefixedFunction(document,"exitFullscreen");
		callPrefixedFunction(document,"exitFullScreen");
	},true).setIcon("GUI-Icons.png",2,0,42,4).show();
	Button.create("LS:LoadLevel","LevelSettingsView",10,10,150,40,"Load From File").setOnClick(Level.openLocalFile,true).show().setPressDelay(1);

	TextElement.create("LS:Dimensions","LevelSettingsView",hudWidth/4-150,100+55*0,"Dimensions","Fredoka One",20,false,"yellow",LEFT,true,"darkOrange",2).show();
	TextInput.create("LS:Dimensions:width","LevelSettingsView",hudWidth/2-175,75,100,40,"number",Level.level.width,"width","Enter a width").setOnInputChange(function(val) {
		Level.level.width = val;
	}).show();
	TextInput.create("LS:Dimensions:height","LevelSettingsView",hudWidth/2-70,75,100,40,"number",Level.level.height,"height","Enter a height").setOnInputChange(function(val) {
		Level.level.height = val;
	}).show();

	TextElement.create("LS:CamStart","LevelSettingsView",hudWidth/4-150,155,"Camera Start","Fredoka One",20,false,"yellow",LEFT,true,"darkOrange",2).show();
	TextInput.create("LS:CamStart:x","LevelSettingsView",hudWidth/2-175,130,100,40,"number",Level.level.camStart.x,"x","Enter starting x point").setOnInputChange(function(val) {
		Level.level.camStart.x = val;
	}).show();
	TextInput.create("LS:CamStart:y","LevelSettingsView",hudWidth/2-70,130,100,40,"number",Level.level.camStart.y,"y","Enter starting y point").setOnInputChange(function(val) {
		Level.level.camStart.y = val;
	}).show();

	TextElement.create("LS:ScrollBuffer","LevelSettingsView",hudWidth/4-150,210,"Scroll Buffer","Fredoka One",20,false,"yellow",LEFT,true,"darkOrange",2).show();
	TextInput.create("LS:ScrollBuffer:hor","LevelSettingsView",hudWidth/2-175,185,100,40,"number",Level.level.horScrollBuffer,"horizontal","Enter horizontal scroll buffer").setOnInputChange(function(val) {
		Level.level.horScrollBuffer = val;
	}).show();
	TextInput.create("LS:ScrollBuffer:vert","LevelSettingsView",hudWidth/2-70,185,100,40,"number",Level.level.vertScrollBuffer,"vertical","Enter vertical scroll buffer").setOnInputChange(function(val) {
		Level.level.vertScrollBuffer = val;
	}).show();

	TextElement.create("LS:ZoomLimit","LevelSettingsView",hudWidth/4-150,265,"Zoom Limits","Fredoka One",20,false,"yellow",LEFT,true,"darkOrange",2).show();
	TextInput.create("LS:ZoomLimit:min","LevelSettingsView",hudWidth/2-175,240,100,40,"number",Level.level.minZoom,"min","Enter minimum zoom level").setOnInputChange(function(val) {
		Level.level.minZoom = val;
	}).show();
	TextInput.create("LS:ZoomLimit:max","LevelSettingsView",hudWidth/2-70,240,100,40,"number",Level.level.maxZoom,"max","Enter maximum zoom level").setOnInputChange(function(val) {
		Level.level.maxZoom = val;
	}).show();

	TextElement.create("LS:Edge","LevelSettingsView",hudWidth/4-150,320,"Edge Behavior","Fredoka One",20,false,"yellow",LEFT,true,"darkOrange",2).show();
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

	TextElement.create("LS:ZoomScale","LevelSettingsView",hudWidth*2/3-50,100,"Zoom Scale","Fredoka One",20,false,"yellow",LEFT,true,"darkOrange",2).show();
	TextInput.create("LS:ZoomScale:num","LevelSettingsView",hudWidth/2+190,75,100,40,"number",Level.level.zoomScale,"zoom scale","Enter preferred zoom level").setOnInputChange(function(val) {
		Level.level.zoomScale = val;
	}).show();

	TextElement.create("LS:BGScale","LevelSettingsView",hudWidth*2/3-50,155,"BG Scale","Fredoka One",20,false,"yellow",LEFT,true,"darkOrange",2).show();
	TextInput.create("LS:BGScale:num","LevelSettingsView",hudWidth/2+190,130,100,40,"number",Level.level.bgScale,"bg scale","Enter the background scale").setOnInputChange(function(val) {
		Level.level.bgScale = val;
	}).show();
}
