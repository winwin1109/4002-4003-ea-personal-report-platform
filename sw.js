// 每次更新 index.html 或其他檔案時，請修改這裡的版本號 (例如從 v3 改成 v4)
const CACHE_NAME = 'pbl-app-v4'; 

// 這裡放入需要被快取的檔案路徑
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './l9-q2.png'  // 這是您在 HTML 中有使用到的 QR code 圖片
];

// 安裝階段：將指定的檔案加入快取
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('開啟快取並快取檔案');
        return cache.addAll(urlsToCache);
      })
  );
  // 強制讓新的 Service Worker 立即接管，不需要等待用戶關閉所有分頁
  self.skipWaiting();
});

// 啟動階段：清除舊版本的快取
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 如果目前的快取名稱不在白名單內 (即舊版本)，就將其刪除
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('刪除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 確保更新後能立即控制目前打開的網頁
  event.waitUntil(self.clients.claim());
});

// 攔截請求階段：處理網路請求 (Cache First with Network Fallback)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果在快取中找到資源，就直接回傳快取版本，加快載入速度
        if (response) {
          return response;
        }
        
        // 如果快取中沒有，則向網路發出請求
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // 檢查請求是否有效 (避免跨域請求失敗等問題)
          if(!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // 將成功抓取的新資源也加入快取中備用
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
            
          return response;
        }).catch(() => {
          // 可以在這裡處理離線狀態且沒有快取的情況
          console.log('目前處於離線狀態，且找不到快取檔案。');
        });
      })
  );
});