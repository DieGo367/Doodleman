const GAME_EDITOR = GameManager.addMode(new GameMode({
	start: function() {
		devEnabled = true;
		Tap.ctrlEnabled = false;
		Pointer.cursor = POINTER_NORMAL;
		this.addGui();
		EditorTools.setup();
		GameManager.overrideTick(this.tick);
	},
	quit: function() {
		devEnabled = false;
		Tap.ctrlEnabled = true;
		Pointer.cursor = POINTER_NORMAL;
		this.removeGui();
		EditorTools.enabled = false;
		EditorTools.tool("Actor").removeSpawnGhosts();
		GameManager.overrideTick(false);
	},
	tick: function() {
		if (!focused) return;
		Timer.update();
		window.requestAnimationFrame(drawGame);
		doGlobalControls(globalKeyboard);
		GameManager.getMode().doControls(globalKeyboard);
		GuiElement.callForAll("update");
		Particle.callForAll("update");
	},
	onLevelLoad: function() {
		G$("LevelSettingsClose").onClickFunction();
		EditorTools.tool("Actor").removeSpawnGhosts();
		EditorTools.tool("Actor").initSpawnGhosts();
		EditorTools.eid = 0;
	},
	onPause: function() {
		if (!G$("LevelSettingsView").visible) {
			if (View.focus<2) {
				if (G$("EditPropView").visible) G$("EditPropBttn").onClick(null,true);
				if (G$("EditorToolbar").visible) G$("ExpandButton").onClick(null,true);
				G$("LevelSettingsBttn").onClick(null,true);
			}
		}
		else {
			if (View.focus<3) G$("LevelSettingsClose").onClick(null,true);
		}
		return CANCEL;
	},
	onPointerMove: function(x,y) {
		if (G$(EditorTools.getToolName()+"Tool").on && !globalKeyboard.pressed("Ctrl")) {
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
	doControls: function(ctrl) {
		if (!ctrl.type==KEYBOARD||viewLock||View.focus>1||Pointer.downPoint) return;
		for (var i in EditorTools.tools) if (!ctrl.pressed("Ctrl")&&ctrl.ready(EditorTools.tools[i].name+"Tool")) {
			G$(EditorTools.tools[i].name+"Tool").onClick(ctrl,true);
			ctrl.use(EditorTools.tools[i].name+"Tool");
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
				if (ctrl.pressed("Shift")) EditorTools.redoAction();
				else EditorTools.undoAction();
				ctrl.use("z");
			}
		}
		if (ctrl.ready("fullScreen")) {
			G$("FSToggle").onClick(ctrl,true);
			ctrl.use("fullScreen");
		}
	},
	addGui: function() {
		const defaultPattern = /[A-Z0-9a-z\-_#. ]+/;
		const filenamePattern = /[^\\/:*"<>|]+/;
		const numPattern = /[0-9\-.]+/;

		View.create("EditorToolbar",0,0,WIDTH,70,"tint","purple");
		View.create("EditorHud",0,0,WIDTH,70).open();
		TextElement.create("EditorModeText","EditorHud",70,40,fontMenuEdit,"",WIDTH,LEFT).show();

		View.create("ExpandButtonView",0,0,70,70).opensub();
		Button.create("ExpandButton","ExpandButtonView",10,10,50,50).setToggle(function() {
			G$("EditorToolbar").opensub();
			this.view.subMoveToTop();
			G$("EditorHud").hide();
			this.setIcon("GUI/Icons.png",3,0,42,4);
			this.toggleState = 1;
		},
		function(ctrl) {
			let p = G$("EditPropBttn");
			if (p.on) p.callToggleState(1);
			G$("EditorToolbar").closesub();
			G$("EditorHud").show();
			this.setIcon("GUI/Icons.png",0,1,42,4);
			this.toggleState = 0;
		}).setIcon("GUI/Icons.png",0,1,42,4).show();

		Button.create("BoxTool","EditorToolbar",80,10,50,50).setIcon("GUI/Icons.png",0,2,42,4).show();
		Button.create("LineTool","EditorToolbar",150,10,50,50).setIcon("GUI/Icons.png",1,2,42,4).show();
		Button.create("ActorTool","EditorToolbar",220,10,50,50).setIcon("GUI/Icons.png",2,2,42,4).show();

		Button.create("MoveTool","EditorToolbar",WIDTH-270,10,50,50).setIcon("GUI/Icons.png",3,3,42,4).show();
		Button.create("SelectTool","EditorToolbar",WIDTH-200,10,50,50).setIcon("GUI/Icons.png",2,3,42,4).show();
		Button.create("EraserTool","EditorToolbar",WIDTH-130,10,50,50).setIcon("GUI/Icons.png",3,2,42,4).show();
		Button.setRadioGroup(["BoxTool","LineTool","ActorTool", "MoveTool","SelectTool","EraserTool"],function() {
			EditorTools.toolOn = this.on;
			EditorTools.setTool(this.radioGroupIndex);
			G$("EditPropView").onShow();
		},false);

		Button.create("EditPropBttn","EditorToolbar",WIDTH-60,10,50,50).setToggle(function() {
			G$("EditPropView").opensub();
			this.on = true;
			this.toggleState = 1;
		},
		function() {
			G$("EditPropView").closesub();
			this.on = false;
			this.toggleState = 0;
		}).setIcon("GUI/Icons.png",2,1,42,4).show();

		View.create("EditPropView",0,70,WIDTH,60,"tint","green").setOnShow(function() {
			this.removeAllChildren();
			let props = EditorTools.getToolPropertyNames();
			for (var i = 0; i < props.length; i++) {
				//make the input
				let x = 10+105*(i%6), y = 80+45*Math.floor(i/6);
				let prop = TypeAnnotation.interpret(props[i]);
				input = TextInput.create("EditProp:"+i,this.name,x,y,99,40,prop,EditorTools.getToolProperty(prop.dataName,prop,i),"Enter a value for "+prop.dataName,prop.is("number")?numPattern:defaultPattern).setOnInputChange(function(value) {
					EditorTools.setToolProperty(this.text,value,parseInt(this.name.split(":")[1]));
					if (EditorTools.rebuildRequired) {
						G$("EditPropView").onShow();
						EditorTools.rebuildRequired = false;
					}
				}).show();
				this.height = input.y-20;
			}
		});

		Button.create("LevelSettingsBttn","EditorHud",WIDTH-60,10,50,50).setOnClick(function() {
			G$("LevelSettingsView").open();
		}).setIcon("GUI/Icons.png",1,1,42,4).show();

		View.create("LevelSettingsView",0,0,WIDTH,HEIGHT,"tint","purple");
		Button.create("LevelSettingsClose","LevelSettingsView",WIDTH-60,10,50,50).setOnClick(function() {
			G$(this.view.activeMenu).hide();
			G$("LevelSettingsView").close();
		}).
		setOnViewShown(function() {
			if (!this.view.activeMenu) this.view.activeMenu = "LS:File:Menu";
			G$(this.view.activeMenu).opensub();
			G$("LS:Dimensions:width").store(Level.level.width);
			G$("LS:Dimensions:height").store(Level.level.height);
			G$("LS:CamStart:x").store(Level.level.camStart.x);
			G$("LS:CamStart:y").store(Level.level.camStart.y);
			G$("LS:ScrollBuffer:hor").store(Level.level.horScrollBuffer);
			G$("LS:ScrollBuffer:vert").store(Level.level.vertScrollBuffer);
			G$("LS:ZoomLimit:min").store(Level.level.minZoom);
			G$("LS:ZoomLimit:max").store(Level.level.maxZoom);
			G$("LS:ZoomScale:num").store(Level.level.zoomScale);
			G$("LS:Edge:top").store(Constants.getKey(Level.level.edge.top));
			G$("LS:Edge:bottom").store(Constants.getKey(Level.level.edge.bottom));
			G$("LS:Edge:left").store(Constants.getKey(Level.level.edge.left));
			G$("LS:Edge:right").store(Constants.getKey(Level.level.edge.right));
			G$("LS:File:Name:input").store(Level.level.name);
		}).setIcon("GUI/Icons.png",3,0,42,4).setImage("GUI/Button_Red.png").show();
		TextElement.create("LS:Title","LevelSettingsView",WIDTH/2,30,fontMenuTitle,"Level Properties",WIDTH,CENTER).show();

		makeFSButton("FSToggle","LevelSettingsView",WIDTH-130,10).show();
		Button.pathHor(["FSToggle","LevelSettingsClose"]);

		Button.create("LS:File","LevelSettingsView",WIDTH*1/5-50,75,100,40,"File").down("LS:File:Name:input").setAsStart().show().on = true;
		Button.create("LS:Edit","LevelSettingsView",WIDTH*2/5-50,75,100,40,"Edit").down("LS:Dimensions:width").show();
		Button.create("LS:Cam","LevelSettingsView",WIDTH*3/5-50,75,100,40,"Camera").down("LS:CamStart:x").show();
		Button.create("LS:BG","LevelSettingsView",WIDTH*4/5-50,75,100,40,"BG").down("LS:BG:NewLayer").show();
		Button.setRadioGroup(["LS:File","LS:Edit","LS:Cam","LS:BG"],function() {
			G$(this.view.activeMenu).closesub();
			this.view.activeMenu = this.name+":Menu";
			G$(this.view.activeMenu).opensub();
		},true);
		Button.pathHor(["LS:File","LS:Edit","LS:Cam","LS:BG"]);

		PathNode.tieVert("LevelSettingsView",["FSToggle","LevelSettingsClose"],["LS:File","LS:Edit","LS:Cam","LS:BG"]);

		View.create("LS:File:Menu",0,0,WIDTH,HEIGHT);
		TextElement.create("LS:File:Name","LS:File:Menu",WIDTH/4-150,155,fontMenuItem,"Level Name",WIDTH,LEFT).show();
		TextInput.create("LS:File:Name:input","LS:File:Menu",WIDTH/2-175,130,205,40,"name",Level.level.name,"Enter the level name",filenamePattern).setOnInputChange(function(val) {
			Level.level.name = val;
		}).show();
		Button.create("LS:File:Load","LS:File:Menu",WIDTH*2/3-50,130,205,40,"Load From File").setOnClick(Level.openLocalFile,true).show().setPressDelay(1);
		TextElement.create("LS:File:Save","LS:File:Menu",WIDTH/4-150,210,fontMenuItem,"Save Level",WIDTH,LEFT).show();
		Button.create("LS:File:Copy","LS:File:Menu",WIDTH/2-175,185,205,40,"Copy to Clipboard").setOnClick(Level.copy,true).show();
		Button.create("LS:File:Export","LS:File:Menu",WIDTH*2/3-50,185,205,40,"Export Level").setOnClick(Level.export,true).show();
		TextElement.create("LS:File:Test","LS:File:Menu",WIDTH/4-150,265,fontMenuItem,"Test Level",WIDTH,LEFT).show();
		TextInput.create("LS:File:Test:Mode","LS:File:Menu",WIDTH/2-175,240,100,40,"@Mode:GAME_SURVIVAL,GAME_SANDBOX","GAME_SANDBOX").show();
		Button.create("LS:File:Test:MP","LS:File:Menu",WIDTH/2-70,240,100,40,"Singleplayer").setOnClick(function() {
			this.on = !this.on;
			this.text = this.on? "Multiplayer": "Singleplayer";
		}).up("LS:File:Copy").show();
		Button.create("LS:File:Test:Button","LS:File:Menu",WIDTH*2/3-50,240,205,40,"Test Level").setOnClick(function() {
			multiplayer = G$("LS:File:Test:MP").on;
			EditorTools.testLevel(G$("LS:File:Test:Mode").val());
		}).show();
		Button.funnelTo("LS:File","up",["LS:File:Name:input","LS:File:Load"]);
		Button.pathGrid([
			["LS:File:Name:input","LS:File:Load"],
			["LS:File:Copy","LS:File:Export"],
			["LS:File:Test:Mode","LS:File:Test:Button"]
		]);
		Button.pathHor(["LS:File:Test:Mode","LS:File:Test:MP","LS:File:Test:Button"]);

		View.create("LS:Edit:Menu",0,0,WIDTH,HEIGHT);
		TextElement.create("LS:Dimensions","LS:Edit:Menu",WIDTH/4-150,155+55*0,fontMenuItem,"Dimensions",WIDTH,LEFT).show();
		TextInput.create("LS:Dimensions:width","LS:Edit:Menu",WIDTH/2-175,130,100,40,"#width",Level.level.width,"Enter a width",numPattern).setOnInputChange(function(val) {
			Level.level.width = val;
		}).show();
		TextInput.create("LS:Dimensions:height","LS:Edit:Menu",WIDTH/2-70,130,100,40,"#height",Level.level.height,"Enter a height",numPattern).setOnInputChange(function(val) {
			Level.level.height = val;
		}).show();
		TextElement.create("LS:Edge","LS:Edit:Menu",WIDTH/4-150,210,fontMenuItem,"Edge Types",WIDTH,LEFT).show();
		TextInput.create("LS:Edge:top","LS:Edit:Menu",WIDTH/2-175,185,100,40,"@top:EDGE_NONE,EDGE_SOLID,EDGE_WRAP,EDGE_KILL","EDGE_NONE","Enter top edge behavior").setOnInputChange(function(val) {
			Level.level.edge.top = val;
		}).show();
		TextInput.create("LS:Edge:bottom","LS:Edit:Menu",WIDTH/2-70,185,100,40,"@bottom:EDGE_NONE,EDGE_SOLID,EDGE_WRAP,EDGE_KILL","EDGE_SOLID","bottom","Enter bottom edge behavior").setOnInputChange(function(val) {
			Level.level.edge.bottom = val;
		}).show();
		TextInput.create("LS:Edge:left","LS:Edit:Menu",WIDTH/2+35,185,100,40,"@left:EDGE_NONE,EDGE_SOLID,EDGE_WRAP,EDGE_KILL","EDGE_WRAP","Enter left edge behavior").setOnInputChange(function(val) {
			Level.level.edge.left = val;
		}).show();
		TextInput.create("LS:Edge:right","LS:Edit:Menu",WIDTH/2+140,185,100,40,"@right:EDGE_NONE,EDGE_SOLID,EDGE_WRAP,EDGE_KILL","EDGE_WRAP","Enter right edge behavior").setOnInputChange(function(val) {
			Level.level.edge.right = val;
		}).show();
		Button.funnelTo("LS:Edit","up",["LS:Dimensions:width","LS:Dimensions:height"]);
		Button.pathGrid([
			["LS:Dimensions:width","LS:Dimensions:height"],
			["LS:Edge:top","LS:Edge:bottom"]
		]);
		Button.pathHor(["LS:Edge:bottom","LS:Edge:left","LS:Edge:right"]);

		View.create("LS:Cam:Menu",0,0,WIDTH,HEIGHT);
		TextElement.create("LS:CamStart","LS:Cam:Menu",WIDTH/4-150,155,fontMenuItem,"Camera Start",WIDTH,LEFT).show();
		TextInput.create("LS:CamStart:x","LS:Cam:Menu",WIDTH/2-175,130,100,40,"#x",Level.level.camStart.x,"Enter starting x point",numPattern).setOnInputChange(function(val) {
			Level.level.camStart.x = val;
		}).show();
		TextInput.create("LS:CamStart:y","LS:Cam:Menu",WIDTH/2-70,130,100,40,"#y",Level.level.camStart.y,"Enter starting y point",numPattern).setOnInputChange(function(val) {
			Level.level.camStart.y = val;
		}).show().right("LS:ZoomScale:num");
		TextElement.create("LS:ScrollBuffer","LS:Cam:Menu",WIDTH/4-150,210,fontMenuItem,"Scroll Buffer",WIDTH,LEFT).show();
		TextInput.create("LS:ScrollBuffer:hor","LS:Cam:Menu",WIDTH/2-175,185,100,40,"#horizontal",Level.level.horScrollBuffer,"Enter horizontal scroll buffer",numPattern).setOnInputChange(function(val) {
			Level.level.horScrollBuffer = val;
		}).show();
		TextInput.create("LS:ScrollBuffer:vert","LS:Cam:Menu",WIDTH/2-70,185,100,40,"#vertical",Level.level.vertScrollBuffer,"Enter vertical scroll buffer",numPattern).setOnInputChange(function(val) {
			Level.level.vertScrollBuffer = val;
		}).show();
		TextElement.create("LS:ZoomLimit","LS:Cam:Menu",WIDTH/4-150,265,fontMenuItem,"Zoom Limits",WIDTH,LEFT).show();
		TextInput.create("LS:ZoomLimit:min","LS:Cam:Menu",WIDTH/2-175,240,100,40,"#min",Level.level.minZoom,"Enter minimum zoom level",numPattern).setOnInputChange(function(val) {
			Level.level.minZoom = val;
		}).show();
		TextInput.create("LS:ZoomLimit:max","LS:Cam:Menu",WIDTH/2-70,240,100,40,"#max",Level.level.maxZoom,"Enter maximum zoom level",numPattern).setOnInputChange(function(val) {
			Level.level.maxZoom = val;
		}).show();
		TextElement.create("LS:ZoomScale","LS:Cam:Menu",WIDTH*2/3-50,155,fontMenuItem,"Zoom Scale",WIDTH,LEFT).show();
		TextInput.create("LS:ZoomScale:num","LS:Cam:Menu",WIDTH/2+190,130,100,40,"#zoom scale",Level.level.zoomScale,"Enter preferred zoom level",numPattern).setOnInputChange(function(val) {
			Level.level.zoomScale = val;
		}).show();
		Button.funnelTo("LS:Cam","up",["LS:CamStart:x","LS:CamStart:y","LS:ZoomScale:num"])
		Button.pathGrid([
			["LS:CamStart:x","LS:CamStart:y"],
			["LS:ScrollBuffer:hor","LS:ScrollBuffer:vert"],
			["LS:ZoomLimit:min","LS:ZoomLimit:max"]
		]);


		let loadBGLayerPage = function(page) {
			let names = [[],[]];
			for (let i = page*10; i < (page+1)*10; i++) {
				let inPage = i%10;
				let inRow = Math.floor(inPage/5);
				let inCol = inPage%5;
				
				let button = G$("LS:BG:Layer:"+inPage);
				
				let bg = Level.level.bg[i];
				if (bg) {
					if (!(button instanceof Button)) {
						button = Button.create("LS:BG:Layer:"+inPage,"LS:BG:Menu",(WIDTH-10)*inCol/5+10,180+inRow*90,(WIDTH-60)/5,80).setOnClick(openBGLayer);
					}
					button.bgLayer = i;
					let bgImgName = bg.type=="name"? bg.name : bg.type=="raw"? "BGRaw:"+i : null;
					if (bgImgName) {
						let bgImg = Images.imgData[bgImgName];
						button.setIcon(bgImgName,0,0,Math.max(bgImg.width,bgImg.height),5).text = "";
					}
					else button.setIcon(null).text = "Empty";
					button.show();
					names[inRow].push(button.name);
				}
				else {
					button.hide();
					if (button instanceof Button) button.untie();
				}
			}
			if (names[0].length>0) {
				Button.funnelTo(names[0][0],"down",["LS:BG:PageLeft","LS:BG:PageRight","LS:BG:NewLayer"]);
				Button.funnelTo("LS:BG:PageLeft","up",names[0]);
				Button.pathHor(names[0]);
				Button.pathHor(names[1]);
				for (let i = 0; i < 5; i++) {
					if (names[0][i] && names[1][i]) Button.pathVert([names[0][i],names[1][i]]);
				}
			}
		}
		let openBGLayer = function() {
			let view = G$("LS:BG:EditLayer");
			view.bgLayer = this.bgLayer;
			view.open();
		}
		View.create("LS:BG:Menu",0,0,WIDTH,HEIGHT).setOnShow(function() {
			loadBGLayerPage(this.page);
		}).page = 0;
		TextElement.create("LS:BG:Select","LS:BG:Menu",WIDTH/4-150,155,fontMenuItem,"Select Layer Below",WIDTH,LEFT).show();
		Button.create("LS:BG:PageLeft","LS:BG:Menu",WIDTH/2-60,130,40,40,"<").setOnClick(function() {
			if (--this.view.page < 0) this.view.page = 0;
			loadBGLayerPage(this.view.page);
		}).show();
		Button.create("LS:BG:PageRight","LS:BG:Menu",WIDTH/2-10,130,40,40,">").setOnClick(function() {
			let totalPageCount = Math.floor((Level.level.bg.length-1)/10)+1;
			if (totalPageCount==0) return this.view.page = 0;
			if (++this.view.page >= totalPageCount) this.view.page = totalPageCount-1;
			loadBGLayerPage(this.view.page);
		}).show();
		Button.create("LS:BG:NewLayer","LS:BG:Menu",WIDTH*3/5+18,130,160,40,"Add New Layer",WIDTH,LEFT).setOnClick(function() {
			Level.level.bg.push({type:"none", name:"", raw:"", layer:-2, scale:1, parallax:1, velX:0, velY:0});
			loadBGLayerPage(this.view.page);
		}).show();
		Button.pathHor(["LS:BG:PageLeft","LS:BG:PageRight","LS:BG:NewLayer"]);
		Button.funnelTo("LS:BG","up",["LS:BG:PageLeft","LS:BG:PageRight","LS:BG:NewLayer"]);

		View.create("LS:BG:EditLayer",0,0,WIDTH,HEIGHT,"tint","green").setOnShow(function() {
			let bg = Level.level.bg[this.bgLayer];
			if (bg) {
				let hasRaw = bg.raw&&bg.raw!="";
				G$("LS:BG:Desc").show().text = bg.name || (hasRaw? "imported" : "none");
				G$("LS:BG:PreviewWrap").show();
				G$("LS:BG:Preview").show().img = bg.name || (hasRaw? "BGRaw:"+this.bgLayer : null);
				G$("LS:BG:Name").val(bg.name);
				G$("LS:BG:Layer:num").val(bg.layer);
				G$("LS:BG:Scale:num").val(bg.scale);
				G$("LS:BG:Parallax:num").val(bg.parallax);
				G$("LS:BG:VelX").val(bg.velX);
				G$("LS:BG:VelY").val(bg.velY);
			}
			else this.close();
		}).setBGVal = function(changes) {
			let bg = Level.level.bg[this.bgLayer];
			if (!bg) this.view.close();
			for (let key in changes) {
				bg[key] = changes[key];
			}
			Background.clearSlot(this.bgLayer);
			if (bg.type=="name") Background.create(this.bgLayer,bg.name,bg.layer,bg.scale,bg.parallax,bg.velX,bg.velY);
			else if (bg.type=="raw"&&bg.raw!="") BackgroundB64.create(this.bgLayer,bg.raw,bg.layer,bg.scale,bg.parallax,bg.velX,bg.velY);
			this.onShow();
		};
		Button.create("LS:BG:EditLayer:Close","LS:BG:EditLayer",WIDTH-60,10,50,50).setOnClick(function() {
			G$("LS:BG:EditLayer").close();
		}).setIcon("GUI/Icons.png",3,0,42,4).setImage("GUI/Button_Red.png").show();
		TextElement.create("LS:BG:Layer","LS:BG:EditLayer",WIDTH/2-190,210,fontMenuItem,"Draw Layer",WIDTH,LEFT).show();
		TextInput.create("LS:BG:Layer:num","LS:BG:EditLayer",WIDTH/2-60,185,100,40,"#layer",null,"Enter the draw layer",numPattern).setOnInputChange(function(val) {
			this.view.setBGVal({"layer":val});
		}).createIncrementers(20,1).show().setAsStart();
		TextElement.create("LS:BG:Scale","LS:BG:EditLayer",WIDTH*2/3-50,210,fontMenuItem,"Image Scale",WIDTH,LEFT).show();
		TextInput.create("LS:BG:Scale:num","LS:BG:EditLayer",WIDTH/2+190,185,100,40,"#bg scale",null,"Enter the background scale",numPattern).setOnInputChange(function(val) {
			this.view.setBGVal({"scale":val});
		}).show();
		TextElement.create("LS:BG:Parallax","LS:BG:EditLayer",WIDTH*2/3-18,265,fontMenuItem,"Parallax",WIDTH,LEFT).show();
		TextInput.create("LS:BG:Parallax:num","LS:BG:EditLayer",WIDTH/2+190,240,100,40,"#parallax",null,"Enter the amount of parallax",numPattern).setOnInputChange(function(val) {
			this.view.setBGVal({"parallax":val});
		}).show();
		TextElement.create("LS:BG:AutoScroll","LS:BG:EditLayer",WIDTH/2-190,265,fontMenuItem,"Auto-Scroll",WIDTH,LEFT).show();
		TextInput.create("LS:BG:VelX","LS:BG:EditLayer",WIDTH/2-60,240,60,40,"#horizontal",null,"Enter the horizontal velocity",numPattern).setOnInputChange(function(val) {
			this.view.setBGVal({"velX":val});
		}).show();
		TextInput.create("LS:BG:VelY","LS:BG:EditLayer",WIDTH/2+5,240,60,40,"#vertical",null,"Enter the vertical velocity",numPattern).setOnInputChange(function(val) {
			this.view.setBGVal({"velY":val});
		}).show();
		TextInput.create("LS:BG:Name","LS:BG:EditLayer",10,185,100,40,"img name",null,"Enter the name of the image").setOnInputChange(function(val) {
			let bg = Level.level.bg[this.view.bgLayer];
			this.upcomingVal = val;
			if (bg&&bg.raw!="") {
				gameConfirm("This will delete the imported BG. Continue?",function(response) {
					if (response) G$("LS:BG:Name").set();
				});
				return CANCEL;
			}
			else this.set();
		}).show().set = function() {
			G$("LS:BG:Desc").text = this.upcomingVal;
			this.view.setBGVal({"type":"name", "name":this.upcomingVal, "raw":""});
		};
		Button.create("LS:BG:Raw","LS:BG:EditLayer",10,240,100,40,"Import BG").setOnClick(function() {
			let view = this.view;
			FileInput.ask(["png","jpg","jpeg","bmp","webp"],"readAsDataURL",function(result,file) {
				G$("LS:BG:Desc").text = "imported";
				view.setBGVal({"type":"raw", "raw":result.split(",")[1], "name":""})
			});
		}).show();
		Button.create("LS:BG:Delete","LS:BG:EditLayer",10,295,100,40,"Delete").setOnClick(function() {
			if (!Level.level.bg[this.view.bgLayer]) return;
			let view = this.view;
			gameConfirm("Delete background layer #"+(this.view.bgLayer+1)+"?",function(result) {
				if (result) {
					Level.level.bg.splice(view.bgLayer,1);
					Background.killAll();
					Level.loadBackgrounds();
					view.close();
				}
			})
		}).setImage("GUI/Button_Red.png").show();
		ImgElement.create("LS:BG:PreviewWrap","LS:BG:EditLayer",WIDTH/2,91,"GUI/BG_Preview.png",202,160,IMAGE_STRETCH);
		TextElement.create("LS:BG:Desc","LS:BG:EditLayer",WIDTH/2,150,fontMenuData,null,WIDTH,CENTER);
		ImgElement.create("LS:BG:Preview","LS:BG:EditLayer",WIDTH/2,70,"",192,108,IMAGE_ZOOM);
		Button.pathHor(["LS:BG:Name","LS:BG:Layer:num","LS:BG:Scale:num"]);
		Button.pathHor(["LS:BG:Raw","LS:BG:VelX","LS:BG:VelY","LS:BG:Parallax:num"]);
		Button.pathVert(["LS:BG:Name","LS:BG:Raw","LS:BG:Delete"]);
		Button.pathVert(["LS:BG:Layer:num","LS:BG:VelX"]);
		Button.funnelTo("LS:BG:Layer:num","up",["LS:BG:VelX","LS:BG:VelY"]);
		Button.pathVert(["LS:BG:Scale:num","LS:BG:Parallax:num"]);
		Button.funnelTo("LS:BG:EditLayer:Close","up",["LS:BG:Name","LS:BG:Layer:num","LS:BG:Scale:num"]);
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