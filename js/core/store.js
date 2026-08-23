// 狀態儲存與 schema 遷移。
//
// 單一職責：讀寫 localStorage、執行 schema migration、提供不可變的狀態快照。
// 其他模組一律透過本檔存取狀態，不直接碰 localStorage。
//
// 純函式風格：不得存取 document / window / localStorage 等全域物件，
// 一律透過參數傳入的 storage（具備 getItem/setItem 的物件）操作，
// 這樣測試才能在沒有瀏覽器的 JXA 環境下執行，且未來要換成別的
// 儲存後端（例如測試用的假物件）也不必改動本檔的邏輯。

export const STORAGE_KEY = 'periodic-quest-state';
export const CURRENT_SCHEMA_VERSION = 1;

// 損毀備份 key 的遞增序號。單靠 Date.now() 當 key 尾碼在同一毫秒內
// 連續兩次損毀會互相覆蓋，等於白留——這台計數器保證同一次執行期間
// 產生的每個備份 key 都不同，不管時間戳記是否撞在同一毫秒。
let backupSeq = 0;

/**
 * 建立全新的初始狀態。
 * @returns {object} 合法的初始狀態
 */
export function createInitialState() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: Date.now(),
    settings: {
      theme: 'default',
      soundOn: true,
      customImages: { background: null, rewardCard: null }
    },
    unlockedStages: [1],
    cards: {},
    stats: {
      totalAnswered: 0,
      totalCorrect: 0,
      cheerPoints: 0,
      bestRally: 0,
      sessions: [] // { date, answered, correct }，只保留最近 30 筆
    }
  };
}

// 逐版遞增的 migration 陣列：MIGRATIONS[i] 負責把 schemaVersion 為 i 的
// 狀態升級到 i+1。要新增新版本時，只需要在陣列末端追加一個函式，
// 不必重寫既有的 migration 邏輯——這是本模組最重要的保證：
// 絕不允許因為程式改版而清空學生累積的學習進度。
const MIGRATIONS = [
  // 0 -> 1：補齊缺漏的頂層欄位，且不覆寫已存在的欄位。
  function migrate0to1(state) {
    const initial = createInitialState();
    const next = Object.assign({}, state);
    Object.keys(initial).forEach(key => {
      if (!(key in next)) {
        next[key] = initial[key];
      }
    });
    return next;
  }
];

// 合法的 schemaVersion 只有「非負整數」。字串、負數、小數都是型別錯誤，
// 不能假設它們對應哪個版本——貿然當成版本 0（或任何猜測值）去套用
// migration，未來若某版 migration 涉及欄位搬移／重新結構化，就會套錯
// 版次而毀掉資料，且使用者完全不會收到警告。
function isValidVersion(v) {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

/**
 * 將狀態遷移到目前的 schema 版本。已是最新版時原樣回傳，不做任何複製。
 *
 * 版本判斷採保守策略：
 * - 完全沒有 schemaVersion 欄位：視為這個欄位存在之前的最舊狀態，
 *   當成版本 0 走正常遷移流程補齊欄位。
 * - schemaVersion 是合法的非負整數（含大於 CURRENT_SCHEMA_VERSION 的
 *   「未來版本」，例如學生用過新版又換回舊版）：依版次遷移；已是最新版
 *   或版次未知的更新狀態一律原樣回傳，不猜、不改。
 * - schemaVersion 型別錯誤（字串、負數、小數……）：無法判斷真正版次，
 *   寧可完全不遷移也不要套錯 migration 毀資料，直接原樣回傳。
 * @param {object} state
 * @returns {object} 遷移後的狀態
 */
export function migrate(state) {
  let next = state;
  let version;

  if (typeof state.schemaVersion === 'undefined') {
    version = 0;
  } else if (isValidVersion(state.schemaVersion)) {
    version = state.schemaVersion;
  } else {
    return state;
  }

  while (version < CURRENT_SCHEMA_VERSION) {
    const migrated = MIGRATIONS[version](next);
    version += 1;
    next = Object.assign({}, migrated, { schemaVersion: version });
  }

  return next;
}

/**
 * 從 storage 載入狀態。讀不到值、資料損毀時都回傳全新的初始狀態；
 * 資料損毀的情況會先把原始字串備份到另一個 key，避免直接遺失。
 * @param {{getItem: function, setItem: function}} storage
 * @returns {object} 狀態
 */
export function loadState(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null || raw === undefined) {
    return createInitialState();
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    // JSON 損毀：先備份原始字串再回傳初始狀態，不能讓學生的進度
    // 就此人間蒸發——即使程式救不回來，至少留一份原始資料供事後救援。
    // key 尾碼同時帶時間戳記與遞增序號，避免同一毫秒內連續損毀時
    // 後一次的備份覆蓋掉前一次。
    const backupKey = 'periodic-quest-backup-' + Date.now() + '-' + (backupSeq++);
    storage.setItem(backupKey, raw);
    return createInitialState();
  }

  return migrate(parsed);
}

/**
 * 把狀態寫入 storage，寫入前更新 updatedAt。不修改傳入的 state 物件。
 * @param {{getItem: function, setItem: function}} storage
 * @param {object} state
 */
export function saveState(storage, state) {
  const next = Object.assign({}, state, { updatedAt: Date.now() });
  storage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/**
 * 依原子序取得卡片，找不到時回傳 null。
 * @param {object} state
 * @param {number} z
 * @returns {object|null}
 */
export function getCard(state, z) {
  const card = state.cards[String(z)];
  return card ? card : null;
}

/**
 * 新增或更新一張卡片，回傳新的 state（不可變更新，不修改原物件）。
 * @param {object} state
 * @param {object} card 需含 z 欄位
 * @returns {object} 新的 state
 */
export function upsertCard(state, card) {
  const cards = Object.assign({}, state.cards, { [String(card.z)]: card });
  return Object.assign({}, state, { cards });
}
