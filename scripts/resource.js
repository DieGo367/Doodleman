const ResourceManager = {
  saved: {}, groupStatuses: {},
  request: function(url,onComplete) {
    if (typeof url!="string") return console.warn("Invalid request url");
    var data = this.saved[url];
    if (data!=void(0)) {
      if (typeof onComplete=="function") setTimeout(function() {
        onComplete(data);
      },0);
    }
    else $.get(url,function(data) {
      ResourceManager.store(this.url,data);
      if (typeof onComplete=="function") onComplete(data);
    });
  },
  requestGroup: function(groupName,forEach,onComplete) {
    $.get(groupName+"/_list_.json",function(data) {
      try {
        var list = JSON.parse(data);
      } catch(err) {
        return console.warn(err);
      }
      ResourceManager.store(this.url,list);
      if (!(list instanceof Array)) return console.warn(groupName + " list wasn't a proper array");
      ResourceManager.setStatus(groupName,list.length);
      for (var i in list) {
        if (typeof list[i]!="string") continue;
        $.get(groupName+"/"+list[i],function(item) {
          ResourceManager.store(this.url,item);
          if (typeof forEach=="function") forEach(item,this.url.split("/")[1]);
          var status = ResourceManager.checkStatus(groupName);
          if (status==1&&typeof onComplete=="function") onComplete(list,groupName);
          ResourceManager.setStatus(groupName,-1);
        });
      }
    });
    this.setStatus(groupName,1);
  },
  store: function(key,data) {
    this.saved[key] = data;
  },
  setStatus: function(groupName,amount) {
    if (amount<0) this.groupStatuses[groupName] += amount;
    else this.groupStatuses[groupName] = amount;
  },
  checkStatus: function(groupName) {
    return this.groupStatuses[groupName];
  },
  pendingRequests: function() {
    var pending = 0;
    for (var i in this.groupStatuses) {
      if (this.groupStatuses[i]>0) pending++;
    }
    return pending;
  }
}
