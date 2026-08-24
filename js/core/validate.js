// 資料驗證函式：檢查元素、口訣、關卡三份資料的結構與交叉一致性。
//
// 這是整個專案的資料品質關卡——尤其 Task 1.3 由較小的模型建立 118 筆
// 元素資料，本檔案的 validateGroups 會把八族口訣裡的 44 個主族元素
// 與 elements.json 逐一交叉比對符號與中文名，抓出捏造或抄錯的內容。
//
// 純函式，不得存取 document / window / localStorage 等全域物件，
// 這樣測試才能在沒有瀏覽器的 JXA 環境下執行。

// 元素分類列舉：鹼金屬、鹼土金屬、過渡金屬、後過渡金屬、類金屬、
// 非金屬、鹵素、惰性氣體、鑭系、錒系。
export const CATEGORIES = [
  'alkali-metal',
  'alkaline-earth',
  'transition-metal',
  'post-transition-metal',
  'metalloid',
  'nonmetal',
  'halogen',
  'noble-gas',
  'lanthanide',
  'actinide'
];

const SYMBOL_PATTERN = /^[A-Z][a-z]{0,2}$/;
const MAIN_GROUPS = ['1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A'];

// 注音必須恰好是「一個音節」：聲母? + 介音? + 韻母? + 聲調?。
// 元素中文名都是單字，兩個音節一定是抄錯（例如把整個詞的注音貼進來）。
// 一聲不標符號，這是台灣的標準寫法，不是漏標。
const ZHUYIN_PATTERN = /^[ㄅ-ㄙ]?[ㄧㄨㄩ]?[ㄚ-ㄦ]?[ˊˇˋ˙]?$/;

/**
 * 驗證元素資料陣列。
 * @param {Array<object>} elements
 * @returns {string[]} 錯誤訊息陣列，空陣列代表通過。
 */
export function validateElements(elements) {
  const errors = [];
  const seenZ = new Set();
  const zByZh = new Map();

  (elements || []).forEach((el, index) => {
    if (!el || typeof el !== 'object') {
      errors.push(`元素 #${index}：資料不可為 null 或 undefined`);
      return;
    }

    const label = `元素 #${index}（z=${el.z}）`;

    if (!Number.isInteger(el.z) || el.z < 1 || el.z > 118) {
      errors.push(`${label}：z 必須是 1–118 的整數，實際為「${el.z}」`);
    } else if (seenZ.has(el.z)) {
      errors.push(`元素 z=${el.z}：原子序重複出現`);
    } else {
      seenZ.add(el.z);
    }

    if (typeof el.symbol !== 'string' || !SYMBOL_PATTERN.test(el.symbol)) {
      errors.push(`${label}：symbol「${el.symbol}」不符合首字母大寫、其餘小寫的規則`);
    }

    if (typeof el.zh !== 'string' || el.zh.trim().length === 0) {
      errors.push(`${label}：zh（中文名）不可為空`);
    } else if (Number.isInteger(el.z)) {
      // 中文名重複代表資料抄錯（例如兩個原子序被填成同一個字），
      // 這條檢查不需要知道正確答案就能抓到一整類錯誤。
      if (zByZh.has(el.zh)) {
        errors.push(`中文名「${el.zh}」重複：原子序 ${zByZh.get(el.zh)} 與 ${el.z} 使用了同一個字`);
      } else {
        zByZh.set(el.zh, el.z);
      }
    }

    if (typeof el.zhuyin !== 'string' || el.zhuyin.length === 0) {
      errors.push(`${label}：zhuyin（注音）不可為空`);
    } else if (!ZHUYIN_PATTERN.test(el.zhuyin)) {
      errors.push(`${label}：zhuyin「${el.zhuyin}」不是單一注音音節`);
    } else if (!/[ㄅ-ㄦ]/.test(el.zhuyin)) {
      errors.push(`${label}：zhuyin「${el.zhuyin}」只有聲調符號，沒有注音符號`);
    }

    if (!Number.isInteger(el.period) || el.period < 1 || el.period > 7) {
      errors.push(`${label}：period 必須是 1–7 的整數，實際為「${el.period}」`);
    }

    if (!CATEGORIES.includes(el.category)) {
      errors.push(`${label}：category「${el.category}」不在合法列舉內`);
    }

    if (el.mainGroup !== null && !MAIN_GROUPS.includes(el.mainGroup)) {
      errors.push(`${label}：mainGroup 必須是 null 或 1A–8A，實際為「${el.mainGroup}」`);
    }
  });

  return errors;
}

/**
 * 驗證口訣（族）資料，並與元素資料交叉比對。
 * @param {Array<object>} groups
 * @param {Array<object>} elements
 * @returns {string[]} 錯誤訊息陣列，空陣列代表通過。
 */
export function validateGroups(groups, elements) {
  const errors = [];
  const elementsByZ = new Map(
    (elements || []).filter(el => el && typeof el === 'object').map(el => [el.z, el])
  );

  (groups || []).forEach((g, gIndex) => {
    if (!g || typeof g !== 'object') {
      errors.push(`族 #${gIndex}：資料不可為 null 或 undefined`);
      return;
    }

    const chant = typeof g.chant === 'string' ? g.chant : '';
    const mapping = Array.isArray(g.mapping) ? g.mapping : [];
    const groupLabel = `族 ${g.group}`;

    if (chant.length !== mapping.length) {
      errors.push(
        `${groupLabel}：口訣字數（${chant.length}）與 mapping 元素數（${mapping.length}）不符，字數：「${chant}」`
      );
    }

    mapping.forEach((m, i) => {
      if (!m || typeof m !== 'object') {
        errors.push(`${groupLabel}：mapping 第 ${i + 1} 筆資料不可為 null 或 undefined`);
        return;
      }

      if (chant[i] !== undefined && m.char !== chant[i]) {
        errors.push(
          `${groupLabel} 第 ${i + 1} 個字：mapping.char 為「${m.char}」，但口訣第 ${i + 1} 個字為「${chant[i]}」`
        );
      }

      const el = elementsByZ.get(m.z);
      if (!el) {
        errors.push(`${groupLabel}：mapping 指向 z=${m.z}，但 elements 中找不到此原子序`);
        return;
      }

      if (m.symbol !== el.symbol) {
        errors.push(
          `元素 z=${m.z}：符號不一致，elements 為「${el.symbol}」但 mapping 為「${m.symbol}」`
        );
      }

      if (m.zh !== el.zh) {
        errors.push(
          `元素 z=${m.z}：中文名不一致，elements 為「${el.zh}」但 mapping 為「${m.zh}」`
        );
      }
    });
  });

  return errors;
}

/**
 * 驗證關卡資料。
 * @param {Array<object>} stages
 * @param {Array<object>} elements
 * @returns {string[]} 錯誤訊息陣列，空陣列代表通過。
 */
export function validateStages(stages, elements) {
  const errors = [];
  const elementsByZ = new Map(
    (elements || []).filter(el => el && typeof el === 'object').map(el => [el.z, el])
  );
  const seenId = new Set();
  const seenZAcrossStages = new Map(); // z -> 已收錄的 stage id

  (stages || []).forEach((stage, index) => {
    if (!stage || typeof stage !== 'object') {
      errors.push(`關卡 #${index}：資料不可為 null 或 undefined`);
      return;
    }

    const label = `關卡 id=${stage.id}（${stage.name || ''}）`;

    if (seenId.has(stage.id)) {
      errors.push(`關卡 id=${stage.id}：id 重複出現`);
    } else {
      seenId.add(stage.id);
    }

    (stage.elements || []).forEach(z => {
      if (!elementsByZ.has(z)) {
        errors.push(`${label}：elements 內的 z=${z} 在 elements 資料中找不到`);
        return;
      }

      if (seenZAcrossStages.has(z)) {
        errors.push(
          `元素 z=${z}：同時被關卡 id=${seenZAcrossStages.get(z)} 與 id=${stage.id} 收錄，跨關卡重複`
        );
      } else {
        seenZAcrossStages.set(z, stage.id);
      }
    });
  });

  return errors;
}
