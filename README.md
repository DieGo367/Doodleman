# Doodleman
A JavaScript browser game hosted on Google Cloud. It's an action-platformer starring a little stick guy with a sword. Current main gamemode is Survival in which you defeat incoming waves of evil paint-glob enemies.

[Play the game!](https://doodle-man.appspot.com)
## Screenshots
![Doodleman Title Screen](https://github.com/DieGo367/Doodleman/blob/master/screenshots/title.png)
![Survival Mode](https://github.com/DieGo367/Doodleman/blob/master/screenshots/survival_01.png)
![More Survival Mode](https://github.com/DieGo367/Doodleman/blob/master/screenshots/survival_02.png)
![Even more Survival Mode](https://github.com/DieGo367/Doodleman/blob/master/screenshots/survival_03.png)
![A basic Sandbox level](https://github.com/DieGo367/Doodleman/blob/master/screenshots/sandbox_01.png)
![A really cool spooky forest cemetery concept level. Art by my brother.](https://github.com/DieGo367/Doodleman/blob/master/screenshots/sandbox_02.png)
## Tech used
 - Pure JavaScript, no game-making libraries used.
 - Python Flask webapp for serving all the files.
 - Google Cloud for hosting.
 - RTC Peer Connections for online multiplayer
 - Firestore database for negotiating multiplayer connections
## Features
 - Two gamemodes
	 - Survival - Defeat incoming waves of enemies to progress to the next level.
	 - Sandbox - Just play around in a few test levels and concepts.
 - Multiplayer (2) for both modes. You can get extra help in Survival, or fight each other in Sandbox.
 - Online multiplayer mode with shareable lobby codes. Supports more than 2 players, loading custom levels, and playing both gamemodes.
 - Fullscreen mode! Although the aspect ratio never changes.
 - Keyboard/Gamepad/Touch support
	 - Automatically switches depending on which input is used.
	 - Can remap controller inputs
	 - Assign which controllers/keys control which players.
	 - Touch support along with the fullscreen mode means this is basically a mobile game now too.
 - [Level Editor](https://doodle-man.appspot.com/edit)
	 - Draw terrain using boxes or lines.
	 - Import images to use as backgrounds
	 - Use any of the included Actors
	 - Test button in menu to try it out in Sandbox mode. Quit to continue editing.
	 - Can import/export levels in JSON format.
 - Controls and playstyle (Keyboard)
	 - WASD to move left/right, duck, and jump.
	 - G to attack
	 - E to look up / enter doors.
	 - R or P to pause.
	 - Hold down attack and release for a charge attack.
	 - More moves listed in the in-game help page
 - (debug mode - press backslash)
## Credits
- [simple-peer](https://github.com/feross/simple-peer/tree/master) WebRTC library by feross.
- [lz-string](https://github.com/pieroxy/lz-string?tab=readme-ov-file) LZ compression library by pieroxy.
- [FLARE145](https://flare145.com/): Art in the Cemetery demo level, and playtesting.
