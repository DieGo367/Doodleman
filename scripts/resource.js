const Resources = {
  saved: {}, groupStatuses: {},
  request: function(url,onComplete,onFail) {
    if (typeof url!="string") return console.warn("Invalid request url");
    var data = this.saved[url];
    if (data!=void(0)) {
      if (typeof onComplete=="function") setTimeout(function() {
        onComplete(data,url);
      },0);
    }
    else {
      $.ajax({
        url: url, dataType: "text",
        success: function(data) {
          if (typeof data=="object") data = JSON.stringify(data);
          Resources.store(this.url,data);
          if (typeof onComplete=="function") onComplete(data,this.url);
        },
        error: function(e,type) {
          if (typeof onFail == "function") onFail(type,this.url);
        }
      });
    }
  },
  requestJSON: function(url,onComplete,onFail) {
    this.request(url,function(str,url) {
      let data = null;
      try {
        data = JSON.parse(str);
      }
      catch(e) {
        if (typeof onFail=="function") onFail("JSON parse error",url);
      }
      if (data && typeof onComplete=="function") onComplete(data,url);
    },onFail);
  },
  requestArrayBuffer: function(url,onComplete,onFail) {
    if (typeof url!="string") return console.warn("Invalid request url");
    var data = this.saved[url];
    if (data!=void(0)) {
      if (typeof onComplete=="function") setTimeout(function() {
        onComplete(data,url);
      },0);
    }
    else {
      let req = new XMLHttpRequest();
      req.open("GET",url,true);
      req.responseType = "arraybuffer";
      req.onload = function() {
        Resources.store(this.responseURL,this.response);
        if (typeof onComplete=="function") onComplete(this.response,this.responseURL);
      };
      req.onerror = function() {
        if (typeof onFail == "function") onFail(type,this.responseURL);
      };
      req.send();
    }
  },
  requestGroup: function(groupName,forEach,onComplete) {
    this.requestJSON(groupName+"/_list_.json",function(list) {
      if (!(list instanceof Array)) return console.warn(groupName + " list wasn't a proper array");
      Resources.setStatus(groupName,list.length);
      for (var i in list) {
        if (typeof list[i]!="string") continue;
        Resources.requestJSON(groupName+"/"+list[i],function(data,url) {
          if (typeof forEach == "function") forEach(data,url.split("/").pop());
          let status = Resources.checkStatus(groupName);
          if (status==1&&typeof onComplete=="function") onComplete(list,groupName);
          Resources.setStatus(groupName,-1);
        },
        function(e) {
          console.warn("Group item '"+list[i]+"' failed to load due to: "+e);
        });
      }
    },
    function(e) {
      console.warn("Group list for '"+groupName+"' failed to load due to: "+e);
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
