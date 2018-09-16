const SandboxMode = {
  start: function() {
    Level.clearLevel();
    G$("Hud").show();
    addPlayer(0);
    if (multiplayer) addPlayer(1);
  },
  onLevelLoad: function() {
    addPlayer(0);
    if (multiplayer) addPlayer(1);
  },
  tick: function() {

  }
}
Game.modeObjects.push(SandboxMode);
