const ResourceManager = {
  saved: {}, groupStatuses: {},
  request: function(url,onComplete,onFail) {
    if (typeof url!="string") return console.warn("Invalid request url");
    var data = this.saved[url];
    if (data!=void(0)) {
      if (typeof onComplete=="function") setTimeout(function() {
        onComplete(data);
      },0);
    }
    else try {
      $.ajax({
        url: url,
        success: function(data) {
          if (typeof data=="object") data = JSON.stringify(data);
          ResourceManager.store(this.url,data);
          if (typeof onComplete=="function") onComplete(data);
        },
        error: function(e,type) {
          if (typeof onFail == "function") onFail(type);
        }
      });
    }
    catch(e) {
    }
  },
  requestGroup: function(groupName,forEach,onComplete) {
    $.get(groupName+"/_list_.json",function(list) {
      try {
        if (typeof list != "object") list = JSON.parse(list);
      } catch(err) {
        return console.warn(err);
      }
      ResourceManager.store(this.url,list);
      if (!(list instanceof Array)) return console.warn(groupName + " list wasn't a proper array");
      ResourceManager.setStatus(groupName,list.length);
      for (var i in list) {
        if (typeof list[i]!="string") continue;
        $.get(groupName+"/"+list[i],function(item) {
          if (typeof item=="object") item = JSON.stringify(item);
          ResourceManager.store(this.url,item);
          if (typeof forEach=="function") forEach(item,this.url.split("/").pop());
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
