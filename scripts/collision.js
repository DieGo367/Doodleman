const Collision = {
  run: function() {
    PhysicsBox.callForAll("doGroundDrag");
  	PhysicsBox.callForAll("preCollision");

    //get loaded objects, and classsify them as either terrain or actors
    let loadedSectors = Sectors.getLoadedSectors();
    let objects = Level.classify(Sectors.getObjectListFromSectors(loadedSectors),true);

    //detect intersections only among actors
    let actorsOnly = this.detectIntersections(objects.actors,objects.actors);
    this.updateCollisionList(actorsOnly,false);
    this.collidePairs(false);

    //now collide actors with the terrain
  	let actorsWithTerrain = this.detectIntersections(objects.actors,objects.terrain);
    this.updateCollisionList(actorsWithTerrain,true);
    this.collidePairs(true);
  },
  detectIntersections: function(listA,listB) {
    var pairs = []; //intersecting pairs
    //find all intersecting pairs, then store temporarily
  	for (var i in listA) {
      for (var j in listB) {
  			if (listA[i]==listB[j]) continue;
  			if (listA[i].intersect(listB[j])) {
          //check if the pair is already in our list
  				let alreadyExists = false;
  				for (var k in pairs) {
            let p = pairs[k], a = [listA[i],listB[j]], b = [listB[j],listA[i]];
            if (compareList(p,a)||compareList(p,b)) alreadyExists = true;
          }
          //add the pair to our list if it isn't there already
  				if (!alreadyExists) pairs.push([listA[i],listB[j]]);
  			}
  		}
  	}
    return pairs;
  },
  determineBehavior: function(a,b) {
    let ac = a.collisionType, bc = b.collisionType;

    //HOLDING
    //objects ignore what their holding
		if ((a.held&&a.held==b)||(b.held&&b.held==a)) behavior = 0;
    //objects ignore what is holding them
		else if ((a.heldBy&&a.heldBy==b)||(b.heldBy&&b.heldBy==a)) behavior = 0;
    //objects being held ignore lines
		else if ((a.heldBy&&bc==C_LINE)||(b.heldBy&&ac==C_LINE)) behavior = 0;

    //NONE
    else if (ac==C_NONE||bc==C_NONE) behavior = 0;

    //LINES
    //line with no direction
    else if (ac==C_LINE&&a.direction==0) behavior = 0;
    else if (bc==C_LINE&&b.direction==0) behavior = 0;
    //box and a line
    else if (ac<C_INFINIMASS&&bc==C_LINE) behavior = 8;
		else if (bc<C_INFINIMASS&&ac==C_LINE) behavior = 9;
    //lines ignore each other
    else if (ac==C_LINE&&bc==C_LINE) behavior = 0;

    //BOXES
    //when an immovable object meets an immovable object
		else if (ac>=C_INFINIMASS&&bc>=C_INFINIMASS) behavior = 0;
    //infinimass overpowers
		else if (ac>=C_INFINIMASS) behavior = 1;
		else if (bc>=C_INFINIMASS) behavior = 2;
    //equal weight, so equal movement
		else if (ac==bc) behavior = 3;
    //higher weight pushes weaker weight
		else if (ac==C_SOLID||bc==C_SOLID) behavior = ac>bc?4:5;
		else if (ac==C_WEAK||bc==C_WEAK) behavior = ac>bc?4:5;
		else {
			//the only things left are pushables and entities
			if (ac==C_ENT) behavior = 6;
			else behavior = 7;
		}
		return behavior;
    /*behavior types
  		0: no reaction

      boxes:
  		1: a overpowers b
  		2: b overpowers a
  		3: equal movement
  		4: a pushes b
  		5: b pushes a
  			6: a and push-block b
  			7: b and push-block a

      lines:
			8: box a and line b
			9: box b and line a
  	*/
  },
  pairs: [],
  requests: [],
  findPair: function(a,b) {
    for (var i in this.pairs) {
      if (a==this.pairs[i].a) {
        if (b==this.pairs[i].b) return this.pairs[i];
      }
      else if (b==this.pairs[i].a) {
        if (a==this.pairs[i].b) return this.pairs[i];
      }
    }
    return "none";
  },
  addPair: function(a,b,behavior) {
    var pair = new CollisionPair(a,b,behavior);
    this.pairs.push(pair);
    return pair;
  },
  removePair: function(index) {
    this.pairs.splice(index,1);
  },
  findAllPairsWith: function(obj) {
    let list = [];
    for (var i in this.pairs) {
      if (obj==this.pairs[i].a||obj==this.pairs[i].b) list.push(this.pairs[i]);
    }
    return list;
  },
  removeAllPairsWith: function(box) {
    for (var i = 0; i < this.pairs.length; i++) {
      if (this.pairs[i].a==box||this.pairs[i].b==box) {
        this.removePair(i);
        i--;
      }
    }
  },
  collidePairs: function(withTerrain) {
    for (var i in this.pairs) {
      if (withTerrain==this.pairs[i].involvesTerrain()) this.pairs[i].collide();
    }
  },
  updateCollisionList: function(newList,checkTerrain) {
    //mark all previous collision pairs as old
    for (var i in this.pairs) {
      var pair = this.pairs[i];
      //ignore pairs where an object is unloaded
      if (pair.involvesUnloaded()) continue;
      // if we're checking terrain and the pair has terrain,
      // OR if we're not checking terrain and the pair has none, then mark it
      if (checkTerrain==pair.involvesTerrain()) pair.old = true;
    }

    //check our new list of collisions to see if any are new or have ended
    for (var i in newList) {
      var a = newList[i][0], b = newList[i][1];
      var result = this.findPair(a,b);
      if (result!="none") { //found a previous collision
        result.old = false;
      }
      else { //detected a NEW collision!
        this.addPair(a,b).refresh();
      }
    }

    //remove all old pairs that don't exist now
    var i = this.pairs.length;
    while (i-->0) {
      if (this.pairs[i].old) {
        this.removePair(i);
      }
    }
  },
  requestRefresh: function(a,b,ticks) {
    this.requests.push({a:a, b:b, tick:ticks});
  },
  checkRequests: function() {
    var list = [];
    for (var i in this.requests) {
      var r = this.requests[i];
      r.tick--;
      if (r.tick<=0) {
        var pair = this.findPair(r.a,r.b);
        if (pair!="none") pair.refresh();
        list.push(r);
      }
    }
    for (var i in list) {
      this.requests.splice(this.requests.indexOf(list[i]),1);
    }
  }
}
class CollisionPair {
  constructor(a,b,behavior) {
    this.a = a;
    this.b = b;
    this.behavior = behavior;
    this.old = false;
  }
  refresh() {
    this.behavior = Collision.determineBehavior(this.a,this.b);
  }
  involvesTerrain() { //returns true if one of the pair is a terrain obj
    if (this.a.isTerrain||this.b.isTerrain) return true;
    else return false;
  }
  involvesUnloaded() { //returns false if one of the pair is unloaded
    if (this.a.isLoaded&&this.b.isLoaded) return false;
    else return true;
  }
  collide() {
    //safety check, don't collide if they aren't intersecting
    if (!this.a.intersect(this.b)||this.behavior==0) return;
    //behaviors 1-7 lead to PhysicsBox, 8-9 lead to Line
    if (this.behavior>7) Line.collide(this.a,this.b,this.behavior);
    else PhysicsBox.collide(this.a,this.b,this.behavior);
  }
}

const Sectors = {
	grid: {},
	size: {width:320 , height:180 },
	update: function() {
		for (var i in this.grid) this.grid[i].updateLoadedState();
		Box.callForAll("setSectors");
    Line.callForAll("setSectors");
    for (var i in this.grid) if (this.grid[i].objects.length==0) delete this.grid[i];
	},
	removeFromSector: function(obj,sectorNameOrX,sectorY) {
		var sector = this.getSector(sectorNameOrX,sectorY);
		sector.objects.splice(sector.objects.indexOf(obj),1);
	},
	addToSector: function(obj,sectorX,sectorY) {
		var sector = this.getSector(sectorX,sectorY);
		sector.objects.push(obj);
		obj.sectors.push(sector.name);
	},
	checkIfInSector: function(obj,sectorNameOrX,sectorY) {
		var sector = this.getSector(sectorNameOrX,sectorY);
		if (obj.rightX()>=sector.leftX()&&obj.leftX()<=sector.rightX()) {
			if (obj.y>=sector.topY()&&obj.topY()<=sector.bottomY()) return true;
		}
		else return false;
	},
	getSector: function(sectorX,sectorY) {
		if (typeof sectorX=="string") var sectorName = sectorX;
		else if (typeof sectorX=="number"&&typeof sectorY=="number") var sectorName = sectorX+","+sectorY;
    else return {objects: []};
		var sector = this.grid[sectorName];
		if (!sector) sector = this.grid[sectorName] = new Sector(...sectorName.split(","));
		return sector;
	},
  getLoadedSectors: function() {
    var list = [];
    for (var i in this.grid) {
      if (this.grid[i].loaded) list.push(this.grid[i]);
    }
    return list;
  },
  getObjectListFromSectors: function(sectors) {
    var objectCollection = [];
    for (var i in sectors) {
      for (var j in sectors[i].objects) {
        var obj = sectors[i].objects[j];
        if (objectCollection.indexOf(obj)==-1) objectCollection.push(obj);
      }
    }
    return objectCollection;
  },
  getLoadedObjects: function() {
    return this.getObjectListFromSectors(this.getLoadedSectors());
  }
}
class Sector {
	constructor(sectorX,sectorY) {
		this.x = sectorX;
		this.y = sectorY;
		this.name = sectorX+","+sectorY;
		this.objects = [];
		this.loaded = true;
	}
	drawDebug() {
		c.strokeStyle = "orange";
		c.strokeRect(this.leftX(),this.topY(),Sectors.size.width,Sectors.size.height);
		c.font = "10px Consolas";
		c.strokeText(this.name,this.leftX(),this.topY()+10);
	}
	leftX() { return this.x*Sectors.size.width; }
	rightX() { return this.leftX()+Sectors.size.width; }
	topY() { return this.y*Sectors.size.height; }
	bottomY() { return this.topY()+Sectors.size.height; }
	updateLoadedState() {
		this.loaded = false;
    for (var i in this.objects) if (this.objects[i].alwaysLoaded) return this.loaded = true;
		if (this.rightX()>=Camera.leftPx()-Sectors.size.width&&this.leftX()<=Camera.rightPx()+Sectors.size.width) {
			if (this.bottomY()>=Camera.topPx()-Sectors.size.height&&this.topY()<=Camera.bottomPx()+Sectors.size.height) {
				this.loaded = true;
			}
		}
	}
}
