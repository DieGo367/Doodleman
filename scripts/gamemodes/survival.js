const SurvivalMode = {
  start: function() {
    Level.clearLevel();
    addPlayer(0);
    if (multiplayer) addPlayer(1);
  }
}
Game.modeObjects.push(SurvivalMode);