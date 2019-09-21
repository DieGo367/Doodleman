const GAME_ONLINELOBBY = GameManager.addMode(new GameMode({
	start: function() {
		Level.clearLevel();
		this.addGui();
		Player.setAllLives(Infinity);
		Player.clearCtrlAssignments();
		multiplayer = true;
		online = true;
		Net.discoveryAlerts = true;
	},
	quit: function() {
		this.removeGui();
		Net.discoveryAlerts = false;
	},
	tick: function() {
		let code = G$("RoomCode");
		if (code&&code.isVisible()) code.text = Net.room;
	},
	onPause: function() {
		return CANCEL;
	},
	onNetConnection: function(conn,role) {
		if (role=="host") {
			Player.grantLives(conn.clientID+1);
			Player.add(conn.clientID+1);
		}
	},
	onNetFailure: function(role) {
		if (role=="host") {
			let allP = Player.getAll();
			for (var i in allP) {
				let p = allP[i];
				if (p.slot==0) continue;
				if (!Player.ctrlInSlot(p.slot)) {
					Player.setLives(p.slot,0);
					p.remove();
				}
			}
		}
	},
	addGui: function() {
		View.create("Online",0,0,WIDTH,HEIGHT,GUI_TINT,"yellow").open();
		Button.create("Host","Online",10,10,100,40,"Create a Room").setOnClick(function() {
			G$("Hosting").open();
			Net.createRoom();
			Player.add(0);
		}).show();
		Button.create("Client","Online",120,10,100,40,"Join a Room").setOnClick(function() {
			G$("Joining").open();
		}).show();

		View.create("Hosting",0,0,WIDTH,HEIGHT,GUI_TINT,"yellow");
		TextElement.create("RoomCode","Hosting",40,100,fontHudScore,"...").show();
		Button.create("LockRoom","Hosting",10,10,100,40,"Lock Room").setOnClick(function() {
			Net.lockRoom();
			this.remove();
		}).show();

		View.create("Joining",0,0,WIDTH,HEIGHT,GUI_TINT,"yellow");
		TextInput.create("Code","Joining",10,10,100,40,"#Room Code",null,"Room Code").setOnInputChange(function(val) {
			Net.joinRoom(val);
		}).show();
	},
	removeGui: function() {
		G$("Online").remove();
		G$("Hosting").remove();
		G$("Joining").remove();
	}
}));
