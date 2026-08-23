// 進度統計與關卡解鎖判定（task 2.6）。
//
// 兩件事：
//   1. 一個關卡「完成了多少」——以卡片進到第幾盒為準，不是答對幾次。
//   2. 依此判斷哪些關卡已解鎖。
//
// 純函式，不得存取 document / window / localStorage 等全域物件，
// 這樣測試才能在沒有瀏覽器的 JXA 環境下執行。

// 進到第 3 盒（間隔 3 天）才算「記起來了」。第 1、2 盒的間隔是 0 與 1 天，
// 那只證明剛才答對，不足以判定為長期記憶。
export const UNLOCK_BOX_THRESHOLD = 3;

// stages 資料缺 unlockRatio、或填了非法值時的退路。
// 目前 data/stages.json 七關全部都是 0.8，這個值就是它們的共識。
// 不設退路的話，手改資料填錯一格會讓學生永久卡關（門檻變成 NaN 或
// 大於元素總數，怎麼練都解不開），而 validateStages 目前不擋這種錯。
const DEFAULT_UNLOCK_RATIO = 0.8;

/**
 * 取出一個關卡的實際 unlockRatio，非法值一律退回預設值。
 * @param {object} stage
 * @returns {number} (0, 1] 之間的比例
 */
function ratioOf(stage) {
  const r = stage.unlockRatio;
  if (typeof r !== 'number' || !isFinite(r) || r <= 0 || r > 1) return DEFAULT_UNLOCK_RATIO;
  return r;
}

/**
 * 把可能來自 localStorage 的 cards 收斂成乾淨的 card 陣列。
 * state.cards 正常是以原子序為鍵的物件，但手動竄改過的 localStorage
 * 可能塞進陣列、null 或字串（store.js 的 migrate 不修正這一類，見
 * 該檔的已知問題）。首頁一進來就會呼叫 summarize，這裡壞掉整個畫面
 * 就開不了，所以一律過濾成合法卡片，不丟例外。
 * @param {any} cards
 * @returns {object[]}
 */
function cardList(cards) {
  if (!cards || typeof cards !== 'object') return [];
  const values = Array.isArray(cards) ? cards : Object.keys(cards).map(k => cards[k]);
  return values.filter(c => c && typeof c === 'object' && typeof c.z === 'number');
}

/**
 * 計算一個關卡的完成度。只計入屬於該關卡的卡片，
 * 「達標」的定義是 box >= UNLOCK_BOX_THRESHOLD。
 * @param {object[]} cards card 陣列
 * @param {object} stage 關卡定義 { elements, unlockRatio, ... }
 * @returns {{ total: number, mastered: number, ratio: number }}
 */
export function stageCompletion(cards, stage) {
  const inStage = new Set(stage.elements);
  const list = cardList(cards);
  const mastered = list.filter(c => inStage.has(c.z) && c.box >= UNLOCK_BOX_THRESHOLD).length;
  const total = stage.elements.length;
  return { total, mastered, ratio: total === 0 ? 0 : mastered / total };
}

/**
 * 一個關卡要達到幾張達標卡，才能解開下一關。
 * @param {object} stage
 * @returns {number}
 */
export function unlockRequirement(stage) {
  return Math.ceil(stage.elements.length * ratioOf(stage));
}

/**
 * 這個關卡自身是否已達到「解開下一關」的門檻。
 * @param {object[]} cards
 * @param {object} stage
 * @returns {boolean}
 */
function meetsThreshold(cards, stage) {
  return stageCompletion(cards, stage).mastered >= unlockRequirement(stage);
}

/**
 * 判斷某個關卡是否已解鎖。
 * 關卡是線性的：第一關永遠開著，之後每一關都要求「它前面的每一關」
 * 都達到門檻——只看前一關的話，學生若先去練了第三關的元素（例如從
 * 週期表畫面自由瀏覽時記住的），會出現第二關還鎖著、第三關卻開了的
 * 跳關狀況。
 * @param {object[]} cards
 * @param {object[]} stages 依順序排列的關卡陣列
 * @param {number} stageId
 * @returns {boolean}
 */
export function isStageUnlocked(cards, stages, stageId) {
  const index = stages.findIndex(s => s.id === stageId);
  if (index < 0) return false;
  for (let i = 0; i < index; i++) {
    if (!meetsThreshold(cards, stages[i])) return false;
  }
  return true;
}

/**
 * 列出目前已解鎖的關卡 id。由第一關起逐一判斷，遇到第一個未解鎖的就停——
 * 關卡線性，後面不必再看。
 * @param {object[]} cards
 * @param {object[]} stages
 * @returns {number[]}
 */
export function computeUnlockedStages(cards, stages) {
  const unlocked = [];
  for (let i = 0; i < stages.length; i++) {
    if (i > 0 && !meetsThreshold(cards, stages[i - 1])) break;
    unlocked.push(stages[i].id);
  }
  return unlocked;
}

/**
 * 匯總整份狀態的學習進度，供首頁顯示。
 * `byStage` 每筆含 `required`（解開下一關所需的達標數），
 * 首頁的「再讓 N 個元素進入第 3 盒」就是 required - mastered。
 * @param {object} state 完整狀態（cards 為以原子序為鍵的物件）
 * @param {object[]} stages
 * @returns {{ answered: number, correct: number, accuracy: number,
 *             masteredCount: number, totalCount: number, byStage: object[] }}
 */
export function summarize(state, stages) {
  const cards = cardList(state && state.cards);
  const stats = (state && state.stats) || {};
  const answered = typeof stats.totalAnswered === 'number' ? stats.totalAnswered : 0;
  const correct = typeof stats.totalCorrect === 'number' ? stats.totalCorrect : 0;

  const byStage = stages.map(stage => {
    const c = stageCompletion(cards, stage);
    return {
      id: stage.id,
      name: stage.name,
      total: c.total,
      mastered: c.mastered,
      ratio: c.ratio,
      required: unlockRequirement(stage),
      unlocked: isStageUnlocked(cards, stages, stage.id)
    };
  });

  return {
    answered,
    correct,
    accuracy: answered === 0 ? 0 : correct / answered,
    masteredCount: byStage.reduce((sum, s) => sum + s.mastered, 0),
    totalCount: byStage.reduce((sum, s) => sum + s.total, 0),
    byStage
  };
}
