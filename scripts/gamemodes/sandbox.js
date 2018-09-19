const SandboxMode = new GameMode();
GameManager.addMode(SandboxMode);
SandboxMode.start = function() {
    G$("Hud").show();
    this.onLevelLoad();
};
SandboxMode.quit = function() {
  G$("Hud").hide();
};
SandboxMode.onLevelLoad = function() {
  addPlayer(0);
  if (multiplayer) addPlayer(1);
};
