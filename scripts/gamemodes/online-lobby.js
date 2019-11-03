const GAME_ONLINELOBBY = GameManager.addMode(new GameMode({
	start: function() {
		Level.clearLevel();
		this.addGui();
		Tap.ctrlEnabled = false;
		Player.setAllLives(Infinity);
		Player.clearCtrlAssignments();
		multiplayer = true;
		online = true;
		Net.discoveryAlerts = true;
		if (!Net.started) Net.startup();
		try {
			Net.joinRoom(NET_INVITE,function() {},function(err) {
				gameAlert(err,120);
			});
		}
		catch {
			// no net invite was given
		}
	},
	quit: function() {
		this.removeGui();
		Net.discoveryAlerts = false;
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
	onNetFailure: function(role,clientID) {
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
			gameAlert("Guest "+(clientID+1)+" was disconnected",120);
		}
		else if (role=="client") {
			let roomView = G$("Room");
			if (roomView.visible) roomView.close();
			Tap.ctrlEnabled = false;
			gameAlert("Lost connection to host",120);
		}
	},
	addGui: function() {
		View.create("Online",0,0,WIDTH,HEIGHT,GUI_TINT,"yellow").open();
		TextElement.create("OnlineTitle","Online",WIDTH/2,30,fontMenuTitle,"Online Play",WIDTH,CENTER).show();
		Button.create("Host","Online",WIDTH/8,HEIGHT/2-20,WIDTH/4,40,"Create a Room").setOnClick(function() {
			G$("RoomCode").text = "Creating..."
			G$("Room").open();
			Net.createRoom(function(code) {
				G$("RoomCode").text = code;
				G$("LockRoom").show();
				Player.add(0);
				Tap.ctrlEnabled = true;
			},
			function(failure) {
				G$("Room").close();
				G$("LockRoom").hide();
				gameAlert(failure,120);
			});
		}).show().setAsStart();
		Button.create("Client","Online",WIDTH*5/8,HEIGHT/2-20,WIDTH/4,40,"Join a Room").setOnClick(function() {
			G$("Joining").open();
		}).show();
		if (!startedInFullScreen) Button.create("FSToggle","Online",WIDTH-60,10,50,50).setToggle(function() {
			this.on = !this.on;
			setFullScreen(this.on);
		},true)
		.setOnViewShown(function() {
			this.on = fullScreen;
		}).setIcon("GUI/Icons.png",2,0,42,4).show();
		else Button.create("FSToggle","Online",0,0,0,0);
		Button.pathHor(["Host","Client"]);
		Button.funnelTo("FSToggle","up",["Host","Client"]);

		View.create("Joining",0,0,WIDTH,HEIGHT,GUI_TINT,"yellow");
		TextElement.create("JoinTitle","Joining",WIDTH/2,30,fontMenuTitle,"Enter a Room Code",WIDTH,CENTER).show();
		TextInput.create("CodeInput","Joining",WIDTH*3/8,HEIGHT/2-20,WIDTH/4,40,"Room Code",null,"Room Code").setOnNewChar(function(char) {
			if (RegExp("[0-9]").test(char)) return char;
			else if (RegExp("[A-Za-z]").test(char)) {
				char = char.toUpperCase();
				if (RegExp("[ILOSZ]").test(char)) char = '';
				return char;
			}
			else return '';
		}).
		setOnInputChange(function(val) {
			this.val("");
			G$("RoomCode").text = "Joining...";
			G$("Room").open();
			Net.joinRoom(val,function() {
				G$("RoomCode").text = val;
				Tap.ctrlEnabled = true;
			},
			function(failure) {
				G$("Room").close();
				gameAlert(failure,120);
			});
		}).show().setAsStart();
		Button.create("CloseJoining","Joining",WIDTH*3/8,HEIGHT-45,WIDTH/4,40,"Back").setOnClick(function() {
			G$("Joining").close();
		}).setImage("GUI/Button_Red.png").show();
		Button.pathVert(["CodeInput","CloseJoining"]);
		
		View.create("Room",0,0,WIDTH,HEIGHT);
		TextElement.create("RoomCode","Room",WIDTH/2,50,fontHudScore,"...",WIDTH-200,CENTER).show();
		Button.create("LockRoom","Room",10,10,100,40,"Lock Room").setToggle(function() {
			Net.roomLock(true);
			this.text = "Unlock Room";
			this.toggleState = 1;
		},
		function() {
			Net.roomLock(false);
			this.text = "Lock Room";
			this.toggleState = 0;
		});
	},
	removeGui: function() {
		G$("Online").remove();
		G$("Hosting").remove();
		G$("Joining").remove();
	}
}));
