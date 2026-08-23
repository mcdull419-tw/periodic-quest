// Leitner 五盒間隔複習排程。
//
// 單一職責：決定每張卡片下一次要在什麼時候被複習，以及哪些卡片
// 目前最弱、最需要優先練習。這是整個 App 學習成效的核心。
//
// 純函式，不得存取 document / window / localStorage 等全域物件，
// 這樣測試才能在沒有瀏覽器的 JXA 環境下執行。
//
// 設計要點（詳見 task-2.2-brief.md）：
// - 答對升一盒（盒 5 為上限），答錯直接掉回盒 1——記錯的東西
//   需要從頭重建記憶，不是退一盒慢慢補救。
// - 反應時間超過 HESITATION_MS 時即使答對也標記 hesitant，
//   代表這張卡還沒真的記熟，抽弱項題時會提高權重。
// - 所有函式回傳新物件，不修改傳入的 card。

// 五個盒子對應的複習間隔（天），索引為 box - 1。盒 1 是「立刻重考」。
export const BOX_INTERVALS_DAYS = [0, 1, 3, 7, 14];

// 答對但反應時間超過這個毫秒數，仍然升盒，但標記為「猶豫」。
export const HESITATION_MS = 8000;

// 盒子數量上限。
export const MAX_BOX = 5;

const DAY_MS = 86400000;

/**
 * 建立一張全新的卡片，從盒 1 開始，立刻到期。
 * @param {number} z 原子序
 * @param {number} now 目前時間戳記（ms）
 * @returns {object} 新的 card
 */
export function newCard(z, now) {
  return {
    z,
    box: 1,
    nextDue: now,
    lastSeen: null,
    streak: 0,
    correct: 0,
    wrong: 0,
    avgMs: 0,
    hesitant: false
  };
}

/**
 * 依作答結果更新卡片，回傳新物件（不修改傳入的 card）。
 * @param {object} card 原本的卡片
 * @param {boolean} isCorrect 是否答對
 * @param {number} elapsedMs 這次作答花費的時間（ms）
 * @param {number} now 目前時間戳記（ms）
 * @returns {object} 更新後的新 card
 */
export function reviewCard(card, isCorrect, elapsedMs, now) {
  const n = card.correct + card.wrong;
  const avgMs = (card.avgMs * n + elapsedMs) / (n + 1);

  if (!isCorrect) {
    // hesitant 重置為 false：這個旗標描述的是「上一次答對時猶不猶豫」，
    // 答錯代表這張卡整個掉回盒 1 重新開始，舊的猶豫紀錄已經沒有意義，
    // 不重置的話會讓下一次答對前的 weaknessScore 被過期的猶豫紀錄多算一分。
    return Object.assign({}, card, {
      box: 1,
      nextDue: now,
      streak: 0,
      wrong: card.wrong + 1,
      avgMs,
      hesitant: false,
      lastSeen: now
    });
  }

  const box = Math.min(card.box + 1, MAX_BOX);
  const hesitant = elapsedMs > HESITATION_MS;

  return Object.assign({}, card, {
    box,
    nextDue: now + BOX_INTERVALS_DAYS[box - 1] * DAY_MS,
    streak: card.streak + 1,
    correct: card.correct + 1,
    avgMs,
    hesitant,
    lastSeen: now
  });
}

/**
 * 判斷卡片是否已到期（nextDue 小於等於 now）。
 * @param {object} card
 * @param {number} now
 * @returns {boolean}
 */
export function isDue(card, now) {
  return card.nextDue <= now;
}

// 判斷是否為可用的 card 物件。null／undefined／非物件一律視為壞資料。
// store.js 的 migrate 目前不檢查 cards 的型別，竄改過的 localStorage
// 有機會產出含 null 的卡片集合，這裡先擋下來避免整個複習畫面白屏。
function isCardLike(c) {
  return c !== null && typeof c === 'object';
}

/**
 * 取出所有已到期的卡片，依 nextDue 由早到晚排序。
 * 陣列內非物件（null／undefined 等）的壞項目會被靜默跳過而不拋例外——
 * 本函式回傳的是卡片陣列本身（不像 validate* 系列回傳錯誤訊息陣列），
 * 呼叫端期待拿到的是「可以直接拿去用的卡片」，混進錯誤陣列反而更不合預期，
 * 所以選擇跳過壞資料而非中止或回報錯誤。
 * @param {object[]} cards card 陣列
 * @param {number} now
 * @returns {object[]} 已到期的 card 陣列
 */
export function dueCards(cards, now) {
  return cards.filter(isCardLike).filter(c => isDue(c, now)).sort((a, b) => a.nextDue - b.nextDue);
}

/**
 * 計算卡片的弱項分數，越高代表越弱：
 * wrong * 2 + (MAX_BOX - box) + (hesitant ? 1 : 0)。
 * @param {object} card
 * @returns {number}
 */
export function weaknessScore(card) {
  return card.wrong * 2 + (MAX_BOX - card.box) + (card.hesitant ? 1 : 0);
}

/**
 * 取出最弱的前 limit 張卡片，依 weaknessScore 由高到低排序。
 * 陣列內非物件（null／undefined 等）的壞項目會被靜默跳過而不拋例外，
 * 理由同 dueCards：本函式回傳卡片陣列，靜默跳過壞資料對呼叫端最不意外。
 * @param {object[]} cards card 陣列
 * @param {number} limit
 * @returns {object[]}
 */
export function weakCards(cards, limit) {
  return cards.filter(isCardLike).sort((a, b) => weaknessScore(b) - weaknessScore(a)).slice(0, limit);
}
