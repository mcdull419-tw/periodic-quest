// 測驗出題引擎。
//
// 這個檔案由三個 task 逐步建構：
//   2.3（本次）：出題來源池（due／weak／fresh）與抽題權重
//   2.4：干擾選項（distractors）
//   2.5：題目生成與判分
// 為了方便後續追加，內容依「來源池」「權重挑選」分節排列，
// 不要把所有東西塞進一個大函式。
//
// 純函式，不得存取 document / window / localStorage 等全域物件，
// 這樣測試才能在沒有瀏覽器的 JXA 環境下執行。

import { dueCards, weakCards } from './scheduler.js';

// ---------------------------------------------------------------------------
// 出題來源池
// ---------------------------------------------------------------------------

// 三個池的抽題權重：到期複習優先，其次是弱項加強，最後才是新元素。
// 加總必須是 1。
export const POOL_WEIGHTS = { due: 0.6, weak: 0.25, fresh: 0.15 };

/**
 * 依已解鎖的關卡，列出目前可以出題的元素（原子序）陣列。
 * 依 stages 陣列順序、每關內 elements 原始順序展開，不做排序或去重——
 * stages 資料本身的定義已保證元素不跨關卡重複。
 * @param {object[]} stages 關卡定義陣列，每筆含 { id, elements, ... }
 * @param {number[]} unlockedStages 已解鎖的關卡 id 陣列
 * @returns {number[]} 原子序陣列
 */
export function availableElements(stages, unlockedStages) {
  const unlocked = new Set(unlockedStages);
  const result = [];
  for (const stage of stages) {
    if (!unlocked.has(stage.id)) continue;
    for (const z of stage.elements) result.push(z);
  }
  return result;
}

/**
 * 把可用元素分成三個互斥的池：
 *   due   —— 已有卡片且到期需要複習的元素
 *   weak  —— 已學過、目前不在 due 池中的元素，取弱項分數最高的前 N 個
 *            （N = available 長度的一半，至少 3）
 *   fresh —— available 中完全沒有卡片紀錄的元素（尚未學過）
 * 計算順序很重要：先算 due，再從「不在 due 且已學過」的卡中取 weak，
 * 最後才是 fresh，確保三個池互斥。
 * @param {object[]} cards card 陣列
 * @param {number[]} availableZ 目前可用的原子序陣列
 * @param {number} now 目前時間戳記（ms）
 * @returns {{ due: number[], weak: number[], fresh: number[] }}
 */
export function buildPools(cards, availableZ, now) {
  const availableSet = new Set(availableZ);
  // 只保留目前可用範圍內的卡片，避免舊關卡或壞資料的卡混進池子。
  const availableCards = cards.filter(c => c && typeof c === 'object' && availableSet.has(c.z));

  const due = dueCards(availableCards, now).map(c => c.z);
  const dueSet = new Set(due);

  const weakLimit = Math.max(3, Math.floor(availableZ.length / 2));
  const notDueCards = availableCards.filter(c => !dueSet.has(c.z));
  const weak = weakCards(notDueCards, weakLimit).map(c => c.z);

  const learnedSet = new Set(availableCards.map(c => c.z));
  const fresh = availableZ.filter(z => !learnedSet.has(z));

  return { due, weak, fresh };
}

// ---------------------------------------------------------------------------
// 權重挑選
// ---------------------------------------------------------------------------

const POOL_ORDER = ['due', 'weak', 'fresh'];

/**
 * 依 POOL_WEIGHTS 的權重從三個池中選出一個來源。
 * 把權重依 due → weak → fresh 的順序累加成區間，用 rng() 的落點決定；
 * 選中的池若是空的，依 due → weak → fresh 的順序遞補第一個非空的池。
 * 三個池皆空時回傳 null。
 * @param {{ due: number[], weak: number[], fresh: number[] }} pools
 * @param {() => number} rng 回傳 [0, 1) 亂數的函式，預設 Math.random
 * @returns {"due" | "weak" | "fresh" | null}
 */
export function pickSource(pools, rng = Math.random) {
  const roll = rng();
  let acc = 0;
  let picked = POOL_ORDER[POOL_ORDER.length - 1];
  for (const name of POOL_ORDER) {
    acc += POOL_WEIGHTS[name];
    if (roll < acc) {
      picked = name;
      break;
    }
  }

  if (pools[picked] && pools[picked].length > 0) return picked;

  for (const name of POOL_ORDER) {
    if (pools[name] && pools[name].length > 0) return name;
  }
  return null;
}
