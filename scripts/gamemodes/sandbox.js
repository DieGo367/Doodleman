const SandboxMode = {
  start: function() {
    Level.clearLevel();
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
