const GAME_ONLINELOBBY = GameManager.addMode(new GameMode({
	start: function() {
		Level.loadLevel("Online-Menu.json");
		this.addGui();
		Tap.ctrlEnabled = false;
		Player.setAllLives(Infinity);
		Player.clearCtrlAssignments();
		multiplayer = true;
		online = true;
		Net.discoveryAlerts = true;
		if (!Net.started) Net.startup();
		if (Net.room) { // if aready in a room
			G$("RoomCode").text = Net.room;
			G$("Room").open();
			Tap.ctrlEnabled = true;
			if (Net.isHost()) {
				Level.loadLevel("Online-Lobby.json",function() {
					G$("RoomHoster").opensub();
					Player.grantLives(0);
					Player.add(0);
					for (var i = 0; i < Net.clients.length; i++) {
						let client = Net.clients[i];
						if (client) {
							Player.assignCtrl(client.clientID+1,WEBIN,client.webInputID);
							Player.add(client.clientID+1);
						}
					}
				});
			}
		}
		else try { // if not in a room, check for a net invite
			if (!this.acceptedInvite) {
				G$("RoomCode").text = "Joining...";
				G$("Room").open();
				Net.joinRoom(NET_INVITE,function() {
					G$("RoomCode").text = NET_INVITE;
					Tap.ctrlEnabled = true;
				},
				function(err) {
					G$("Room").close();
					gameAlert(err,120);
				});
				this.acceptedInvite = true;
			}
		}
		catch(_) { // no net invite was given
			G$("Room").close();
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
	onNetDisconnect: function(role,clientID) {
		if (role=="host") {
			Player.removeUncontrolled(0);
			gameAlert("Guest "+(clientID+1)+" left the game.",120);
		}
		else if (role=="client") {
			Level.loadLevel("Online-Menu.json",function() {
				let roomView = G$("Room");
				if (roomView.visible) roomView.close();
				Tap.ctrlEnabled = false;
				gameAlert("The host closed the room.",120);
			});
		}
	},
	onNetFailure: function(role,clientID) {
		if (role=="host") {
			Player.removeUncontrolled(0);
			gameAlert("Guest "+(clientID+1)+" was disconnected",120);
		}
		else if (role=="client") {
			Level.loadLevel("Online-Menu.json",function() {
				let roomView = G$("Room");
				if (roomView.visible) roomView.close();
				Tap.ctrlEnabled = false;
				gameAlert("Lost connection to host",120);
			});
		}
	},
	addGui: function() {
		View.create("Online",0,0,WIDTH,HEIGHT,GUI_TINT,"yellow").open();
		TextElement.create("OnlineTitle","Online",WIDTH/2,30,fontMenuTitle,"Online Play",WIDTH,CENTER).show();
		Button.create("Host","Online",WIDTH/8,HEIGHT/2-20,WIDTH/4,40,"Create a Room").setOnClick(function() {
			G$("RoomCode").text = "Creating..."
			G$("Room").open();
			Net.createRoom(function(code) {
				Level.loadLevel("Online-Lobby.json",function() {
					G$("RoomCode").text = code;
					G$("RoomHoster").opensub();
					Player.grantLives(0);
					Player.add(0);
					Tap.ctrlEnabled = true;
				});
			},
			function(failure) {
				G$("Room").close();
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
		TextInput.create("CodeInput","Joining",WIDTH*3/8,HEIGHT/2-20,WIDTH/4,40,"Room Code",null,"Room Code","[0-9A-Za-z]{1,4}").setOnNewChar(function(char) {
			if (char.match("[0-9]")) return char;
			else if (char.match("[A-Za-z]")) {
				char = char.toUpperCase();
				if (char.match(/[IL]/)) char = '1';
				else if (char=='O') char = '0';
				else if (char=='S') char = '5';
				else if (char=='Z') char = '2';
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

		View.create("RoomHoster",0,0,WIDTH,HEIGHT);
		Button.create("LockRoom","RoomHoster",WIDTH-260,10,120,40,"Lock Room").setToggle(function() {
			Net.roomLock(true);
			this.text = "Unlock Room";
			this.toggleState = 1;
		},
		function() {
			Net.roomLock(false);
			this.text = "Lock Room";
			this.toggleState = 0;
		}).show();
		Button.create("CloseRoom","RoomHoster",WIDTH-130,10,120,40,"Close Room").setOnClick(function() {
			Player.preventLocalControls = true;
			gameConfirm("Are you sure you want to close this room?",function(confirmed) {
				Player.preventLocalControls = false;
				if (confirmed) {
					Net.closeRoom();
					G$("Room").close();
					Player.killAll();
					Level.loadLevel("Online-Menu.json");
				}
			});
		}).setImage("GUI/Button_Red.png").show();
		Button.create("StartGame","RoomHoster",10,10,250,40,"Start Game").setOnClick(function() {
			Player.preventLocalControls = true;
			G$("GamemodeSelect").open();
		}).show();

		View.create("GamemodeSelect",0,0,WIDTH,HEIGHT);
		TextElement.create("GamemodeTitle","GamemodeSelect",WIDTH/2,30,fontMenuTitle,"Choose a Game Mode",WIDTH,CENTER).show();
		Button.create("GamemodeSurvival","GamemodeSelect",WIDTH/2-100,HEIGHT/2-80,200,60,"Survival").setOnClick(function() {
			Player.preventLocalControls = false;
			Game.mode = GAME_SURVIVAL;
		}).show().setAsStart();
		Button.create("GamemodeSandbox","GamemodeSelect",WIDTH/2-100,HEIGHT/2+0,200,60,"Sandbox").setOnClick(function() {
			Player.preventLocalControls = false;
			Game.mode = GAME_SANDBOX;
		}).show();
		Button.create("GamemodeCancel","GamemodeSelect",WIDTH/2-100,HEIGHT/2+120,200,40,"Back").setOnClick(function() {
			Player.preventLocalControls = false;
			this.view.close();
		}).setImage("GUI/Button_Red.png").show();

		Button.pathVert(["GamemodeSurvival","GamemodeSandbox","GamemodeCancel"]);
	},
	removeGui: function() {
		G$("Online").remove();
		G$("Joining").remove();
		G$("Room").remove();
		G$("RoomHoster").remove();
		G$("GamemodeSelect").remove();
	}
}));
