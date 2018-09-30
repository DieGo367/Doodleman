const SandboxMode = new GameMode();
GameManager.addMode(SandboxMode);
SandboxMode.start = function() {
    this.addGui();
    G$("Hud").show();
    this.onLevelLoad();
};
SandboxMode.quit = function() {
  this.removeGui();
};
SandboxMode.onLevelLoad = function() {
  addPlayer(0);
  if (multiplayer) addPlayer(1);
};
SandboxMode.addGui = function() {
  buildMainHud();
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
  Player.respawnButtons = [G$("AddP1Button"),G$("AddP2Button"),null,null];
};
SandboxMode.removeGui = function() {
  G$("Hud").remove();
  G$("PauseMenu").remove();
  G$("LevelSelectView").remove();
  G$("CtrlSettingsView").remove();
  G$("MapperView").remove();
  G$("MapperTool").remove();
  G$("HelpView").remove();
  G$("DevTools").remove();
  Player.respawnButtons = [null,null,null,null];
};
