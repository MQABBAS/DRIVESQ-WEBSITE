var CACHE_NAME='drivesq-theory-v1';
var PRECACHE=[
  '/theory-app/index.html',
  '/theory-app/style.css',
  '/theory-app/app.js',
  '/theory-app/theory-questions.js',
  '/theory-app/manifest.json',
  'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
  'https://i.postimg.cc/sx8zRRKV/cropped-circle-image.png'
];

self.addEventListener('install',function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){return cache.addAll(PRECACHE);})
      .then(function(){return self.skipWaiting();})
  );
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.filter(function(n){return n!==CACHE_NAME;}).map(function(n){return caches.delete(n);}));
    }).then(function(){return self.clients.claim();})
  );
});

self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  var url=new URL(e.request.url);
  if(url.hostname.includes('supabase'))return;
  e.respondWith(
    fetch(e.request).then(function(resp){
      if(resp&&resp.status===200){
        var clone=resp.clone();
        caches.open(CACHE_NAME).then(function(cache){cache.put(e.request,clone);});
      }
      return resp;
    }).catch(function(){return caches.match(e.request);})
  );
});
