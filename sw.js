// Service Worker — 缓存壳层，离线回退
const CACHE_NAME = 'finance-pwa-v1';
const SHELL_FILES = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/config.js',
  '/js/supabase-client.js',
  '/js/router.js',
  '/js/auth.js',
  '/js/stats.js',
  '/js/expenses.js',
  '/js/income.js',
  '/js/charts.js',
  '/js/budget.js',
  '/js/history.js',
  '/js/export.js',
  '/js/notifications.js',
  '/js/offline.js',
  '/js/app.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install — 预缓存壳层
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES).catch(err => {
      console.warn('SW install: some files failed to cache', err);
    }))
  );
  self.skipWaiting();
});

// Activate — 清理旧缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — 对 API 请求 skip cache，对壳层文件 cache-first
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (url.hostname.includes('supabase.co') || url.hostname.includes('cdn.jsdelivr.net')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => {
      if (e.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    }))
  );
});
