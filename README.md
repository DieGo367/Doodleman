# Doodleman
A JavaScript browser game hosted on Google Cloud. It's an action-platformer starring a little stick guy with a sword. Current main gamemode is Survival in which you defeat incoming waves of evil paint-glob enemies.

This is a passion project done mostly for fun, but also has served as a way to practice my coding skills and learn things as I go.

[Play the game!](doodle-man.appspot.com)
## Screenshots
![Doodleman Title Screen](https://github.com/DieGo367/Doodleman/blob/master/screenshots/title.png)
![Survival Mode](https://github.com/DieGo367/Doodleman/blob/master/screenshots/survival_01.png)
![More Survival Mode](https://github.com/DieGo367/Doodleman/blob/master/screenshots/survival_02.png)
![Even more Survival Mode](https://github.com/DieGo367/Doodleman/blob/master/screenshots/survival_03.png)
![A basic Sandbox level](https://github.com/DieGo367/Doodleman/blob/master/screenshots/sandbox_01.png)
![A really cool spooky forest cemetery concept level. Art by my brother.](https://github.com/DieGo367/Doodleman/blob/master/screenshots/sandbox_02.png)
## Tech used
 - Pure JavaScript, no game-making libraries used.
 - jQuery for a few of the features that require an HTML element.
 - Python Flask webapp for serving all the files.
 - Google Cloud for hosting.
## Features
 - Two gamemodes
	 - Survival - Defeat incoming waves of enemies to progress to the next level.
	 - Sandbox - Just play around in a few test levels and concepts.
 - Multiplayer (2) for both modes. You can get extra help in Survival, or fight each other in Sandbox.
 - Fullscreen mode! Although the aspect ratio never changes.
 - Keyboard/Gamepad/Touch support
	 - Automatically switches depending on which input is used.
	 - Can remap controller inputs
	 - Assign which controllers/keys control which players.
	 - Touch support along with the fullscreen mode means this is basically a mobile game now too.
 - [Level Editor](doodle-man.appspot.com/edit)
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
Quick thanks to my brother for the art in the cemetery demo level and for finding loads of bugs.
Also shoutouts to anyone who has ever taught me code or done tutorials online.
