var CACHE_NAME='drivesq-student-v2';
var PRECACHE=[
  '/student.html',
  '/theory-questions.js',
  'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://i.postimg.cc/sx8zRRKV/cropped-circle-image.png'
];

self.addEventListener('install',function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(PRECACHE);
    }).then(function(){return self.skipWaiting();})
  );
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){return n!==CACHE_NAME;}).map(function(n){return caches.delete(n);})
      );
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
    }).catch(function(){
      return caches.match(e.request);
    })
  );
});

self.addEventListener('push',function(e){
  var data={title:'DriveSQ',body:'You have a new notification',icon:'https://i.postimg.cc/sx8zRRKV/cropped-circle-image.png',badge:'https://i.postimg.cc/sx8zRRKV/cropped-circle-image.png'};
  if(e.data){
    try{data=Object.assign(data,e.data.json());}catch(err){data.body=e.data.text();}
  }
  e.waitUntil(
    self.registration.showNotification(data.title,{
      body:data.body,
      icon:data.icon,
      badge:data.badge,
      vibrate:[200,100,200],
      tag:data.tag||'drivesq-notification',
      renotify:true,
      data:{url:data.url||'/student.html'}
    })
  );
});

self.addEventListener('notificationclick',function(e){
  e.notification.close();
  var url=e.notification.data&&e.notification.data.url?e.notification.data.url:'/student.html';
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
      for(var i=0;i<list.length;i++){
        if(list[i].url.includes('student.html')&&'focus' in list[i])return list[i].focus();
      }
      return clients.openWindow(url);
    })
  );
});
