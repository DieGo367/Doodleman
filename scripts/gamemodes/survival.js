const SurvivalMode = {
  ready: false,
  wave: 0,
  score: 0,
  start: function() {
    this.ready = false;
    ResourceManager.request("levels/Dungeon-0.json",function(data) {
      Level.load(data);
    });
  },
  onLevelLoad: function() {
    addPlayer(0);
    if (multiplayer) addPlayer(1);
    this.ready = true;
  },
  tick: function() {
    if (!this.ready) return;
    
    if (PaintMinion.getAll().length==0) {
      this.wave++;
      this.spawnWave(this.wave);
    }
  },

  spawnWave: function(num) {
    while(num-->0) {
      //spawn an enemy at random coords
      let x = Math.round(Math.random()*Level.level.width);
      let y = Math.round(Math.random()*Level.level.height);
      ActorManager.make(10,x,y);
    }
  }
}
Game.modeObjects.push(SurvivalMode);
