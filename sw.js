// 更改這個版本號 (例如加上今天的日期)，瀏覽器就會知道有新版本並自動更新快取
const CACHE_NAME = 'pbl-platform-cache-v20260927';

// 列出需要快取的核心檔案
// 請確保這些檔名與你 GitHub 儲存庫中的實際檔名完全一致
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './l9-q2.png' // 這是首頁展示的 QR Code 圖片
];

// 1. 安裝階段：將指定的檔案加入快取
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('已開啟快取');
        return cache.addAll(urlsToCache);
      })
  );
  // 強制等待中的 Service Worker 立即啟動，不需等待舊版網頁關閉
  self.skipWaiting();
});

// 2. 啟動階段：清除舊版本的快取，釋放空間並確保載入新檔
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('刪除舊版快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 讓新的 Service Worker 立即接管所有開啟的頁面
  self.clients.claim();
});

// 3. 請求攔截階段 (Network First 策略)
// 優先從網路抓取最新資料。如果成功，就更新快取；如果處於離線狀態，才退而使用舊快取。
self.addEventListener('fetch', event => {
  // 排除非 HTTP(S) 請求 (例如 chrome-extension:// 等)
  if (!(event.request.url.startsWith('http:') || event.request.url.startsWith('https:'))) {
      return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 如果網路請求成功，將最新的檔案複製一份存入快取
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // 如果網路請求失敗 (例如離線)，則從快取中尋找對應的檔案
        return caches.match(event.request);
      })
  );
});