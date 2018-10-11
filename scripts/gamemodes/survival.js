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
      G$("PauseMenu").hide();
      G$("Hud").show();
      if (devEnabled) G$("DevTools").show();
    }
  },
  onLevelLoad: function() {
    this.wave = 0;
    this.score = 0;
    this.deathEvent = false;
    G$("ScoreText").show().text = "Score: 0";
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
        G$("DeathText").text = G$("ScoreText").text;
        G$("DeathScreen").show();
      },1000);
    }
  },

  addScore: function(amt) {
    this.score += amt;
    G$("ScoreText").text = "Score: "+this.score;
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
    TextElement.create("ScoreText","Hud",hudWidth/2,55,fontHudScore,"Score: 0",hudWidth,CENTER);
    buildPauseMenu();
    Button.create("RetryButton","PauseMenu",hudWidth/2-150,hudHeight-120,300,40,"Retry").setOnClick(function() {
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
    View.create("DeathScreen",1,0,0,hudWidth,hudHeight,"tint","black");
    TextElement.create("DeathText","DeathScreen",hudWidth/2,hudHeight/4,fontPaused,"Score: ",hudWidth,CENTER).show();
    Button.create("PlayAgain","DeathScreen",hudWidth/2-150,hudHeight-120,300,40,"Play Again").setOnClick(function() {
      Level.loadLevel("Dungeon-0.json");
    }).show();
    Button.create("DeathScreenQuit","DeathScreen",hudWidth/2-150,hudHeight-60,300,40,"Back to Title").setOnClick(G$("QuitGame").onClickFunction).show();
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
