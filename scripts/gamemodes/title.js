const GAME_TITLE = GameManager.addMode(new GameMode({
  start: function() {
    this.addGui();
    Level.loadLevel("Title.json");
  },
  quit: function() {
    this.removeGui();
  },
  addGui: function() {
    buildLinksMenu();
    View.create("Title",0,0,WIDTH,HEIGHT).open();
  	TextElement.create("TitleLogo","Title",WIDTH/2,HEIGHT*11/36,fontLogo,"Doodleman",WIDTH,CENTER).show();
  	TextElement.create("TitleYear","Title",10,HEIGHT-10,fontCredit,"\u00A92019 DieGo",WIDTH,LEFT).show();
    Button.create("LinksButton","Title",0,HEIGHT-25,125,25).setOnClick(function() {
      G$("Links").open();
    }).shouldDraw(false).show();
    Button.create("FSToggle","Title",WIDTH-60,HEIGHT-60,50,50).setToggle(function() {
      this.on = !this.on;
  		setFullScreen(this.on);
    },true)
    .setOnViewShown(function() {
      this.on = fullScreen;
    }).setIcon("GUI/Icons.png",2,0,42,4).show();
    Button.create("VolumeButton","Title",WIDTH-120,HEIGHT-60,50,50).setOnClick(function() {
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
  	Button.create("Option_Mode:Sandbox","Option_Mode",WIDTH/2-100,HEIGHT/2+50,200,60,"Sandbox").setOnClick(function() {
      this.view.baseview.hadSelected = guiSelectedElement;
  		this.view.closesub();
  		this.view.gamemode = GAME_SANDBOX;
      G$("Option_MP").opensub();
  	}).show();
    Button.pathVert(["Option_Mode:Survival","Option_Mode:Sandbox"]);
    Button.funnelTo("VolumeButton","right",["Option_Mode:Survival","Option_Mode:Sandbox"]);

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
      this.view.closesub();
      multiplayer = true;
      Game.mode = G$("Option_Mode").gamemode;
    }).show();
    Button.create("Option_MP:Cancel","Option_MP",WIDTH/2-100,HEIGHT/2+120,200,40,"Back").setOnClick(function() {
      this.view.closesub();
      G$("Option_Mode").opensub();
    }).setImage("GUI/Button_Red.png").show();
    Button.pathVert(["Option_MP:Single","Option_MP:Mult","Option_MP:Cancel"]);
    Button.funnelTo("VolumeButton","right",["Option_MP:Single","Option_MP:Mult","Option_MP:Cancel"]);
  },
  removeGui: function() {
    G$("Title").remove();
    G$("Option_Mode").remove();
    G$("Option_MP").remove();
  }
}));
