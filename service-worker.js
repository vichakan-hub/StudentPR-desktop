const CACHE_NAME =
  'studentpr-desktop-v2';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',

  './icons/favicon-32.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',

  './assets/school-logo.png'
];


/*
 * ติดตั้ง Service Worker
 * และเก็บไฟล์หลักของแอปไว้ใน Cache
 */
self.addEventListener(
  'install',
  event => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then(cache => {
          return cache.addAll(APP_SHELL);
        })
        .then(() => {
          return self.skipWaiting();
        })
    );
  }
);


/*
 * ลบ Cache เวอร์ชันเก่า
 */
self.addEventListener(
  'activate',
  event => {
    event.waitUntil(
      caches
        .keys()
        .then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              if(cacheName !== CACHE_NAME){
                return caches.delete(
                  cacheName
                );
              }

              return null;
            })
          );
        })
        .then(() => {
          return self.clients.claim();
        })
    );
  }
);


/*
 * Network First สำหรับหน้าเว็บ
 * Cache First สำหรับไฟล์รูปและไฟล์ Static
 */
self.addEventListener(
  'fetch',
  event => {
    const request =
      event.request;

    if(request.method !== 'GET'){
      return;
    }

    const requestUrl =
      new URL(request.url);

    /*
     * ไม่ดักคำขอ Supabase
     * เพื่อป้องกันข้อมูลนักเรียนค้าง
     */
    if(
      requestUrl.hostname.includes(
        'supabase.co'
      )
    ){
      return;
    }

    if(
      request.mode === 'navigate'
    ){
      event.respondWith(
        fetch(request)
          .then(response => {
            const responseClone =
              response.clone();

            caches
              .open(CACHE_NAME)
              .then(cache => {
                cache.put(
                  './index.html',
                  responseClone
                );
              });

            return response;
          })
          .catch(() => {
            return caches.match(
              './index.html'
            );
          })
      );

      return;
    }

    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if(cachedResponse){
            return cachedResponse;
          }

          return fetch(request)
            .then(response => {
              if(
                !response ||
                response.status !== 200 ||
                response.type === 'opaque'
              ){
                return response;
              }

              const responseClone =
                response.clone();

              caches
                .open(CACHE_NAME)
                .then(cache => {
                  cache.put(
                    request,
                    responseClone
                  );
                });

              return response;
            });
        })
    );
  }
);
