const SurvivalMode = {
  start: function() {
    ResourceManager.request("levels/Dungeon-0.json",function(data) {
      Level.load(data);
    });
  },
  onLevelLoad: function() {
    addPlayer(0);
    if (multiplayer) addPlayer(1);
  },
  tick: function() {
    
  }
}
Game.modeObjects.push(SurvivalMode);
