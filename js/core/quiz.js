// 測驗出題引擎：來源池、抽題權重、干擾選項。
//
// 這個檔案由 task 2.3、2.4 逐步建構：
//   2.3：出題來源池（due／weak／fresh）與抽題權重
//   2.4：干擾選項（distractors）
// 內容依「來源池」「權重挑選」「干擾選項」分節排列。
//
// task 2.5（題目生成與判分：QUESTION_TYPES、makeQuestion、nextQuestion、
// checkAnswer）改放在 js/core/question.js——本檔加上該部分會超過
// 400 行的檔案長度上限，因此拆檔。question.js 會 import 這個檔案
// 匯出的 buildPools／pickSource／availableElements／buildDistractors。
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

// ---------------------------------------------------------------------------
// 干擾選項（distractors）
// ---------------------------------------------------------------------------

// 視為「金」部的分類：金屬相關的五大類 + 鑭錒系，中文名多從「釒」旁
// （鈉、鉀、鈣、鐵、銅……）。
const METAL_CATEGORIES = new Set([
  'alkali-metal', 'alkaline-earth', 'transition-metal',
  'post-transition-metal', 'lanthanide', 'actinide'
]);

/**
 * 把陣列依 Fisher-Yates 演算法用 rng 洗牌，回傳新陣列（不修改原陣列）。
 * @param {any[]} arr
 * @param {() => number} rng 回傳 [0, 1) 亂數的函式
 * @returns {any[]}
 */
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 判斷兩個元素符號是否形近：首字母相同，或兩個都是兩字母符號且僅差一個字元。
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function symbolSimilar(a, b) {
  if (a[0] === b[0]) return true;
  if (a.length === 2 && b.length === 2) {
    let diff = 0;
    for (let i = 0; i < 2; i++) {
      if (a[i] !== b[i]) diff++;
    }
    return diff === 1;
  }
  return false;
}

/**
 * 用「category／state」硬編近似出元素中文名的偏旁類別，
 * 不做真正的部首查表（JS 無法直接取得部首，這個近似已足夠）。
 * @param {object} el
 * @returns {'metal' | 'gas' | 'metalloid' | 'liquid' | 'stone' | null}
 */
function radicalOf(el) {
  if (METAL_CATEGORIES.has(el.category)) return 'metal'; // 金部
  if (el.category === 'noble-gas' || el.state === 'gas') return 'gas'; // 气部
  if (el.category === 'metalloid') return 'metalloid'; // 石部（類金屬）
  if (el.state === 'liquid') return 'liquid'; // 水部（氵）
  if (el.category === 'nonmetal' || el.category === 'halogen') return 'stone'; // 石部（固態非金屬／鹵素）
  return null;
}

/**
 * 為目標元素挑選 `count` 個錯誤選項（干擾項）。
 * 依優先序逐層蒐集候選，取滿為止；每層內先用 rng 洗牌再取用，
 * 避免每次都拿到同樣的干擾項。已取用的以 z 去重：
 *   1. 同族（mainGroup 相同，且不得為 null——過渡金屬／鑭錒系彼此不視為同族）
 *   2. 同週期（period 相同）
 *   3. 符號形近（首字母相同，或兩字母符號僅差一個字元）
 *   4. 中文名形近（共用偏旁：金、气、石、水四類的硬編近似）
 *   5. 仍不足時隨機補
 * 候選不足 count 時，回傳能給的最大數量，不丟例外。
 * @param {object} target 目標元素
 * @param {object[]} allElements 全部候選元素（含 target 本身）
 * @param {number} count 需要的干擾項數量
 * @param {() => number} rng 回傳 [0, 1) 亂數的函式，預設 Math.random
 * @returns {object[]} 干擾項元素陣列，長度 <= count
 */
export function buildDistractors(target, allElements, count, rng = Math.random) {
  const pool = allElements.filter(e => e && e.z !== target.z);
  const usedZ = new Set([target.z]);
  const chosen = [];

  function takeFromLayer(predicate) {
    if (chosen.length >= count) return;
    const layerCandidates = pool.filter(e => !usedZ.has(e.z) && predicate(e));
    for (const e of shuffle(layerCandidates, rng)) {
      if (chosen.length >= count) break;
      chosen.push(e);
      usedZ.add(e.z);
    }
  }

  takeFromLayer(e => e.mainGroup != null && e.mainGroup === target.mainGroup);
  takeFromLayer(e => e.period === target.period);
  takeFromLayer(e => symbolSimilar(target.symbol, e.symbol));
  takeFromLayer(e => {
    const r = radicalOf(e);
    return r !== null && r === radicalOf(target);
  });
  takeFromLayer(() => true);

  return chosen;
}
