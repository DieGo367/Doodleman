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
      if (Pointer.focusLayer>0 && !G$("PauseMenu").visible) return CANCEL;
      G$("PauseMenu").hide();
      G$("Hud").show();
      if (devEnabled) G$("DevTools").show();
    }
  },
  onBlur: function() {
    pauseGame(true);
  },
  onLevelLoad: function() {
    Player.setAllLives(5);
    Player.addAll();
    G$("LevelSelectView").hide();
    if (focused) pauseGame(false);
  },
  onDeath: function(ent,attacker) {
    if (ent instanceof Player && !Player.canRespawn(ent.slot)) {
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
      G$("PauseMenu").hide();
      G$("LevelSelectView").show();
    }).show().setPressDelay(1).up("CtrlSettingsButton").setAsStart();
    Button.funnelTo("LevelSelectButton","down",["CtrlSettingsButton","VolumeButton","FSToggle","PauseClose"]);
    Button.pathVert(["LevelSelectButton","QuitGame"]);
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
