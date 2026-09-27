// 快取版本號：每次更新網頁內容時更換此版本號，瀏覽器便會自動淘汰舊版
const CACHE_NAME = 'pbl-platform-cache-v20260927-v2';

// 核心快取清單
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './l9-q2.png'
];

// 1. 安裝階段 (Install)：預先快取核心資源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] 建立新快取並預載資源');
        return cache.addAll(urlsToCache);
      })
  );
  // 跳過等待，讓新的 Service Worker 立即生效
  self.skipWaiting();
});

// 2. 啟動階段 (Activate)：自動清除所有過期的舊快取
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[Service Worker] 刪除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 立即接管所有已開啟的頁面
  self.clients.claim();
});

// 3. 請求攔截階段 (Fetch)：網路優先策略 (Network First)
self.addEventListener('fetch', event => {
  // 排除非 HTTP/HTTPS 請求 (如瀏覽器擴充功能等)
  if (!(event.request.url.startsWith('http:') || event.request.url.startsWith('https:'))) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 連線正常：更新快取並回傳最新檔案
        if (response && response.status === 200 && response.type === 'basic' && event.request.method === 'GET') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 離線或連線失敗：自動退回使用快取
        return caches.match(event.request);
      })
  );
});