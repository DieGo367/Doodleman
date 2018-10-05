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
  onLevelLoad: function() {
    this.wave = 0;
    this.score = 0;
    G$("ScoreText").show().text = "Score: 0";
    addPlayer(0);
    if (multiplayer) addPlayer(1);
    G$("LevelSelectView").hide();
    if (focused) pauseGame(false);
    this.ready = true;
  },
  onDeath: function(ent,attacker) {
    if (ent instanceof Enemy&&attacker instanceof Player) this.addScore(ent.maxHealth);
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
