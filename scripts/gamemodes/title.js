const TitleMode = new GameMode();
GameManager.addMode(TitleMode);
TitleMode.start = function() {
  G$("Title").show();
  Level.loadLevel("Title.json");
};
TitleMode.quit = function() {
  G$("Title").hide();
}
