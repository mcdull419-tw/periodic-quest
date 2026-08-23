// sw.js — Service Worker：離線快取，讓加入主畫面的 PWA 在沒訊號時也能開啟。
//
// 策略：cache-first（先查快取，沒有才發網路請求，成功的話再存入快取）。
//
// 版本控管（這段最容易出包，務必做對）：
// CACHE_VERSION 是這一版快取的名稱。install 時把 PWA 外殼的核心檔案預先
// 存進這個名稱的快取。activate 時列出所有現有快取，把「名稱不等於目前
// CACHE_VERSION」的全部刪除。之後只要每次發版都把 CACHE_VERSION 改成新字串
// （例如 pq-v1 -> pq-v2），舊快取會在新 Service Worker activate 時被清掉，
// 學生就不會卡在舊版本、看到過期內容。

const CACHE_VERSION = "pq-v1";

// 開發期間會持續新增檔案（data/*.json、js/ui/*.js 等），這裡只預先快取
// PWA 外殼本身一定需要的固定檔案；其餘檔案在第一次造訪時由 fetch 事件
// 動態存入同一份快取，之後就會被 cache-first 命中。
const CORE_ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "css/tokens.css",
  "css/components.css",
  "js/main.js",
  "assets/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  // 不等待舊分頁關閉，讓新 Service Worker 盡快進入 activate。
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_VERSION)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // 只處理 GET；只處理同源請求（本專案不連任何外部資源，見專案規範）。
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // 只快取成功的回應，避免把 404 或錯誤內容存進去。
          if (response && response.ok) {
            const clone = response.clone();
            caches
              .open(CACHE_VERSION)
              .then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(
          () =>
            new Response("離線中，且尚未快取此資源。", {
              status: 503,
              statusText: "Offline",
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
        );
    })
  );
});
