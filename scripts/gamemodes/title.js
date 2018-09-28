const TitleMode = new GameMode();
GameManager.addMode(TitleMode);
TitleMode.start = function() {
  this.addGui();
  Level.loadLevel("Title.json");
};
TitleMode.quit = function() {
  this.removeGui();
};
TitleMode.addGui = function() {
  View.create("Title",0,0,0,hudWidth,hudHeight).show();
	TextElement.create("TitleLogo","Title",hudWidth/2,hudHeight*11/36,fontLogo,"Doodleman",hudWidth,CENTER).show();
	TextElement.create("TitleYear","Title",10,hudHeight-10,fontCredit,"\u00A92018 DieGo",hudWidth,LEFT).show();

	Button.create("TitleMode:Survival","Title",hudWidth/2-100,hudHeight/2-30,200,60,"Survival").setOnClick(function() {
		this.view.hide();
		Game.mode = GAME_SURVIVAL;
	}).show();
	Button.create("TitleMode:Sandbox","Title",hudWidth/2-100,hudHeight/2+50,200,60,"Sandbox").setOnClick(function() {
		this.view.hide();
		Game.mode = GAME_SANDBOX;
	}).show();
};
TitleMode.removeGui = function() {
  G$("Title").remove();
};
