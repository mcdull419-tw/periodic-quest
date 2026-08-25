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

const CACHE_VERSION = "pq-v6";

// 離線可用是這個 App 的重點功能之一（學生在通勤、在沒訊號的地方也要能背），
// 所以**執行期會用到的檔案全部預先快取**，不是只存外殼。
//
// 原本只快取外殼，其餘等「線上造訪過」再動態存入。實測踩到：飛航模式下
// 進教學畫面，場景插圖出不來——因為那張圖從沒在線上被載入過。同樣的道理，
// 元素資料與各畫面只要沒在線上開過，離線就全都打不開，等於「離線可用」
// 只對走過一模一樣路徑的人成立。
//
// 注意：cache.addAll() 只要有任何一個 URL 失敗，install 就整個失敗，
// 結果是完全沒有離線能力。所以這份清單新增檔案時必須確認路徑正確，
// 並且**每次改動這份清單都要把 CACHE_VERSION 往上加**。
// js/core/validate.js 不在清單裡：那是測試用的，App 執行期不會匯入。
const CORE_ASSETS = [
  "./",
  "index.html",
  "manifest.json",

  "css/tokens.css",
  "css/components.css",
  "css/periodic-table.css",
  "css/screens.css",

  "js/main.js",
  "js/version.js",
  "js/data/load.js",
  "js/core/store.js",
  "js/core/scheduler.js",
  "js/core/quiz.js",
  "js/core/question.js",
  "js/core/progress.js",
  "js/components/periodic-table.js",
  "js/components/zhuyin.js",
  "js/components/scene-art.js",
  "js/ui/screen-home.js",
  "js/ui/screen-table.js",
  "js/ui/screen-learn.js",
  "js/ui/screen-quiz.js",
  "js/ui/screen-review.js",
  "js/ui/quiz-runner.js",

  "data/elements.json",
  "data/mnemonics-groups.json",
  "data/mnemonics-elements.json",
  "data/stages.json",

  "assets/icon.svg",
  "assets/chant-scenes.jpg",
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

// 取用策略：network-first，拿不到才回頭找快取。
//
// 原本是 cache-first，結果踩了一次實際的坑：改完程式部署上去，使用者的
// 瀏覽器照樣顯示舊版，因為檔案早就被凍在快取裡，除非 CACHE_VERSION 變動
// 才會更新。而「每次改檔都記得把版本號加一」這種要靠人記住的規則，
// 遲早會忘——事實上第一次就忘了。
//
// 改成 network-first 之後，只要連得上網就一定是最新版；離線時退回快取，
// 「加入主畫面後離線也能用」這個目標不受影響。代價是連線時多一趟往返，
// 但整個 App 只有一百多 KB，這個代價換掉一整類 bug 很划算。
//
// 網路「很慢」和「斷線」不一樣：completely offline 會馬上 reject，
// 但訊號差的時候 fetch 可能吊著好幾十秒，畫面就一直空白。所以加上
// 逾時，超過就直接用快取——寧可給舊內容也不要讓學生盯著白畫面。
const NETWORK_TIMEOUT_MS = 3000;

function fromNetwork(request) {
  // 用 cache: "no-cache" 重建一個等價請求。
  //
  // 這一行是踩過坑才加的：改成 network-first 之後，部署新版仍然看到舊
  // 畫面。原因是 fetch() 預設會吃瀏覽器自己的 HTTP 快取，而 GitHub Pages
  // 對靜態檔送 max-age=600——SW 以為自己去了網路，其實拿回來的是十分鐘
  // 內的舊檔。實測同一頁裡用 no-store 抓到新版、走一般路徑抓到舊版。
  //
  // no-cache 不是「不快取」，是「一定向伺服器驗證」：帶 ETag 去問，
  // 沒變就回 304，幾乎沒有額外成本，但保證不會拿到過期的檔案。
  // 更糟的情況是新舊檔混用——部分模組是新的、部分是舊的，那種壞法
  // 極難重現。
  const revalidated = new Request(request.url, {
    cache: "no-cache",
    credentials: "same-origin"
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), NETWORK_TIMEOUT_MS);
    fetch(revalidated).then(
      (response) => { clearTimeout(timer); resolve(response); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

self.addEventListener("fetch", (event) => {
  // 只處理 GET；只處理同源請求（本專案不連任何外部資源，見專案規範）。
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fromNetwork(event.request)
      .then((response) => {
        // 只快取成功的回應，避免把 404 或錯誤內容存進去。
        //
        // 這段快取寫入必須用 event.waitUntil() 保護存活期。
        // event.respondWith() 只會把 SW 的存活期延到「它收到的 Promise
        // settle 為止」；下面的 return response 一執行，respondWith 就
        // settle 了。若這裡的 caches.open().then(...) 沒有另外交給
        // waitUntil()，規範上瀏覽器隨時可能在寫入完成前就把 SW 終止，
        // 導致這次快取「射後不理」失敗——症狀是學生線上瀏覽過某個畫面，
        // 離線後卻打不開，而且難以重現。
        if (response && response.ok) {
          const clone = response.clone();
          event.waitUntil(
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone))
          );
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(
          (cached) =>
            cached ||
            new Response("離線中，且尚未快取此資源。", {
              status: 503,
              statusText: "Offline",
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
        )
      )
  );
});
