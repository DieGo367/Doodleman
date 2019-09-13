const GAME_SANDBOX = GameManager.addMode(new GameMode({
  start: function() {
    this.addGui();
    G$("Hud").open();
    this.onLevelLoad();
  },
  quit: function() {
    this.removeGui();
  },
  onPause: function(paused) {
    if (paused) {
      G$("PauseMenu").open();
      G$("DevTools").hide();
      Tap.ctrlEnabled = false;
    }
    else {
      if (View.focus>2) return CANCEL;
      G$("PauseMenu").close();
      if (devEnabled) G$("DevTools").show();
      Tap.ctrlEnabled = true;
    }
  },
  onBlur: function() {
    pauseGame(true);
  },
  onLevelLoad: function() {
    Player.setAllLives(5);
    Player.addAll();
    let ls = G$("LevelSelectView")
    if (ls.layer) ls.close();
    if (focused) pauseGame(false);
  },
  onDeath: function(ent,attacker) {
    if (ent instanceof Player && !Player.hasLives(ent.slot)) {
      let slot = ent.slot;
      let buttons = [multiplayer?"AddP1Button":"RespawnP1Button","AddP2Button"];
      G$(buttons[slot]).show();
    }
  },
  addGui: function() {
    buildMainHud();
    Button.create("RespawnP1Button","Hud",WIDTH/2-50,50,100,40,"Respawn").setOnClick(function() {
      Player.setLives(0,5);
      Player.add(0);
      this.hide();
    });
    Button.create("AddP1Button","Hud",WIDTH/2-110,50,100,40,"P1 Start").setOnClick(function() {
      Player.setLives(0,5);
      Player.add(0);
      this.hide();
    });
    Button.create("AddP2Button","Hud",WIDTH/2+10,50,100,40,"P2 Start").setOnClick(function() {
      Player.setLives(1,5);
      Player.add(1);
      this.hide();
    });

    buildPauseMenu();
    Button.create("LevelSelectButton","PauseMenu",WIDTH/2-150,HEIGHT-120,300,40,"Level Select").setOnClick(function() {
      G$("LevelSelectView").open();
    }).show().setPressDelay(1).up("CtrlSettingsButton");
    Button.funnelTo("LevelSelectButton","down",["CtrlSettingsButton","VolumeButton","FSToggle","PauseClose"]);
    Button.pathVert(["LevelSelectButton","QuitGame"]);

    View.create("LevelSelectView",0,0,WIDTH,HEIGHT,"tint","black");
    TextElement.create("LSText","LevelSelectView",WIDTH/2,30,fontMenuTitle,"Select a level",WIDTH,CENTER).show();
  	Button.create("LSClose","LevelSelectView",WIDTH-60,10,50,50).setOnClick(function() {
  		G$("LevelSelectView").close();
  	}).setIcon("GUI/Icons.png",3,0,42,4).setImage("GUI/Button_Red.png").show();
    Resources.request("data/sandbox_levels.json", function(data) {
  		let levels = JSON.parse(data);
  		let grid = [], rightSide = [];
      let i = 0, length = 0;
      for (var name in levels) length++;
  		for (var name in levels) {
        let filename = levels[name];
  			let y = Math.floor(i/2);
  			let x = i%2;
  			let b = Button.create("LSLevel"+i,"LevelSelectView",20+220*x,50+y*60,200,40,name).setOnClick(function() {
  				Level.loadLevel(this.levelFile);
  			}).show();
        b.levelFile = filename;
  			grid[y] = grid[y] || [];
  			grid[y][x] = b.name;
  			if (x==1||i==length-1) rightSide.push(b.name);
  			if (x==0&&y==0) b.setAsStart();
        i++;
  		}
  		Button.pathGrid(grid);
  		Button.funnelTo("LSFileButton","right",rightSide);
  	});
  	Button.create("LSFileButton","LevelSelectView",WIDTH-170,HEIGHT-60,150,40,"Load From File").setOnClick(Level.openLocalFile,true).show().setPressDelay(1);
  	Button.pathVert(["LSClose","LSFileButton"]);

    buildControllerSettingsMenu();
    buildMapperView();
    buildMapperTool();
    buildHelpPage();
    buildDevToolsHud();
  },
  removeGui: function() {
    G$("Hud").remove();
    G$("PauseMenu").remove();
    G$("LevelSelectView").remove();
    G$("CtrlSettingsView").remove();
    G$("MapperView").remove();
    G$("MapperTool").remove();
    G$("HelpView").remove();
    G$("DevTools").remove();
  }
}));
