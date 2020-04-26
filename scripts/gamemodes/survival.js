const GAME_SURVIVAL = GameManager.addMode(new GameMode({
	levels: [],
	start: function() {
		this.ready = false;
		this.score = 0;
		this.gameState = "none";
		this.addGui();
		G$("Hud").open();
		if (online&&Net.isClient()) return;
		if (EditorTools.levelCopy) this.setTestLevel();
		else {
			canvas.showLoadScreen();
			Resources.requestJSON("data/roadmap.json",function(data) {
				Game.levels = data;
				canvas.clearLoadScreen();
				Game.firstStep();
			});
		}
	},
	quit: function() {
		this.removeGui();
	},
	tick: function() {
		if (!this.ready) return;
		if (this.gameState=="wave") {
			if (Enemy.getAll().length==0) {
				this.gameState = "none";
				Timer.wait(60,function() {
					this.nextStep();
				},this);
			}
		}
	},
	onPause: function(paused) {
		if (this.deathEvent) return CANCEL;
		if (online) {
			if (View.focus<2) {
				G$("OnlineMenu").open();
				Player.preventLocalControls = true;
				Tap.ctrlEnabled = false;
			}
			else if (View.focus==2) {
				G$("OnlineMenu").close();
				Player.preventLocalControls = false;
				Tap.ctrlEnabled = true;
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
		if (!this.deathEvent&&!online) pauseGame(true);
	},
	onLevelLoad: function() {
		G$("DeathScreen").close();
		if (focused) pauseGame(false);
		if (online&&G$("OnlineMenu").visible) pauseGame(!paused);
		if (online&&Net.isClient()) return this.deathEvent = false, void(0);
		Player.addAll();
		this.ready = true;
		this.spawnStep();
	},
	onHurt: function(ent,attacker) {
		if (ent instanceof Player && attacker instanceof Player) return CANCEL;
		if (ent instanceof Enemy && attacker instanceof Player) {
			if (attacker.getHitCount()>1) this.addScore(1);
		}
	},
	onDeath: function(ent,attacker) {
		if (ent instanceof Enemy&&attacker instanceof Player) {
			this.addScore(ent.maxHealth);
			if (!ent.target) {
				this.addScore(1);
				this.stealthKills++;
			}
		}
		else if (ent instanceof Player&&!Player.hasLives(ent.slot)) {
			if (Player.getAll().length<=1) {
				this.deathEvent = true;
				Net.send({survivalDeathEvent: true});
				wait(60,function() {
					G$("DeathScreen").open();
				});
			}
		}
	},
	onCollect: function(player,item) {
		if (item instanceof PlusHeart) {
			if (player.health==player.maxHealth) {
				let bonus = item.hp*2;
				if (item instanceof MaxHeart) bonus = player.health;
				this.addScore(bonus);
			}
		}
	},

	onNetConnection: function(conn,role) {
		if (role=="host") {
			let slot = conn.clientID+1;
			if (isNaN(Player.getLives(slot))) Player.grantLives(slot);
			Player.add(slot);
			Net.send({survivalScore: this.score});
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
		if (role=="client") {
			if (data.survivalScore!=void(0)) G$("ScoreText").setVar(data.survivalScore);
			if (data.survivalDeathEvent) {
				this.deathEvent = true;
				wait(60,function() {
					G$("DeathScreen").open();
				});
			}
			if (data.survivalAlert) gameAlert(data.survivalAlert,120);
		}
	},

	getLevel: function(levelNum) {
		if (levelNum==void(0)) levelNum = this.level;
		let level = this.levels[levelNum];
		if (level) return level;
	},
	getWave: function(waveNum,levelNum) {
		if (waveNum==void(0)) waveNum = this.wave;
		if (levelNum==void(0)) levelNum = this.level;
		let level = this.getLevel(levelNum);
		if (level&&level.waves) {
			let wave = level.waves[waveNum];
			if (wave) return wave;
		}
	},
	waveStepCount: function(waveNum,levelNum) {
		let wave = this.getWave(waveNum,levelNum);
		if (wave) return wave.length;
	},
	levelWaveCount: function(levelNum) {
		let level = this.getLevel(levelNum);
		if (level&&level.waves) return level.waves.length;
	},
	levelBonusThreshold: function(levelNum) {
		let level = this.getLevel(levelNum);
		if (level) {
			if (level.bonusThresh==void(0)) return 0;
			else return level.bonusThresh;
		}
	},

	addScore: function(amt) {
		this.score += amt;
		this.scoreDelta += amt;
		G$("ScoreText").setVar(this.score);
		if (online&&Net.isHost()) Net.send({survivalScore: this.score});
	},
	spawnStep: function() {
		let wave = this.getWave();
		if (wave) {
			let step = wave[this.step];
			if (step) for (var i in step) {
				let enem = ActorManager.make(...step[i]);
				let zone = SpawnZone.weightedSelection();
				if (zone) zone.enterAsSpawn(enem);
				else {
					let pt = Level.randPt();
					enem.x = enem.spawnX = pt.x;
					enem.y = enem.spawnY = pt.y;
				}
			}
			this.gameState = "wave";
		}
		else if (this.level!=0) this.firstStep();
	},

	firstStep: function() {
		this.step = this.wave = this.level = 0;
		this.surplusWave = 0;
		this.addScore(-this.score);
		this.scoreDelta = 0;
		this.stealthKills = 0;
		this.deathEvent = false;
		Player.setAllLives(5);
		let level = this.getLevel();
		if (level) {
			if (level.filename) Level.loadLevel(level.filename);
			else if (level.isEditorCopy) Level.load(JSON.stringify(EditorTools.levelCopy),false);
			else Level.clearLevel();
		}
	},
	nextStep: function() {
		this.gameState = "none";
		this.stealthBonus(this.step);
		this.step++;
		if (this.step>=this.waveStepCount()) {
			this.wave++;
			this.step = 0;
			if (this.wave>=this.levelWaveCount()) {
				this.level++;
				this.wave = 0;
				if (this.level>=this.levels.length) {
					this.level--;
					this.surplusWave += this.levelWaveCount();
					this.waveReward();
				}
				else this.levelReward();
			}
			else this.waveReward();
		}
		else this.spawnStep();
	},

	findOpenRewardSpot: function() {
		let spots = Marker.findAll("survival_reward");
		for (var i in spots) {
			let spot = spots[i];
			if (!spot.rewarded || !Collectable.has(spot.rewarded)) return spot;
		}
		return new Point(Level.level.width/2,Level.level.height/2);
	},
	waveReward: function() {
		gameAlert("Wave "+(this.wave+this.surplusWave)+" complete!",120);
		if (online) Net.send({survivalAlert: "Wave "+(this.wave+this.surplusWave)+" complete!"})
		let spot = this.findOpenRewardSpot();
		spot.rewarded = PlusHeart.create(spot.x,spot.y,1);
		Timer.wait(120,function() {
			Game.spawnStep();
		});
	},
	levelReward: function() {
		gameAlert("Level complete!",120);
		if (online) Net.send({survivalAlert: "Level Complete!"});
		let spot = Marker.find("survival_reward_final") || this.findOpenRewardSpot();
		if (this.scoreDelta>this.levelBonusThreshold()) GoldenHeart.create(spot.x,spot.y);
		else MaxHeart.create(spot.x,spot.y);
		this.scoreDelta = 0;
		let exit = Marker.find("survival_exit_door") || Player.getSlot(0) || P(0,0);
		Door.create(exit.x,exit.y,99,99,true,false,Game.getLevel().filename);
	},
	stealthBonus: function() {
		let kills = this.stealthKills;
		this.stealthKills = 0;

		let wave = this.getWave();
		if (!wave) return;
		let lineup = wave[this.lineup];
		if (!lineup) return;

		let total = lineup.length;
		if (total>3 && kills>total/3) {
			let pt = Level.randPt();
			let heart = PlusHeart.create(pt.x,pt.y,1);
			let zone = SpawnZone.weightedSelection();
			if (zone) zone.enterAsSpawn(heart);
		}
	},

	setTestLevel: function() {
		this.level = this.wave = this.lineup = 0;
		this.score = 0;
		this.levels = [
			{
				filename: "__EDITOR_TEST__",
				isEditorCopy: true,
				waves: [
					[ [[11]] ],
					[ [[11]], [[11],[11]] ],
					[ [[11],[11]], [[11],[10]] ],
					[ [[11],[10],[10]], [[10]] ]
				],
				bonusThresh: 1
			},
			{
				filename: "__EDITOR_TEST__",
				isEditorCopy: true,
				waves: [
					[
						[[10]], [[10],[10]], [[10],[10],[10]], [[10],[10],[10],[10],[10]],
						[[10],[10],[10],[10],[10],[10],[10]],
						[[10],[10],[10],[10],[10],[10],[10],[10],[10],[10]]
					]
				],
				reward: []
			}
		];
		this.firstStep();
	},

	addGui: function() {
		buildMainHud();
		TextElement.create("ScoreText","Hud",WIDTH/2,55,fontHudScore,"Score: {{var}}",WIDTH,CENTER).setVar(0).show();
		buildPauseMenu();
		Button.create("RetryButton","PauseMenu",WIDTH/2-150,HEIGHT-120,300,40,"Retry").setOnClick(function() {
			gameConfirm("Are you sure you want to restart?",function(response) {
				if (response) Game.firstStep();
			});
		}).show().up("CtrlSettingsButton");
		Button.funnelTo("RetryButton","down",["CtrlSettingsButton","VolumeButton","FSToggle","PauseClose"]);
		Button.pathVert(["RetryButton","QuitGame"]);
		buildOnlineMenu();
		if (Net.isHost()) {
			Button.create("RetryButtonOnline","OnlineMenu",WIDTH/2+150/2+10,10,150,50,"Retry").setOnClick(function() {
				gameConfirm("Are you sure you want to restart?",function(response) {
					if (response) Game.firstStep();
				});
			}).show().setAsStart();
			Button.pathHor(["OnlineLeave","RetryButtonOnline","OnlineClose"]);
		}
		buildControllerSettingsMenu();
		buildMapperView();
		buildMapperTool();
		buildHelpPage();
		buildDevToolsHud();
		View.create("DeathScreen",0,0,WIDTH,HEIGHT,"tint","black").setOnShow(function() {
			G$("DeathText").setVar(G$("ScoreText").var);
		});
		TextElement.create("DeathText","DeathScreen",WIDTH/2,HEIGHT/4,fontPaused,"Score: {{var}}",WIDTH,CENTER).setVar(0).show();
		if (!online||Net.isHost()) {
			Button.create("PlayAgain","DeathScreen",WIDTH/2-150,HEIGHT-120,300,40,"Play Again").setOnClick(function() {
				this.view.close();
				Game.firstStep();
			}).show().setAsStart();
			Button.create("DeathScreenQuit","DeathScreen",WIDTH/2-150,HEIGHT-60,300,40,"Back to Title").setOnClick(G$("QuitGame").onClickFunction).show();
			Button.pathVert(["PlayAgain","DeathScreenQuit"]);
		}
		else {
			Button.create("DeathScreenDisconnect","DeathScreen",WIDTH/2-150,HEIGHT-60,300,40,"Disconnect").setOnClick(G$("OnlineLeave").onClickFunction).setImage("GUI/Button_Red.png").show().setAsStart();
		}
	},
	removeGui: function() {
		G$("Hud").remove();
		G$("PauseMenu").remove();
		G$("OnlineMenu").remove();
		G$("CtrlSettingsView").remove();
		G$("MapperView").remove();
		G$("MapperTool").remove();
		G$("HelpView").remove();
		G$("DevTools").remove();
		G$("DeathScreen").remove();
	}
}));
