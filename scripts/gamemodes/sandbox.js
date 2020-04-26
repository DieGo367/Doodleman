const GAME_SANDBOX = GameManager.addMode(new GameMode({
	lifeCount: 5,
	start: function() {
		this.addGui();
		G$("Hud").open();
		this.onLevelLoad();
	},
	quit: function() {
		this.removeGui();
	},
	onPause: function(paused) {
		if (online) {
			if (View.focus<2) {
				Player.preventLocalControls = true;
				Tap.ctrlEnabled = false;
				G$("OnlineMenu").open();
			}
			else if (View.focus==2) {
				Player.preventLocalControls = false;
				Tap.ctrlEnabled = true;
				G$("OnlineMenu").close();
			}
			return CANCEL;
		}
		if (paused) {
			G$("PauseMenu").open();
			G$("DevTools").hide();
			Tap.ctrlEnabled = false;
		}
		else {
			if (View.focus>2) return CANCEL;
			G$("PauseMenu").close();
			if (devEnabled) G$("DevTools").show();
			Tap.ctrlEnabled = true;
		}
	},
	onBlur: function() {
		if (!online) pauseGame(true);
	},
	onLevelLoad: function() {
		if (online&&G$("OnlineMenu").visible) pauseGame(!paused);
		if (Net.isClient()) return;
		Player.setAllLives(this.lifeCount);
		Player.addAll();
		let ls = G$("LevelSelectView");
		if (ls.layer) ls.close();
		if (focused) pauseGame(false);
		if (online&&G$("OnlineMenu").visible) pauseGame(!paused);
	},
	onDeath: function(ent,attacker) {
		if (ent instanceof Player && !Player.hasLives(ent.slot)) {
			let slot = ent.slot;
			if (!multiplayer||online) { // single player or online
				if (slot==0) G$("RespawnButton").show();
				else if (Net.isHost()) {
					let target = Net.clients[slot-1];
					if (target) Net.send({sandboxRespawnBtn: true},target);
				}
			}
			else {
				let buttons = ["AddP1Button","AddP2Button"];
				G$(buttons[slot]).show();
			}
		}
	},
	onNetConnection: function(conn,role) {
		if (role=="host") {
			Player.grantLives(conn.clientID+1);
			Player.add(conn.clientID+1);
		}
	},
	onNetFailure: function(role,clientID) {
		if (role=="host") {
			Player.removeUncontrolled(0);
			gameAlert("Guest "+(clientID+1)+" was disconnected",120);
		}
		else if (role=="client") {
			Game.mode = GAME_ONLINELOBBY;
			gameAlert("Lost connection to host",120);
		}
	},
	onNetData: function(data,role) {
		if (role=="host") {
			if (data.sandboxRespawnRequest!=void(0)) {
				let slot = data.sandboxRespawnRequest;
				if (!Player.getSlot(slot)) {
					Player.grantLives(slot);
					Player.add(slot);
				}
				let target = Net.clients[slot-1];
				if (target) Net.send({sandboxRespawnBtn: false},target);
			}
		}
		else if (role=="client") {
			if (data.sandboxRespawnBtn!=void(0)) {
				if (data.sandboxRespawnBtn) G$("RespawnButton").show();
				else G$("RespawnButton").hide();
			}
		}
	},
	addGui: function() {
		buildMainHud();
		Button.create("RespawnButton","Hud",WIDTH/2-50,50,100,40,"Respawn").setOnClick(function() {
			if (online&&Net.isClient()) {
				Net.send({sandboxRespawnRequest: Net.clientID+1});
			}
			else {
				Player.grantLives(0);
				Player.add(0);
				this.hide();
			}
		});
		Button.create("AddP1Button","Hud",WIDTH/2-110,50,100,40,"P1 Start").setOnClick(function() {
			Player.grantLives(0);
			Player.add(0);
			this.hide();
		});
		Button.create("AddP2Button","Hud",WIDTH/2+10,50,100,40,"P2 Start").setOnClick(function() {
			Player.grantLives(1);
			Player.add(1);
			this.hide();
		});

		buildPauseMenu();
		Button.create("LevelSelectButton","PauseMenu",WIDTH/2-150,HEIGHT-120,300,40,"Level Select").setOnClick(function() {
			G$("LevelSelectView").open();
		}).show().setPressDelay(1).up("CtrlSettingsButton");
		Button.funnelTo("LevelSelectButton","down",["CtrlSettingsButton","VolumeButton","FSToggle","PauseClose"]);
		Button.pathVert(["LevelSelectButton","QuitGame"]);

		buildOnlineMenu();
		if (Net.isHost()) {
			Button.create("LevelSelectButtonOnline","OnlineMenu",WIDTH/2+150/2+10,10,150,50,"Level Select").setOnClick(function() {
				G$("LevelSelectView").open();
			}).show().setAsStart();
			Button.pathHor(["OnlineLeave","LevelSelectButtonOnline","OnlineClose"]);
		}

		View.create("LevelSelectView",0,0,WIDTH,HEIGHT,"tint","black");
		TextElement.create("LSText","LevelSelectView",WIDTH/2,30,fontMenuTitle,"Select a level",WIDTH,CENTER).show();
		Button.create("LSClose","LevelSelectView",WIDTH-60,10,50,50).setOnClick(function() {
			G$("LevelSelectView").close();
		}).setIcon("GUI/Icons.png",3,0,42,4).setImage("GUI/Button_Red.png").show();
		Resources.request("data/sandbox_levels.json", function(data) {
			let levels = JSON.parse(data);
			let grid = [], rightSide = [];
			let i = 0, length = 0;
			for (var name in levels) length++;
			for (var name in levels) {
				let filename = levels[name];
				let y = Math.floor(i/2);
				let x = i%2;
				let b = Button.create("LSLevel"+i,"LevelSelectView",20+220*x,50+y*60,200,40,name).setOnClick(function() {
					Level.loadLevel(this.levelFile);
				}).show();
				b.levelFile = filename;
				grid[y] = grid[y] || [];
				grid[y][x] = b.name;
				if (x==1||i==length-1) rightSide.push(b.name);
				if (x==0&&y==0) b.setAsStart();
				i++;
			}
			Button.pathGrid(grid);
			Button.funnelTo("LSFileButton","right",rightSide);
		});
		Button.create("LSFileButton","LevelSelectView",WIDTH-170,HEIGHT-60,150,40,"Load From File").setOnClick(Level.openLocalFile,true).show().setPressDelay(1);
		Button.pathVert(["LSClose","LSFileButton"]);

		buildControllerSettingsMenu();
		buildMapperView();
		buildMapperTool();
		buildHelpPage();
		buildDevToolsHud();
	},
	removeGui: function() {
		G$("Hud").remove();
		G$("PauseMenu").remove();
		G$("OnlineMenu").remove();
		G$("LevelSelectView").remove();
		G$("CtrlSettingsView").remove();
		G$("MapperView").remove();
		G$("MapperTool").remove();
		G$("HelpView").remove();
		G$("DevTools").remove();
	}
}));
