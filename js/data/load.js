// 瀏覽器端的資料載入（裁決 D）。
//
// 計畫原本沒有任何 task 定義「畫面怎麼拿到 data/*.json」。三個畫面
// （週期表、教學、測驗）都需要同一份資料，各自 fetch 會重複下載，
// 因此集中在這裡並做模組層級快取。
//
// 快取的是 Promise 而非結果：同一輪事件迴圈裡若有兩個畫面同時呼叫，
// 存結果會讓兩邊各發一次請求（第一次還沒回來，快取還是空的），
// 存 Promise 則兩邊共用同一次請求。

const FILES = {
  elements: 'data/elements.json',
  groups: 'data/mnemonics-groups.json',
  stages: 'data/stages.json',
  elementMnemonics: 'data/mnemonics-elements.json'
};

let cache = null;

/**
 * 載入三份資料檔。重複呼叫共用同一次請求。
 * @returns {Promise<{ elements: object[], groups: object[], stages: object[],
 *                     elementMnemonics: object[] }>}
 */
export function loadData() {
  if (cache) return cache;
  const names = Object.keys(FILES);
  cache = Promise.all(names.map(name => fetchJson(FILES[name])))
    .then(results => {
      const data = {};
      names.forEach((name, i) => { data[name] = results[i]; });
      return data;
    })
    .catch(err => {
      // 失敗不留下壞掉的快取，否則之後每次呼叫都拿到同一個 rejected
      // Promise，連重試的機會都沒有（例如第一次載入時剛好斷線）。
      cache = null;
      throw err;
    });
  return cache;
}

async function fetchJson(path) {
  const res = await fetch(path);
  // fetch 只有在網路層失敗才 reject，404 一樣是「成功的回應」。
  // 不檢查 res.ok 的話，錯的路徑會變成 JSON 解析錯誤，訊息毫無線索。
  if (!res.ok) throw new Error(`載入 ${path} 失敗：HTTP ${res.status}`);
  return res.json();
}

/** 清掉快取。目前只有測試與開發時的重新載入會用到。 */
export function clearDataCache() {
  cache = null;
}
