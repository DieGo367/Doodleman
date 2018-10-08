const GAME_SANDBOX = GameManager.addMode(new GameMode({
  start: function() {
    this.addGui();
    G$("Hud").show();
    this.onLevelLoad();
  },
  quit: function() {
    this.removeGui();
  },
  onPause: function(paused) {
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
    addPlayer(0);
    if (multiplayer) addPlayer(1);
    G$("LevelSelectView").hide();
    if (focused) pauseGame(false);
  },
  onDeath: function(ent,attacker) {
    if (ent instanceof Player && ent.lives<=0) {
      let slot = ent.slot;
      let buttons = [multiplayer?"AddP1Button":"RespawnP1Button","AddP2Button"];
      G$(buttons[slot]).show();
    }
  },
  addGui: function() {
    buildMainHud();
    Button.create("RespawnP1Button","Hud",hudWidth/2-50,50,100,40,"Respawn").setOnClick(function() {
      addPlayer(0);
      this.hide();
    });
    Button.create("AddP1Button","Hud",hudWidth/2-110,50,100,40,"P1 Start").setOnClick(function() {
      addPlayer(0);
      this.hide();
    });
    Button.create("AddP2Button","Hud",hudWidth/2+10,50,100,40,"P2 Start").setOnClick(function() {
      addPlayer(1);
      this.hide();
    });
    buildPauseMenu();
    Button.create("LevelSelectButton","PauseMenu",hudWidth/2-150,hudHeight-120,300,40,"Level Select").setOnClick(function() {
      G$("LevelSelectView").show();
      G$("PauseMenu").hide();
    }).show().setPressDelay(1);
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
