const CACHE_NAME = 'pbl-app-cache-v1';

// 這裡列出需要預先下載並儲存在手機裡的檔案
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. 安裝階段：將核心資源加入快取
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('快取已開啟');
        return cache.addAll(urlsToCache);
      })
  );
  // 強制立即接管控制，不用等舊版 Service Worker 停用
  self.skipWaiting();
});

// 2. 啟動階段：清理舊版本的快取，確保學生拿到最新版
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('刪除舊版快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. 攔截請求：網路優先 (Network First)，若斷網則退回使用快取 (Cache Fallback)
self.addEventListener('fetch', event => {
  // 針對 HTTP/HTTPS 請求進行攔截
  if (event.request.url.startsWith('http')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 如果連線成功，就把最新抓到的資源同步更新到快取中
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // 如果斷網 (fetch 失敗)，就從手機快取裡找出備用檔案
          return caches.match(event.request);
        })
    );
  }
});