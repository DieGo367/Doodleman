//gui query shorthand
const G$ = function G$(query) {
	let g = G$.all[query];
	if (g) return g;
	else return {hide:function(){}, show:function(){}, on:false}
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
function conditionalUI(condition,uiElemType,elemArgs,...functionCalls) {
	if (condition) {
		let uiClass = Constants.read(uiElemType);
		let resultElem = uiClass.create(...elemArgs);
		for (let i = 0; i < functionCalls.length; i++) {
			let call = functionCalls[i];
			if (call && call.length > 0) {
				let fName = call[0];
				let args = call.slice(1);
				let func = resultElem[fName];
				if (typeof func == "function") resultElem[fName](...args);
				else console.error("Conditional element does not have function named: "+fName);
			}
		}
		return resultElem;
	}
	else {
		return PathNode.create(...elemArgs);
	}
}

function buildSelector(list,onSelect,onCancel) {
	let selectionState = {start: guiStartElement, selected: guiSelectedElement};
	View.create("_Selector_",0,0,WIDTH,HEIGHT,"tint","darkBlue").openOnTop();
	let path = [];
	for (var i in list) {
		let b = Button.create("_Selector_::"+i,"_Selector_",WIDTH/2-150,30+50*i,300,40,list[i]).setOnClick(function() {
			if (typeof onSelect=="function") onSelect(this.name.split("::")[1],this.text);
			this.view.remove();
			guiStartElement = selectionState.start;
			guiSelectedElement = selectionState.selected;
		}).show();
		path.push(b.name);
	}
	Button.create("_SelectorClose_","_Selector_",WIDTH/2-150,HEIGHT-70,300,40,"Cancel").setOnClick(function() {
		if (typeof onCancel=="function") onCancel();
		this.view.remove();
		guiStartElement = selectionState.start;
		guiSelectedElement = selectionState.selected;
	}).setImage("GUI/Button_Red.png").show();
	path.push("_SelectorClose_");
	Button.pathVert(path);
	G$(path[0]).setAsStart();
	if (selectionState.selected) guiSelectedElement = guiStartElement;
}

function attemptUserAction(action,src,caller) {
	if (src==Pointer) {
		action.call((caller||this));
		return true;
	}
	else {
		viewLock = true;
		let uav = View.create("_UAV_",15,15,WIDTH-30,HEIGHT-30,"window");
		TextElement.create("_UAText_","_UAV_",WIDTH/2,HEIGHT/2,fontMenuTitle,"Press any key or click to continue.",WIDTH-30,CENTER).show();
		setTimeout(function() {if (uav) uav.openOnTop();}, 100);
		Staller.useEvent(function() {
			viewLock = false;
			uav.remove();
			uav = null;
			action.call((caller||this));
		});
		return false;
	}
}

function gameConfirm(text,onResponse) {
	let hadSelected = guiSelectedElement;
	View.create("_Confirm_",15,15,WIDTH-30,HEIGHT-30,"window").openOnTop();
	TextElement.create("_ConfirmText_","_Confirm_",WIDTH/2,HEIGHT/2,fontMenuTitle,text,WIDTH-30,CENTER).show();
	Button.create("_ConfirmYes_","_Confirm_",WIDTH/2-105,HEIGHT-150,100,40,"OK!").setOnClick(function() {
		this.view.remove();
		onResponse(true);
	}).show();
	Button.create("_ConfirmNo_","_Confirm_",WIDTH/2+5,HEIGHT-150,100,40,"No").setImage("GUI/Button_Red.png").setOnClick(function() {
		this.view.remove();
		onResponse(false);
	}).show().setAsStart();
	Button.pathHor(["_ConfirmYes_","_ConfirmNo_"]);
	if (hadSelected) guiSelectedElement = guiStartElement;
}
function gameAlert(text,duration) {
	if (typeof duration != "number" || duration <= 0) return;
	let v = G$("_Alert_"), t = G$("_AlertText_");
	if (!v.visible) v = View.create("_Alert_",0,HEIGHT*7/8,WIDTH,HEIGHT/8,"tint","black");
	if (!t.visible) {
		t = TextElement.create("_AlertText_","_Alert_",WIDTH/2,HEIGHT*7/8+30,fontMenuTitle,text,WIDTH,CENTER).show();
		t.update = function() {
			this.time--;
			if (this.time<=0) {
				let v = this.view;
				this.remove();
				v.remove();
			}
		}
	}
	else t.text = text;
	t.time = duration;
	if (!v.layer) v.opensub();
}

function assignCtrlGUI(success,cancel) {
	View.create("_AssignCtrls_",0,0,WIDTH,HEIGHT).open();
	TextElement.create("_AssignCtrlTitle_","_AssignCtrls_",WIDTH/2,30,fontMenuTitle,"Pick Controls",WIDTH,CENTER).show();
	Button.create("_CancelAssignCtrls_","_AssignCtrls_",WIDTH-60,10,50,50).setOnClick(function() {
		this.view.remove();
		if (typeof cancel == "function") cancel();
	}).setIcon("GUI/Icons.png",3,0,42,4).setImage("GUI/Button_Red.png").show();
	let pw = WIDTH/4-20;
	ProgressButton.create("_AssignP1_","_AssignCtrls_",WIDTH/3-pw/2,HEIGHT/2-pw/2,pw,pw,"P1","").setListening(function() {
		let prog = this.picker.getProgress(this);
		let ctrl = this.picker.targetCtrl;
		if (ctrl) this.subText = Ctrl.getDisplayName(ctrl.type,ctrl.id);
		return prog/60;
	}).
	setOnComplete(function() {
		let ap2 = G$("_AssignP2_").setListening(this.listeningFunc);
		ap2.picker = new CtrlPicker([this.picker.targetCtrl]);
		ap2.previous = this;
		ap2.setBackColor("white")
		this.setListening(null);
		this.font = Font.copy(this.font,{color:"white"});
		this.subfont = Font.copy(this.subfont,{color:"white"});
	}).show().picker = new CtrlPicker();
	ProgressButton.create("_AssignP2_","_AssignCtrls_",WIDTH*2/3-pw/2,HEIGHT/2-pw/2,pw,pw,"P2","").setOnComplete(function() {
		G$("_CancelAssignCtrls_").hide();
		this.setListening(null);
		let list = [this.picker.targetCtrl];
		let temp = this;
		while(temp.previous) {
			temp = temp.previous;
			list.unshift(temp.picker.targetCtrl);
		}
		this.font = Font.copy(this.font,{color:"white"});
		this.subfont = Font.copy(this.subfont,{color:"white"});
		Player.clearCtrlAssignments();
		for (var i in list) Player.assignCtrl(i,list[i].type,list[i].id);
		Timer.wait(30,function() {
			this.view.remove();
			if (typeof success == "function") success(list);
		},this);
	}).setFillColor("red","darkGray").show();
}

function makeFSButton(elemName,viewName,x,y) {
	return conditionalUI(!startedInFullScreen,
		"Button", [elemName,viewName,x,y,50,50],
		["setToggle", function() {
			this.on = !this.on;
			setFullScreen(this.on);
		}],
		["setOnViewShown", function() {
			this.on = fullScreen;
		}],
		["setIcon", "GUI/Icons.png",2,0,42,4]
	);
}

//just definining menus and their functions

function buildMainHud() {
	View.create("Hud",0,0,WIDTH,HEIGHT);
	Button.create("PauseButton","Hud",WIDTH-60,10,50,50).setOnClick(function() {
		pauseGame(true);
	}).setIcon("GUI/Icons.png",0,0,42,4).show();
}

function buildPauseMenu() {
	View.create("PauseMenu",0,0,WIDTH,HEIGHT,"tint","black");

	TextElement.create("PauseText","PauseMenu",WIDTH/2,HEIGHT/2,fontPaused,"Paused",WIDTH,CENTER).show();

	Button.create("PauseClose","PauseMenu",WIDTH-60,10,50,50).setOnClick(function() {
		pauseGame(false);
	}).setIcon("GUI/Icons.png",1,0,42,4).show().setAsStart();

	Button.create("QuitGame","PauseMenu",WIDTH/2-150,HEIGHT-60,300,40,"Quit").setOnClick(function(ctrl) {
		gameConfirm("Are you sure you want to quit?",function(response) {
			if (response) {
				pauseGame(false);
				Game.mode = GAME_Previous;
			}
		})
	}).show();

	makeFSButton("FSToggle","PauseMenu",WIDTH-120,10).show();

	Button.create("CtrlSettingsButton","PauseMenu",10,10,50,50,"Controller Settings").setOnClick(function() {
		G$("CtrlSettingsView").open();
	}).setIcon("GUI/Icons.png",3,1,42,4).show();

	Button.create("VolumeButton","PauseMenu",70,10,50,50).setOnClick(function() {
		let vol = G$("VolumeSlider");
		if (vol.isVisible()) vol.hide();
		else vol.show();
	}).setIcon("GUI/Icons.png",0,3,42,4).show();
	Slider.create("VolumeSlider","PauseMenu",130,15,20,40,100).setOnViewShown(function() {
		this.hide();
		this.setValue(Sound.volume);
		G$("VolumeButton").setIcon("GUI/Icons.png",(this.value==0?1:0),3,42,4);
	})
	.setOnSlide(function() {
		Sound.setVolume(this.value);
		G$("VolumeButton").setIcon("GUI/Icons.png",(this.value==0?1:0),3,42,4);
	});

	Button.pathHor(["CtrlSettingsButton","VolumeButton","FSToggle","PauseClose"]);
	Button.funnelTo("QuitGame","down",["CtrlSettingsButton","VolumeButton","FSToggle","PauseClose"]);
}

function buildOnlineMenu() {
	View.create("OnlineMenu",0,0,WIDTH,70,"tint","orange").setOnShow(function() {
		let codeDisplay = G$("OnlineRoomCode");
		codeDisplay.text = Net.room;
		if (Net.isHost()) {
			codeDisplay.maxWidth = WIDTH/2 - 150/2 - 120;
			codeDisplay.x = 120 + codeDisplay.maxWidth/2;
			let locked = Net.isRoomLocked();
			G$("OnlineLock").setIcon("GUI/Icons.png",locked?5:6,0,42,4).show().toggleState = locked?1:0;
			Button.pathHor(["OnlineSettings","OnlineLock","OnlineLeave"]);
			G$("OnlineLeave").text = "Back to Lobby";
		}
		else if (Net.isClient()) {
			codeDisplay.maxWidth = WIDTH/2 - 150/2 - 60;
			codeDisplay.x = 60 + codeDisplay.maxWidth/2;
			G$("OnlineLock").hide();
			Button.pathHor(["OnlineSettings","OnlineLeave"]);
			G$("OnlineLeave").text = "Disconnect";
		}
	});
	Button.create("OnlineSettings","OnlineMenu",10,10,50,50).setOnClick(function() {
		G$("OnlineSettingsMenu").open();
	}).setIcon("GUI/Icons.png",4,0,42,4).show();
	Button.create("OnlineLock","OnlineMenu",70,10,50,50).setToggle(function() {
		this.toggleState = 2;
		Net.roomLock(true,()=>{
			this.setIcon("GUI/Icons.png",5,0,42,4);
			this.toggleState = 1;
		}, failMsg => {
			this.toggleState = 0;
			gameAlert(failMsg,60);
		});
	},
	function() {
		this.toggleState = 2;
		Net.roomLock(false,()=>{
			this.setIcon("GUI/Icons.png",6,0,42,4);
			this.toggleState = 0;
		}, failMsg => {
			this.toggleState = 1;
			gameAlert(failMsg,60);
		});
	},
	function() {}).setOnViewShown(function() {
		if (Net.locked) {
			this.setIcon("GUI/Icons.png",5,0,42,4);
			this.toggleState = 1;
		}
		else {
			this.setIcon("GUI/Icons.png",6,0,42,4);
			this.toggleState = 0;
		}
	});
	TextElement.create("OnlineRoomCode","OnlineMenu",120 + (WIDTH/2 - 150/2 - 120)/2,45,fontHudScore,"...",WIDTH/2-(150/2)-120,CENTER).show();
	Button.create("OnlineLeave","OnlineMenu",WIDTH/2-150/2,10,150,50,"Back to Lobby").setOnClick(function() {
		let leaveMsg = Net.isHost()? "End the game and return to the lobby?" : "Are you sure you want to disconnect?";
		gameConfirm(leaveMsg,function(response) {
			if (response) {
				Player.preventLocalControls = false;
				if (Net.isClient()) Net.leaveRoom();
				Game.mode = GAME_ONLINELOBBY;
			}
		});
	}).show();
	Button.create("OnlineClose","OnlineMenu",WIDTH-60,10,50,50).setOnClick(function() {
		Player.preventLocalControls = false;
		Tap.ctrlEnabled = true;
		this.view.close();
	}).setIcon("GUI/Icons.png",1,0,42,4).show().setAsStart();
	Button.pathHor(["OnlineSettings","OnlineLock","OnlineLeave","OnlineClose","OnlineSettings"]);

	View.create("OnlineSettingsMenu",0,0,WIDTH,70,"tint","orange");
	Button.create("OnlineSettingsClose","OnlineSettingsMenu",10,10,50,50).setOnClick(function() {
		this.view.close();
	}).setImage("GUI/Button_Red.png").setIcon("GUI/Icons.png",3,0,42,4).show().setAsStart();
	Button.create("OnlineSettingsVolumeButton","OnlineSettingsMenu",70,10,50,50).setOnClick(function() {
		let vol = G$("OnlineSettingsVolumeSlider");
		if (vol.isVisible()) vol.hide();
		else vol.show();
	}).setIcon("GUI/Icons.png",0,3,42,4).show();
	Slider.create("OnlineSettingsVolumeSlider","OnlineSettingsMenu",70,75,20,40,100).setOnViewShown(function() {
		this.hide();
		this.setValue(Sound.volume);
		G$("OnlineSettingsVolumeButton").setIcon("GUI/Icons.png",(this.value==0?1:0),3,42,4);
	})
	.setOnSlide(function() {
		Sound.setVolume(this.value);
		G$("OnlineSettingsVolumeButton").setIcon("GUI/Icons.png",(this.value==0?1:0),3,42,4);
	});
	Button.create("OnlineSettingsControls","OnlineSettingsMenu",130,10,50,50).setOnClick(function() {
		G$("CtrlSettingsView").open();
	}).setIcon("GUI/Icons.png",3,1,42,4).show();
	makeFSButton("OnlineSettingsFSToggle","OnlineSettingsMenu",190,10).show();
	Button.pathHor(["OnlineSettingsClose","OnlineSettingsVolumeButton","OnlineSettingsControls","OnlineSettingsFSToggle"]);
}

function buildControllerSettingsMenu() {
	View.create("CtrlSettingsView",0,0,WIDTH,HEIGHT,"tint","black");
	TextElement.create("CtrlSettingsText","CtrlSettingsView",WIDTH/2,30,fontMenuTitle,"Controller Settings",WIDTH,CENTER).show();

	Button.create("CtrlSettingsClose","CtrlSettingsView",WIDTH-60,10,50,50).setOnClick(function() {
		G$("CtrlSettingsView").close();
	}).setIcon("GUI/Icons.png",3,0,42,4).setImage("GUI/Button_Red.png").show();

	Button.create("CtrlDevMode","CtrlSettingsView",WIDTH-15,HEIGHT-15,10,10).setOnClick(function() {
		this.on = devEnabled = !devEnabled;
	}).show();

	Button.create("HelpButton","CtrlSettingsView",WIDTH/2-125,HEIGHT/4,250,40,"Controls and Moves").setOnClick(function() {
		G$("HelpView").open();
	}).show().setAsStart();

	Button.create("CtrlChangeOrder","CtrlSettingsView",WIDTH/2-125,HEIGHT/4+70,250,40,"Change Control Order").setOnClick(function() {
		assignCtrlGUI();
		let assignGui = G$("_AssignCtrls_");
		assignGui.style = "tint";
		assignGui.fill = "black";
	}).
	setOnViewShown(function() {
		if (!multiplayer || online) this.mode = BUTTON_NO;
		else this.mode = BUTTON_NORMAL;
	}).show();

	Button.create("CtrlMapperBttn","CtrlSettingsView",WIDTH/2-125,HEIGHT/4+140,250,40,"Gamepad Mapper").setOnViewShown(function() {
		var ids = GamePad.slotsFilled();
		if (ids.length==0) {
			this.setOnClick(null);
			this.mode = BUTTON_NO;
		}
		else this.setOnClick(function() {
			G$("MapperView").open();
		});
	}).show();

	Button.pathVert(["CtrlSettingsClose","HelpButton","CtrlChangeOrder","CtrlMapperBttn"]);
	Button.funnelTo("CtrlSettingsClose","right",["CtrlChangeOrder","HelpButton","CtrlMapperBttn"]);
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
	},null);
}

function buildHelpPage() {
	View.create("HelpView",0,0,WIDTH,HEIGHT,"tint","black");
	Button.create("HelpClose","HelpView",WIDTH-60,10,50,50).setOnClick(function() {
		G$("WASDPage").onClickFunction();
		G$("HelpView").close();
	}).setIcon("GUI/Icons.png",3,0,42,4).setImage("GUI/Button_Red.png").show();

	var actions = ["Move Left / Right", "Jump", "Crouch", "Attack", "Enter Door / Up"];

	TextElement.create("HelpTitle","HelpView",WIDTH/2,30,fontMenuTitle,"Controls",WIDTH,CENTER).show();
	var bWasd = Button.create("WASDPage","HelpView",10,100,100,40,"WASD").show().setAsStart();
	bWasd.b = ["A / D", "W", "S", "G", "E"], bWasd.a = actions; bWasd.on = true;
	var bIjkl = Button.create("IJKLPage","HelpView",10,150,100,40,"IJKL").show();
	bIjkl.b = ["J / L", "I", "K", "'", "O"], bIjkl.a = actions;
	var bMoves = Button.create("MovesPage","HelpView",10,250,100,40,"Moves").show();
	bMoves.b = ["Lift","Charge","Stab Down","Swipe Up","Air Jab"];
	bMoves.a = ["[Crouch + Attack] on top of object","Hold [Attack] and release","[Crouch + Attack] when in air","[Up + Attack] or [Crouch] on Charge","[Up + Attack] or [Jump + Attack] in air"];
	Button.setRadioGroup(["WASDPage","IJKLPage","MovesPage"],function() {
		buildControlList(this.b,this.a);
	},true);
	Button.pathVert(["HelpClose","WASDPage","IJKLPage","MovesPage"])

	buildControlList(bWasd.b,actions);
}
function buildControlList(buttons,actions) {
	buttons = buttons||[], actions = actions||[];
	for (var i in actions) {
		var te = G$("HelpItem-A::"+i);
		if (te instanceof TextElement) te.text = actions[i];
		else TextElement.create("HelpItem-A::"+i,"HelpView",WIDTH/2-50,100+55*i,fontMenuItem,actions[i],WIDTH/2+50,LEFT,true,"darkOrange",2).show();
	}
	for (var i in buttons) {
		var te = G$("HelpItem-B::"+i);
		if (te instanceof Button) te.text = buttons[i];
		else Button.create("HelpItem-B::"+i,"HelpView",WIDTH/5+5,70+55*i,120,50,buttons[i]).show();
	}
}

function buildMapperView() {
	View.create("MapperView",0,0,WIDTH,HEIGHT,"tint","black");
	// ImgElement.create("MapperImg","MapperView",WIDTH/2,HEIGHT/2,"GUI/Controller.png",640,360).show();
	TextElement.create("MapperTitle","MapperView",WIDTH/2,30,fontMenuTitle,"Gamepad Mapper",WIDTH,CENTER).show();

	Button.create("MapperClose","MapperView",WIDTH-60,10,50,50).setOnClick(function() {
		G$("MapperView").close();
	}).setIcon("GUI/Icons.png",3,0,42,4).setImage("GUI/Button_Red.png").show();

	TextElement.create("MapperSelectText","MapperView",WIDTH/3-5,115,fontMenuItem,"Settings for: ",WIDTH,RIGHT).show();
	Button.create("MapperGPSelect","MapperView",WIDTH/3+5,90,300,40).setOnViewShown(function() {
		var ids = GamePad.slotsFilled();
		if (ids.length==0) G$("MapperClose").onClickFunction();
		else {
			this.selectedId = ids[0];
			this.text = Ctrl.getDisplayName(GAMEPAD,ids[0]);
			updateMapText(ids[0]);
		}
	}).
	setOnClick(function() {
		var ids = GamePad.slotsFilled(), names = [];
		for (var i in ids) names.push(Ctrl.getDisplayName(GAMEPAD,ids[i]));
		buildSelector(names,function(i,item) {
			var b = G$("MapperGPSelect");
			b.text = item;
			b.selectedId = ids[i];
			updateMapText(ids[i]);
		},null);
	}).show().setAsStart();

	TextElement.create("MapperCurrentMapText","MapperView",WIDTH/3-5,165,fontMenuItem,"Current Mapping: ",WIDTH,RIGHT).show();
	TextElement.create("MapperMappingName","MapperView",WIDTH/3+5,165,fontMenuItem,"__",WIDTH,LEFT).show();
	TextElement.create("MapperMappingDetails","MapperView",WIDTH/2,205,fontMenuData,"none",WIDTH-20,CENTER).show();
	TextElement.create("MapperMappingDetails2","MapperView",WIDTH/2,245,fontMenuData,"",WIDTH-20,CENTER).show();

	Button.create("MapperRemap","MapperView",WIDTH/3-100,HEIGHT-90,200,40,"Change Mappings").setOnViewShown(function() {
		var id = G$("MapperGPSelect").selectedId;
		if (!GamePad.controllers[id]) G$("MapperClose").onClickFunction();
		else this.setOnClick(function() {
			let id = G$("MapperGPSelect").selectedId;
			G$("MapperTool").selectedId = id;
			G$("MapperTool").openOnTop();
		});
	}).show();
	Button.create("MapperSetDefault","MapperView",WIDTH*2/3-100,HEIGHT-90,200,40,"Reset to Default").setOnViewShown(function() {
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
	}).show().up("MapperGPSelect");

	Button.pathVert(["MapperClose","MapperGPSelect","MapperRemap"]);
	Button.pathHor(["MapperRemap","MapperSetDefault"]);
}
function updateMapText(id) {
	var map = GamePad.ctrlMaps[id];
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
	View.create("MapperTool",70,70,WIDTH-140,HEIGHT-140,"window");
	Button.create("MapperToolClose","MapperTool",WIDTH-130,80,50,50).setOnClick(function() {
		G$("MapperTool").close();
		GamePad.buttonListeners = [];
		GamePad.axisListeners = [];
	}).setIcon("GUI/Icons.png",3,0,42,4).setImage("GUI/Button_Red.png").show();

	var titles = ["Press Button 0","Press Button 1","Press Start","Press Select","Press Left Bumper","Press Right Bumper",
	"Move Left Stick Left/Right","Move Left Stick Up/Down","Move Right Stick Left/Right","Move Right Up/Down",
	"Press on the DPad","Press Up","Press Down","Press Left","Press Right"];
	TextElement.create("MapperToolText","MapperTool",WIDTH/2,150,fontMenuTitle,"Press A",WIDTH-140,CENTER).show();
	Button.create("MapperToolSkip","MapperTool",WIDTH/2-50,HEIGHT-150,100,40,"Skip").setOnViewShown(function() {
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
	View.create("DevTools",WIDTH-70,70,70,210,"tint","lightBlue");
	Button.create("DevSpawnPM","DevTools",WIDTH-60,80,50,50).setIcon("GUI/Icons.png",2,2,42,4).show();
	Button.create("DevPencil","DevTools",WIDTH-60,150,50,50).setIcon("GUI/Icons.png",1,2,42,4).show();
	Button.setRadioGroup(["DevPencil","DevSpawnPM"],function() {
		if (G$("DevPencil").on) Pointer.cursor = POINTER_PENCIL;
		else Pointer.cursor = POINTER_CROSSHAIR;
		G$("DevEraser").on = false;
	},false);
	Button.create("DevEraser","DevTools",WIDTH-60,220,50,50).setOnClick(function() {
		if (this.on) this.on = false;
		else if (G$("DevSpawnPM").on||G$("DevPencil").on) this.on = true;
		Pointer.cursor = this.on?POINTER_ERASER:(G$("DevPencil").on?POINTER_PENCIL:POINTER_CROSSHAIR);
	}).setIcon("GUI/Icons.png",3,2,42,4).show();
}

function buildLinksMenu() {
	View.create("Links",0,0,WIDTH,HEIGHT);
	TextElement.create("GitHubText","Links",WIDTH/2,50,fontMenuTitle,"This project is on GitHub!",WIDTH,CENTER).show();
	Button.create("GitHub","Links",WIDTH/2-25,80,50,50).setOnClick(function() {
		window.open("https://github.com/DieGo367/Doodleman");
	}).setImage("GUI/Button_Black.png").setIcon("GUI/Icons_Sharing.png",0,0,42,4).show();
	TextElement.create("ShareText","Links",WIDTH/2,HEIGHT/2,fontMenuTitle,"Share this!",WIDTH,CENTER).show();
	Button.create("Twitter","Links",WIDTH/2-55,HEIGHT/2+35,50,50).setOnClick(function() {
		window.open("https://twitter.com/share?text=Play%20Doodleman!&url=https://doodleman.appspot.com");
	}).setIcon("GUI/Icons_Sharing.png",2,0,42,4).show();
	Button.create("Facebook","Links",WIDTH/2+5,HEIGHT/2+35,50,50).setOnClick(function() {
		window.open("https://www.facebook.com/sharer/sharer.php?u=https://doodle-man.appspot.com");
	}).setImage("GUI/Button_Indigo.png").setIcon("GUI/Icons_Sharing.png",1,0,42,4).show();
	Button.create("CloseLinks","Links",WIDTH-60,10,50,50).setOnClick(function() {
		this.view.close();
	}).setIcon("GUI/Icons.png",3,0,42,4).setImage("GUI/Button_Red.png").show();
}
