const GAME_ONLINELOBBY = GameManager.addMode(new GameMode({
  start: function() {
    Net.setup();
    Level.clearLevel();
  },
  onNetConnection: function(peerId) {
    if (netInvite) {
      Net.connect(netInvite);
    }
    else {
      let inviteURL = "http://"+window.location.href.split("/")[2]+"/join?id="+peerId;
      console.log(inviteURL);
      View.create("OHUD",0,0,0,WIDTH,HEIGHT,GUI_TINT,"yellow").show();
      Button.create("copy","OHUD",10,10,100,40,"Copy").setOnClick(function() {
        $("#clipboard").val(inviteURL).select();
  			document.execCommand("copy");
  			gameAlert("Invite link copied to clipboard.",120);
      }).show();
      Player.add(0);
    }
  },
  onNetFailure: function() {
    this.quit();
  },
  quit: function() {
    try {
      G$("OHUD").remove();
    }
    catch(e) {

    }
    Net.cleanup();
  }
}));
