const SurvivalMode = new GameMode();
GameManager.addMode(SurvivalMode);
SurvivalMode.start = function() {
  this.ready = false;
  if (!this.built) buildSurvivalGui();
  G$("Hud").show();
  Level.loadLevel("Dungeon-0.json");
};
SurvivalMode.quit = function() {
  G$("ScoreText").hide();
  G$("Hud").hide();
};
SurvivalMode.tick = function() {
  if (!this.ready) return;

  if (PaintMinion.getAll().length==0) {
    this.wave++;
    this.spawnWave(this.wave);
  }
};
SurvivalMode.onLevelLoad = function() {
  this.wave = 0;
  this.score = 0;
  G$("ScoreText").show().text = "Score: 0";
  addPlayer(0);
  if (multiplayer) addPlayer(1);
  this.ready = true;
};
SurvivalMode.onDeath = function(ent,attacker) {
  if (ent instanceof Enemy&&attacker instanceof Player) this.addScore(ent.maxHealth);
};

SurvivalMode.addScore = function(amt) {
  this.score += amt;
  G$("ScoreText").text = "Score: "+this.score;
};
SurvivalMode.spawnWave = function(num) {
  while(num-->0) {
    //spawn an enemy at random coords
    let x = Math.round(Math.random()*Level.level.width);
    let y = Math.round(Math.random()*Level.level.height);
    ActorManager.make(10,x,y);
  }
};

function buildSurvivalGui() {
  TextElement.create("ScoreText","Hud",hudWidth/2,55,fontHudScore,"Score: 0",hudWidth,CENTER);
  SurvivalMode.built = true;
}
