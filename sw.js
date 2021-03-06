const name = "doodleman_v1";
const staticFiles = ["staticFiles"]; // will be generated by server

self.addEventListener("install", async e => {
  let cache = await caches.open(name);
  await cache.addAll(staticFiles).catch(err => {console.warn(err);});
  return self.skipWaiting();
});

self.addEventListener("activate", async e => {
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  let promise = new Promise(function(resolve)  {
    let r = e.request;
    if (r.method=="POST" || r.url.split('/net/').length > 1) networkOnly(r,resolve);
    else networkFirst(r,resolve);
  });
  e.respondWith(promise);
  return; // TODO: figure out when to rely on cache
  // let url = new URL(r.url);
  // if (url.origin==location.origin) e.respondWith(cacheFirst(r));
  // else e.respondWith(networkFirst(r));
});

async function cacheFirst(r) {
  let cache = await caches.open(name);
  let cached = await cache.match(r);
  return cached || fetch(r);
}
async function networkFirst(r,resolve) {
  let cache = await caches.open(name);
  try {
    let fresh = await fetch(r);
    await cache.put(r,fresh.clone());
    resolve(fresh);
  }
  catch(e) {
    let cached = await cache.match(r);
    resolve(cached);
  }
}

function networkOnly(r,resolve) {
  fetch(r).then(result => {
    resolve(result);
  }).catch(() => {
    resolve(new Response("Network error happened", {
      "status" : 408,
      "headers" : {"Content-Type" : "text/plain"}
    }));
  });
}