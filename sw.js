// 這裡是你控制版本的開關！每次更新 index.html，就把這裡的 v1 改成 v2, v3, v4...
const CACHE_NAME = 'pbl-platform-v1'; 

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. 安裝時：將指定的檔案存入快取
self.addEventListener('install', event => {
  self.skipWaiting(); // 強制立刻接管，不等待舊版關閉
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. 啟動時：清除舊版本的快取 (這是自動更新的關鍵！)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 如果快取名稱跟目前的版本號不同，就刪除舊的
          if (cacheName !== CACHE_NAME) {
            console.log('清除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // 確保新的 Service Worker 立刻控制所有頁面
});

// 3. 攔截請求：先找快取，沒有再透過網路抓取
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});