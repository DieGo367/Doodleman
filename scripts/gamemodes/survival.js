const GAME_SURVIVAL = GameManager.addMode(new GameMode({
  start: function() {
    this.ready = false;
    this.score = 0;
    this.gameState = "none";
    this.surplusWave = 0;
    this.addGui();
    G$("Hud").show();
    if (EditorTools.levelCopy) this.setTestLevel();
    else this.firstWave();
  },
  quit: function() {
    this.removeGui();
  },
  tick: function() {
    if (!this.ready) return;
    if (this.gameState=="wave") {
      if (Enemy.getAll().length==0) {
        this.gameState = "none";
        Timer.wait(60,function() {
          this.nextLineup();
        },this);
      }
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
    G$("ScoreText").show();
    Player.addAll();
    G$("LevelSelectView").hide();
    G$("DeathScreen").hide();
    if (focused) pauseGame(false);
    this.ready = true;
    this.spawnWave();
  },
  onHurt: function(ent,attacker) {
    if (ent instanceof Player && attacker instanceof Player) return CANCEL;
    if (ent instanceof Enemy && attacker instanceof Player) {
      if (attacker.attackBox.hitCount>1) this.addScore(1);
    }
  },
  onDeath: function(ent,attacker) {
    if (ent instanceof Enemy&&attacker instanceof Player) {
      this.addScore(ent.maxHealth);
      if (!ent.target) {
        this.addScore(1);
        this.stealthKills++;
      }
    }
    else if (ent instanceof Player&&!Player.canRespawn(ent.slot)) {
      this.deathEvent = true;
      if (Player.getAll().length<=1) wait(60,function() {
        G$("Hud").hide();
        G$("DeathText").setVar(G$("ScoreText").var);
        G$("DeathScreen").show();
      });
    }
  },

  getLevel: function(levelNum) {
    if (levelNum==void(0)) levelNum = this.level;
    let level = this.levels[levelNum];
    if (level) return level;
  },
  getWave: function(waveNum,levelNum) {
    if (waveNum==void(0)) waveNum = this.wave;
    if (levelNum==void(0)) levelNum = this.level;
    let level = this.getLevel(levelNum);
    if (level&&level.waves) {
      let wave = level.waves[waveNum];
      if (wave) return wave;
    }
  },
  waveLineupCount: function(waveNum,levelNum) {
    let wave = this.getWave(waveNum,levelNum);
    if (wave) return wave.length;
  },
  levelWaveCount: function(levelNum) {
    let level = this.getLevel(levelNum);
    if (level&&level.waves) return level.waves.length;
  },
  firstWave: function() {
    this.lineup = this.wave = this.level = 0;
    this.addScore(-this.score);
    this.stealthKills = 0;
    this.deathEvent = false;
    Player.setAllLives(5);
    let level = this.getLevel();
    if (level) {
      if (level.filename) Level.loadLevel(level.filename);
      else if (level.isEditorCopy) Level.load(JSON.stringify(EditorTools.levelCopy),false);
      else Level.clearLevel();
    }
  },
  nextLineup: function() {
    this.gameState = "none";
    this.stealthBonus(this.lineup);
    this.lineup++;
    if (this.lineup<this.waveLineupCount()) this.spawnWave();
    else this.reward();
  },
  nextWave: function() {
    this.lineup = 0;
    this.wave++;
    if (this.wave<this.levelWaveCount()) this.spawnWave();
    else this.nextLevel();
  },
  nextLevel: function() {
    this.lineup = this.wave = 0;
    this.level++;
    if (this.level<this.levels.length) Level.loadLevel(this.levels[this.level].filename);
    else {
      this.level--;
      this.surplusWave++;
      this.spawnWave();
    }
  },
  addScore: function(amt) {
    this.score += amt;
    G$("ScoreText").setVar(this.score);
  },
  spawnWave: function() {
    let wave = this.getWave();
    if (wave) {
      let lineup = wave[this.lineup];
      if (lineup) for (var i in lineup) {
        let enem = ActorManager.make(...lineup[i]);
        let zone = SpawnZone.weightedSelection();
        if (zone) zone.enterAsSpawn(enem);
        else {
          let pt = Level.randPt();
          enem.x = enem.spawnX = pt.x;
          enem.y = enem.spawnY = pt.y;
        }
      }
      this.gameState = "wave";
    }
    else if (this.level!=0) this.firstWave();
  },
  stealthBonus: function() {
    let kills = this.stealthKills;
    this.stealthKills = 0;

    let wave = this.getWave();
    if (!wave) return;
    let lineup = wave[this.lineup];
    if (!lineup) return;

    let total = lineup.length;
    if (total>3 && kills>total/3) {
      let pt = Level.randPt();
      let heart = PlusHeart.create(pt.x,pt.y,1);
      let zone = SpawnZone.weightedSelection();
      if (zone) zone.enterAsSpawn(heart);
    }
  },
  reward: function() {
    gameAlert("Wave "+(this.wave+this.surplusWave+1)+" complete!",120);
    PlusHeart.create(Level.level.width/2,Level.level.height/2,1);
    Timer.wait(120,function() {
      Game.nextWave();
    });
  },
  setTestLevel: function() {
    this.level = this.wave = this.lineup = 0;
    this.score = 0;
    this.levels = [
      {
        filename: null,
        isEditorCopy: true,
        waves: [
          [
            [[10]], [[10],[10]], [[10],[10],[10]], [[10],[10],[10],[10],[10]],
            [[10],[10],[10],[10],[10],[10],[10]],
            [[10],[10],[10],[10],[10],[10],[10],[10],[10],[10]]
          ]
        ],
        reward: []
      }
    ]
  },

  addGui: function() {
    buildMainHud();
    TextElement.create("ScoreText","Hud",WIDTH/2,55,fontHudScore,"Score: {{var}}",WIDTH,CENTER).setVar(0);
    buildPauseMenu();
    Button.create("RetryButton","PauseMenu",WIDTH/2-150,HEIGHT-120,300,40,"Retry").setOnClick(function() {
      gameConfirm("Are you sure you want to restart?",function(response) {
        if (response) Game.firstWave();
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
      Game.firstWave();
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
  },

  levels: [
    {
      filename: "Room-1.json",
      waves: [
        [ // a wave
          [ // a lineup
            [10], // actor data
          ],
          [[10],[10]], [[10],[10],[10]], [[10],[10],[10],[10],[10]],
          [[10],[10],[10],[10],[10],[10],[10]],
          [[10],[10],[10],[10],[10],[10],[10],[10],[10],[10]]
        ]
      ]
    }
  ]
}));
