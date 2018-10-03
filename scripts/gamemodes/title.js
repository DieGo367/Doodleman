const GAME_TITLE = GameManager.addMode(new GameMode({
  start: function() {
    this.addGui();
    Level.loadLevel("Title.json");
  },
  quit: function() {
    this.removeGui();
  },
  addGui: function() {
    View.create("Title",0,0,0,hudWidth,hudHeight).show();
  	TextElement.create("TitleLogo","Title",hudWidth/2,hudHeight*11/36,fontLogo,"Doodleman",hudWidth,CENTER).show();
  	TextElement.create("TitleYear","Title",10,hudHeight-10,fontCredit,"\u00A92018 DieGo",hudWidth,LEFT).show();
    Button.create("FSToggle","Title",hudWidth-60,hudHeight-60,50,50).setToggle(function() {
  		callPrefixedFunction(canvas,"requestFullscreen");
  		callPrefixedFunction(canvas,"requestFullScreen");
  	}, function() {
  		callPrefixedFunction(document,"exitFullscreen");
  		callPrefixedFunction(document,"exitFullScreen");
  	},true)
    .setOnViewShown(function() {
      if (fullScreen) {
  			this.toggleState = 1;
  			this.on = true;
  		}
    }).setIcon("GUI-Icons.png",2,0,42,4).show();

    View.create("Option_Mode",0,0,0,hudWidth,hudHeight).show();
  	Button.create("Option_Mode:Survival","Option_Mode",hudWidth/2-100,hudHeight/2-30,200,60,"Survival").setOnClick(function() {
  		this.view.hide();
  		this.view.gamemode = GAME_SURVIVAL;
      G$("Option_MP").show();
  	}).show();
  	Button.create("Option_Mode:Sandbox","Option_Mode",hudWidth/2-100,hudHeight/2+50,200,60,"Sandbox").setOnClick(function() {
  		this.view.hide();
  		this.view.gamemode = GAME_SANDBOX;
      G$("Option_MP").show();
  	}).show();

    View.create("Option_MP",0,0,0,hudWidth,hudHeight);
    Button.create("Option_MP:Single","Option_MP",hudWidth/2-100,hudHeight/2-30,200,40,"1 Player").setOnClick(function() {
      this.view.hide();
      multiplayer = false;
      Game.mode = G$("Option_Mode").gamemode;
    }).show();
    Button.create("Option_MP:Mult","Option_MP",hudWidth/2-100,hudHeight/2+30,200,40,"2 Player").setOnClick(function() {
      this.view.hide();
      multiplayer = true;
      Game.mode = G$("Option_Mode").gamemode;
    }).show();
    Button.create("Option_MP:Cancel","Option_MP",hudWidth/2-100,hudHeight/2+120,200,40,"Back").setOnClick(function() {
      this.view.hide();
      G$("Option_Mode").show();
    }).setClose(true).show();
  },
  removeGui: function() {
    G$("Title").remove();
    G$("Option_Mode").remove();
    G$("Option_MP").remove();
  }
}));
