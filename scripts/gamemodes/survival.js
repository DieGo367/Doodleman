const GAME_SURVIVAL = GameManager.addMode(new GameMode({
  start: function() {
    this.ready = false;
    this.addGui();
    G$("Hud").show();
    if (!EditorTools.levelCopy) Level.loadLevel("Dungeon-0.json");
  },
  quit: function() {
    this.removeGui();
  },
  tick: function() {
    if (!this.ready) return;

    if (Enemy.getAll().length==0) {
      this.wave++;
      this.spawnWave(this.wave);
    }
  },
  onPause: function(paused) {
    if (this.deathEvent) return CANCEL;
    if (paused) {
      G$("PauseMenu").show();
      G$("Hud").hide();
      G$("DevTools").hide();
    }
    else {
      if (!G$("PauseMenu").visible) return CANCEL;
      G$("PauseMenu").hide();
      G$("Hud").show();
      if (devEnabled) G$("DevTools").show();
    }
  },
  onBlur: function() {
    if (!this.deathEvent) pauseGame(true);
  },
  onLevelLoad: function() {
    this.wave = 0;
    this.score = 0;
    this.deathEvent = false;
    G$("ScoreText").setVar(0).show();
    addPlayer(0);
    if (multiplayer) addPlayer(1);
    G$("LevelSelectView").hide();
    G$("DeathScreen").hide();
    if (focused) pauseGame(false);
    this.ready = true;
  },
  onDeath: function(ent,attacker) {
    if (ent instanceof Enemy&&attacker instanceof Player) this.addScore(ent.maxHealth);
    else if (ent instanceof Player&&ent.lives<1) {
      this.deathEvent = true;
      if (Player.getAll().length<=1) setTimeout(function() {
        G$("Hud").hide();
        G$("DeathText").setVar(G$("ScoreText").var);
        G$("DeathScreen").show();
      },1000);
    }
  },

  addScore: function(amt) {
    this.score += amt;
    G$("ScoreText").setVar(this.score);
  },
  spawnWave: function(num) {
    while(num-->0) {
      //spawn an enemy at random coords
      let x = Math.round(Math.random()*Level.level.width);
      let y = Math.round(Math.random()*Level.level.height);
      if (currentMonth==9 && Math.random()>0.5) Skeltal.create(x,y);
      else ActorManager.make(10,x,y);
    }
  },

  addGui: function() {
    buildMainHud();
    TextElement.create("ScoreText","Hud",WIDTH/2,55,fontHudScore,"Score: {{var}}",WIDTH,CENTER).setVar(0);
    buildPauseMenu();
    Button.create("RetryButton","PauseMenu",WIDTH/2-150,HEIGHT-120,300,40,"Retry").setOnClick(function() {
      gameConfirm("Are you sure you want to restart?",function(response) {
        if (response) Level.loadLevel("Dungeon-0.json");
      });
    }).show();
    buildLevelSelectMenu();
    buildControllerSettingsMenu();
    buildMapperView();
    buildMapperTool();
    buildHelpPage();
    buildDevToolsHud();
    View.create("DeathScreen",1,0,0,WIDTH,HEIGHT,"tint","black");
    TextElement.create("DeathText","DeathScreen",WIDTH/2,HEIGHT/4,fontPaused,"Score: {{var}}",WIDTH,CENTER).setVar(0).show();
    Button.create("PlayAgain","DeathScreen",WIDTH/2-150,HEIGHT-120,300,40,"Play Again").setOnClick(function() {
      Level.loadLevel("Dungeon-0.json");
    }).show();
    Button.create("DeathScreenQuit","DeathScreen",WIDTH/2-150,HEIGHT-60,300,40,"Back to Title").setOnClick(G$("QuitGame").onClickFunction).show();
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
    G$("DeathScreen").remove();
  }
}));
