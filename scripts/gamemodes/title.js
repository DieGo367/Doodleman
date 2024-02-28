const GAME_TITLE = GameManager.addMode(new GameMode({
	start: function() {
		this.addGui();
		Level.loadLevel("Title.json");
		Tap.ctrlEnabled = false;
	},
	quit: function() {
		this.removeGui();
		Tap.ctrlEnabled = true;
	},
	addGui: function() {
		buildLinksMenu();
		View.create("Title",0,0,WIDTH,HEIGHT).open();
		TextElement.create("TitleLogo","Title",WIDTH/2,HEIGHT*11/36,fontLogo,"Doodleman",WIDTH,CENTER).show();
		TextElement.create("TitleYear","Title",10,HEIGHT-10,fontCredit,"\u00A92020 DieGo",WIDTH,LEFT).show();
		Button.create("LinksButton","Title",0,HEIGHT-25,125,25).setOnClick(function() {
			G$("Links").open();
		}).shouldDraw(false).show();
		makeFSButton("FSToggle","Title",WIDTH-60,HEIGHT-60).show();
		Button.create("VolumeButton","Title",WIDTH-(startedInFullScreen?60:120),HEIGHT-60,50,50).setOnClick(function() {
			let vol = G$("VolumeSlider");
			if (vol.isVisible()) vol.hide();
			else vol.show();
		}).setIcon("GUI/Icons.png",0,3,42,4).show();
		Slider.create("VolumeSlider","Title",WIDTH-125,HEIGHT-110,20,40,100).setOnViewShown(function() {
			this.hide();
			this.setValue(Sound.volume);
			G$("VolumeButton").setIcon("GUI/Icons.png",(this.value==0?1:0),3,42,4);
		})
		.setOnSlide(function() {
			Sound.setVolume(this.value);
			G$("VolumeButton").setIcon("GUI/Icons.png",(this.value==0?1:0),3,42,4);
		});
		Button.pathHor(["VolumeButton","FSToggle"]);

		View.create("Option_Mode",0,0,WIDTH,HEIGHT).setOnShow(function() {
			let s = G$("Option_Mode:Survival");
			if (s.visible) s.setAsStart();
			if (this.baseview.hadSelected) guiSelectedElement = guiStartElement;
		}).opensub();
		Button.create("Option_Mode:Survival","Option_Mode",WIDTH/2-100,HEIGHT/2-30,200,60,"Survival").setOnClick(function() {
			this.view.baseview.hadSelected = guiSelectedElement;
			this.view.closesub();
			this.view.gamemode = GAME_SURVIVAL;
			G$("Option_MP").opensub();
		}).show().setAsStart();
		Button.create("Option_Mode:Sandbox","Option_Mode",WIDTH/2-100,HEIGHT/2+45,200,60,"Sandbox").setOnClick(function() {
			this.view.baseview.hadSelected = guiSelectedElement;
			this.view.closesub();
			this.view.gamemode = GAME_SANDBOX;
			G$("Option_MP").opensub();
		}).show();
		Button.create("Option_Mode:Online","Option_Mode",WIDTH/2-100,HEIGHT/2+120,200,50,"Online").setOnClick(function() {
			Game.mode = GAME_ONLINELOBBY;
		}).setImage("GUI/Button_Red.png").show().on = true;
		Button.pathVert(["Option_Mode:Survival","Option_Mode:Sandbox","Option_Mode:Online"]);
		Button.funnelTo("VolumeButton","right",["Option_Mode:Survival","Option_Mode:Sandbox","Option_Mode:Online"]);

		View.create("Option_MP",0,0,WIDTH,HEIGHT).setOnShow(function() {
			G$("Option_MP:Single").setAsStart();
			if (this.baseview.hadSelected) guiSelectedElement = guiStartElement;
		});
		Button.create("Option_MP:Single","Option_MP",WIDTH/2-100,HEIGHT/2-30,200,40,"1 Player").setOnClick(function() {
			this.view.baseview.hadSelected = guiSelectedElement;
			this.view.closesub();
			multiplayer = false;
			Game.mode = G$("Option_Mode").gamemode;
		}).show().setAsStart();
		Button.create("Option_MP:Mult","Option_MP",WIDTH/2-100,HEIGHT/2+30,200,40,"2 Player").setOnClick(function() {
			this.view.baseview.hadSelected = guiSelectedElement;
			multiplayer = true;
			if (GamePad.ctrlMaps.length==0&&Tap.ctrlMaps.length==0) {
				// the only options are keyboard controls
				Player.clearCtrlAssignments();
				Player.assignCtrl(0,KEYBOARD,0);
				Player.assignCtrl(1,KEYBOARD,1);
				Game.mode = G$("Option_Mode").gamemode;
			}
			else assignCtrlGUI(function() { // success
				Game.mode = G$("Option_Mode").gamemode;
			});
		}).show();
		Button.create("Option_MP:Cancel","Option_MP",WIDTH/2-100,HEIGHT/2+120,200,40,"Back").setOnClick(function() {
			this.view.closesub();
			G$("Option_Mode").opensub();
		}).setImage("GUI/Button_Red.png").show();
		Button.pathVert(["Option_MP:Single","Option_MP:Mult","Option_MP:Cancel"]);
		Button.funnelTo("VolumeButton","right",["Option_MP:Single","Option_MP:Mult","Option_MP:Cancel"]);
	},
	removeGui: function() {
		View.killAll();
	}
}));
