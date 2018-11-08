const GAME_SURVIVAL = GameManager.addMode(new GameMode({
  start: function() {
    this.ready = false;
    this.addGui();
    G$("Hud").show();
    if (!EditorTools.levelCopy) Level.loadLevel("Room-1.json");
  },
  quit: function() {
    this.removeGui();
  },
  tick: function() {
    if (!this.ready) return;

    if (Enemy.getAll().length==0) {
      this.stealthBonus(this.wave);
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
      if (Pointer.focusLayer>0 && !G$("PauseMenu").visible) return CANCEL;
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
    this.stealthKills = 0;
    G$("ScoreText").setVar(0).show();
    addPlayer(0);
    if (multiplayer) addPlayer(1);
    G$("LevelSelectView").hide();
    G$("DeathScreen").hide();
    if (focused) pauseGame(false);
    this.ready = true;
  },
  onHurt: function(ent,attacker) {
    if (ent instanceof Player && attacker instanceof Player) return CANCEL;
  },
  onDeath: function(ent,attacker) {
    if (ent instanceof Enemy&&attacker instanceof Player) {
      this.addScore(ent.maxHealth);
      if (!ent.target) {
        this.addScore(1);
        this.stealthKills++;
      }
    }
    else if (ent instanceof Player&&ent.lives<1) {
      this.deathEvent = true;
      if (Player.getAll().length<=1) wait(60,function() {
        G$("Hud").hide();
        G$("DeathText").setVar(G$("ScoreText").var);
        G$("DeathScreen").show();
      });
    }
  },

  addScore: function(amt) {
    this.score += amt;
    G$("ScoreText").setVar(this.score);
  },
  spawnWave: function(num) {
    while(num-->0) {
      let zone = SpawnZone.weightedSelection();
      //spawn an enemy at random coords
      let x = Math.round(Math.random()*Level.level.width);
      let y = Math.round(Math.random()*Level.level.height);
      let enem;
      if (currentMonth==9 && Math.random()>0.5) enem = Skeltal.create(x,y);
      else enem = ActorManager.make(10,x,y);
      if (zone) zone.enterAsSpawn(enem);
    }
  },
  stealthBonus: function(num) {
    if (num>3 && this.stealthKills>num/3) {
      let zone = SpawnZone.weightedSelection();
      let x = Math.round(Math.random()*Level.level.width);
      let y = Math.round(Math.random()*Level.level.height);
      if (zone) zone.enterAsSpawn(PlusHeart.create(x,y,1));
    }
    this.stealthKills = 0;
  },

  addGui: function() {
    buildMainHud();
    TextElement.create("ScoreText","Hud",WIDTH/2,55,fontHudScore,"Score: {{var}}",WIDTH,CENTER).setVar(0);
    buildPauseMenu();
    Button.create("RetryButton","PauseMenu",WIDTH/2-150,HEIGHT-120,300,40,"Retry").setOnClick(function() {
      gameConfirm("Are you sure you want to restart?",function(response) {
        if (response) Level.loadLevel("Room-1.json");
      });
    }).show().up("CtrlSettingsButton").setAsStart();
    Button.funnelTo("RetryButton","down",["CtrlSettingsButton","VolumeButton","FSToggle","PauseClose"]);
    Button.pathVert(["RetryButton","QuitGame"]);
    buildLevelSelectMenu();
    buildControllerSettingsMenu();
    buildMapperView();
    buildMapperTool();
    buildHelpPage();
    buildDevToolsHud();
    View.create("DeathScreen",1,0,0,WIDTH,HEIGHT,"tint","black");
    TextElement.create("DeathText","DeathScreen",WIDTH/2,HEIGHT/4,fontPaused,"Score: {{var}}",WIDTH,CENTER).setVar(0).show();
    Button.create("PlayAgain","DeathScreen",WIDTH/2-150,HEIGHT-120,300,40,"Play Again").setOnClick(function() {
      this.view.hide();
      G$("Hud").show();
      Level.loadLevel("Room-1.json");
    }).show().setAsStart();
    Button.create("DeathScreenQuit","DeathScreen",WIDTH/2-150,HEIGHT-60,300,40,"Back to Title").setOnClick(G$("QuitGame").onClickFunction).show();
    Button.pathVert(["PlayAgain","DeathScreenQuit"]);
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
