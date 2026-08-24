// 題目生成與判分（task 2.5）。
//
// 承接 js/core/quiz.js（task 2.3：來源池與權重／task 2.4：干擾選項）。
// quiz.js 加上本檔的內容會超過 400 行的檔案長度上限，因此拆成兩個檔案：
//   quiz.js     —— 來源池、抽題權重、干擾選項（task 2.3、2.4，未更動）
//   question.js —— 七種題型的生成與判分（本檔）
// 分節方式沿用 quiz.js 的慣例：一個區段對應一件事，不把所有東西塞進
// 一個大函式。
//
// 純函式，不得存取 document / window / localStorage 等全域物件，
// 這樣測試才能在沒有瀏覽器的 JXA 環境下執行。

import { buildDistractors, buildPools, pickSource, availableElements } from './quiz.js';

/**
 * 把陣列依 Fisher-Yates 演算法用 rng 洗牌，回傳新陣列（不修改原陣列）。
 * 與 quiz.js 內部的同名函式邏輯相同；quiz.js 沒有匯出它（task 2.3／2.4
 * 的既有函式不更動），這裡獨立保留一份小型工具函式，避免為了共用
 * 8 行程式碼而動到前一個 task 已完成的檔案。
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

// ---------------------------------------------------------------------------
// 題目生成
// ---------------------------------------------------------------------------

// 七種題型。順序無特殊意義，僅供 nextQuestion 洗牌重試時使用。
export const QUESTION_TYPES = [
  'symbol-to-zh', 'zh-to-symbol', 'z-to-element', 'symbol-spell',
  'table-locate', 'chant-blank', 'group-id'
];

// 選擇題干擾項數量：連正解共 4 個選項。
const CHOICE_COUNT = 3;

/**
 * 把正解與干擾項洗牌成完整的選項陣列。
 * @param {any} correctValue
 * @param {any[]} distractorValues
 * @param {() => number} rng
 * @returns {any[]}
 */
function buildOptions(correctValue, distractorValues, rng) {
  return shuffle([correctValue, ...distractorValues], rng);
}

/**
 * symbol-to-zh／zh-to-symbol／z-to-element 共用的選擇題骨架：
 * 用 buildDistractors 取同批候選元素，再各自取出要顯示的欄位。
 * @param {object} el 目標元素
 * @param {object[]} allElements 干擾項候選範圍（呼叫端已限縮到解鎖範圍）
 * @param {(e: object) => any} pickValue 從元素取出要顯示的值（symbol／zh／z）
 * @param {() => number} rng
 * @returns {any[]} 洗牌後的選項陣列
 */
function choiceOptions(el, allElements, pickValue, rng) {
  const distractors = buildDistractors(el, allElements, CHOICE_COUNT, rng);
  return buildOptions(pickValue(el), distractors.map(pickValue), rng);
}

function makeSymbolToZh(el, data, rng) {
  return {
    type: 'symbol-to-zh', z: el.z, prompt: el.symbol,
    options: choiceOptions(el, data.elements, e => e.zh, rng),
    answer: el.zh, groupRef: el.mainGroup
  };
}

function makeZhToSymbol(el, data, rng) {
  return {
    type: 'zh-to-symbol', z: el.z, prompt: el.zh,
    options: choiceOptions(el, data.elements, e => e.symbol, rng),
    answer: el.symbol, groupRef: el.mainGroup
  };
}

function makeZToElement(el, data, rng) {
  return {
    type: 'z-to-element', z: el.z, prompt: String(el.z),
    options: choiceOptions(el, data.elements, e => e.symbol, rng),
    answer: el.symbol, groupRef: el.mainGroup
  };
}

// symbol-spell 是填空題（沒有 options），題幹給中文名，要求拼出符號。
function makeSymbolSpell(el) {
  return {
    type: 'symbol-spell', z: el.z, prompt: el.zh,
    options: null, answer: el.symbol, groupRef: el.mainGroup
  };
}

// table-locate 也是填空題：給符號，要求答出在週期表上的「週期、族數」座標。
// 這裡的族數用元素本身的數字族（1-18，group 欄位），不是主族代號 mainGroup，
// 因為這題考的是實際格子座標，過渡金屬也答得出來。
function makeTableLocate(el) {
  return {
    type: 'table-locate', z: el.z, prompt: el.symbol,
    options: null, answer: { period: el.period, group: el.group },
    groupRef: el.mainGroup
  };
}

// chant-blank：挖掉口訣裡對應該元素的那個字。
// mapping 陣列與 chant 字串逐字一一對應（第 i 個字對應 mapping[i]），
// 這是資料本身的約定，不是這裡臨時推斷的規則。
// 過渡金屬沒有 mainGroup、也就沒有對應口訣，回傳 null。
function makeChantBlank(el, data) {
  if (!el.mainGroup) return null;
  const groupDef = data.groups.find(g => g.group === el.mainGroup);
  if (!groupDef || !groupDef.chant) return null;
  const idx = groupDef.mapping.findIndex(m => m.z === el.z);
  if (idx < 0) return null;
  const chars = Array.from(groupDef.chant);
  if (idx >= chars.length) return null;
  const answer = chars[idx];
  chars[idx] = '□';
  return {
    type: 'chant-blank', z: el.z, prompt: chars.join(''),
    options: null, answer, groupRef: el.mainGroup
  };
}

// group-id：問元素屬於哪一族（主族代號，如 '1A'）。
// 干擾項從資料裡其他族的代號取（同樣由呼叫端限縮到解鎖範圍）；
// 過渡金屬沒有主族，回傳 null。
//
// 只解鎖第一關時，限縮後的 data.groups 只剩 1A 一筆，干擾項會掛零，
// 做出「唯一選項就是正解」的題目——而那正是每個學生開局的處境。
// 這種情況同樣回傳 null，交給 nextQuestion 換別的題型。門檻設在
// 「至少一個干擾項」（兩個選項）而非湊滿 CHOICE_COUNT：後者會讓
// group-id 直到解鎖四個族才出得來，把題型鎖太久。
function makeGroupId(el, data, rng) {
  if (!el.mainGroup) return null;
  const otherRefs = data.groups.filter(g => g.group !== el.mainGroup).map(g => g.group);
  const distractors = shuffle(otherRefs, rng).slice(0, CHOICE_COUNT);
  if (distractors.length === 0) return null;
  return {
    type: 'group-id', z: el.z, prompt: el.symbol,
    options: buildOptions(el.mainGroup, distractors, rng),
    answer: el.mainGroup, groupRef: el.mainGroup
  };
}

const QUESTION_BUILDERS = {
  'symbol-to-zh': makeSymbolToZh,
  'zh-to-symbol': makeZhToSymbol,
  'z-to-element': makeZToElement,
  'symbol-spell': makeSymbolSpell,
  'table-locate': makeTableLocate,
  'chant-blank': makeChantBlank,
  'group-id': makeGroupId
};

/**
 * 依題型與原子序產生一題。組合不適用時（例如過渡金屬沒有口訣）回傳 null，
 * 由呼叫端（nextQuestion）決定要不要換題型重試。
 * @param {string} type QUESTION_TYPES 之一
 * @param {number} z 原子序
 * @param {{ elements: object[], groups: object[], stages: object[] }} data
 * @param {() => number} rng 回傳 [0, 1) 亂數的函式，預設 Math.random
 * @returns {object | null}
 */
export function makeQuestion(type, z, data, rng = Math.random) {
  const builder = QUESTION_BUILDERS[type];
  if (!builder) return null;
  const el = data.elements.find(e => e.z === z);
  if (!el) return null;
  return builder(el, data, rng);
}

/**
 * 列出已解鎖關卡涵蓋的主族代號集合（如 '1A'）。
 * 過渡金屬所在關卡的 groups 為空陣列，不會貢獻任何代號。
 * @param {object[]} stages
 * @param {number[]} unlockedStages
 * @returns {Set<string>}
 */
function unlockedGroupRefs(stages, unlockedStages) {
  const unlocked = new Set(unlockedStages);
  const refs = new Set();
  for (const stage of stages) {
    if (!unlocked.has(stage.id)) continue;
    for (const g of stage.groups) refs.add(g);
  }
  return refs;
}

/**
 * 依 ctx 目前的狀態（卡片、已解鎖關卡）挑一題出來。
 * 流程：算出可用元素池 → 依權重選來源池 → 隨機取一個原子序 →
 * 把 data 限縮到已解鎖範圍（元素與族代號皆是，避免出現學生沒見過的
 * 超重元素或還沒學到的族別）→ 洗牌題型逐一嘗試，取第一個成功產生的題目。
 * 三個池皆空、或所有題型都不適用時回傳 null（後者不會無限重試，
 * 最多嘗試 QUESTION_TYPES.length 次就放棄）。
 * @param {{ cards: object[], stages: object[], unlockedStages: number[],
 *           data: { elements: object[], groups: object[], stages: object[] },
 *           now: number }} ctx
 * @param {() => number} rng 回傳 [0, 1) 亂數的函式，預設 Math.random
 * @returns {object | null}
 */
export function nextQuestion(ctx, rng = Math.random) {
  const availableZ = availableElements(ctx.stages, ctx.unlockedStages);
  const pools = buildPools(ctx.cards, availableZ, ctx.now);
  const source = pickSource(pools, rng);
  if (source === null) return null;

  const candidates = pools[source];
  const z = candidates[Math.floor(rng() * candidates.length)];
  return questionForZ(z, ctx, rng);
}

/**
 * 把 ctx.data 限縮到已解鎖範圍：元素與族代號都要限，否則氦的干擾項會抽到
 * Og（118 號超重元素）、group-id 會出現學生還沒學到的族別。
 * @param {object} ctx 同 nextQuestion 的 ctx
 * @returns {{ elements: object[], groups: object[], stages: object[] }}
 */
export function scopeToUnlocked(ctx) {
  const availableSet = new Set(availableElements(ctx.stages, ctx.unlockedStages));
  const groupRefs = unlockedGroupRefs(ctx.stages, ctx.unlockedStages);
  return {
    elements: ctx.data.elements.filter(e => availableSet.has(e.z)),
    groups: ctx.data.groups.filter(g => groupRefs.has(g.group)),
    stages: ctx.data.stages
  };
}

/**
 * 對指定的原子序出一題：限縮範圍後洗牌題型逐一嘗試，取第一個成功的。
 *
 * 從 nextQuestion 拆出來，是因為複習畫面要「只從到期卡出題」——它自己
 * 決定考哪一個 z，但限縮範圍與換題型重試的規則必須完全一致。留在
 * nextQuestion 裡面的話，UI 層就得自己重寫一份，兩邊遲早會走鐘。
 *
 * 所有題型都不適用時回傳 null（不會無限重試，最多 QUESTION_TYPES.length 次）。
 * @param {number} z 原子序
 * @param {object} ctx 同 nextQuestion 的 ctx
 * @param {() => number} rng
 * @returns {object | null}
 */
export function questionForZ(z, ctx, rng = Math.random) {
  const scopedData = scopeToUnlocked(ctx);
  for (const type of shuffle(QUESTION_TYPES, rng)) {
    const q = makeQuestion(type, z, scopedData, rng);
    if (q) return q;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 判分
// ---------------------------------------------------------------------------

/**
 * 判斷作答是否正確，一律回傳 { correct, correctAnswer } 供畫面顯示回饋。
 * symbol-spell 忽略大小寫與前後空白；table-locate 要求 period、group 皆相符；
 * 其餘題型（含 chant-blank／group-id 這類單值答案）直接精確比對。
 * @param {object} question makeQuestion／nextQuestion 產生的題目
 * @param {any} answer 使用者作答
 * @returns {{ correct: boolean, correctAnswer: any }}
 */
export function checkAnswer(question, answer) {
  const correctAnswer = question.answer;
  let correct;
  if (question.type === 'symbol-spell') {
    correct = String(answer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
  } else if (question.type === 'table-locate') {
    correct = !!answer && answer.period === correctAnswer.period && answer.group === correctAnswer.group;
  } else {
    correct = answer === correctAnswer;
  }
  return { correct, correctAnswer };
}
