// 週期表查詢畫面（task 3.2，spec §7.3）。
//
// 這是學生最常用的功能之一，且**不受關卡解鎖限制**——118 個元素全部可查。
// 解鎖只約束出題範圍（見 js/core/quiz.js），不約束查詢。

import { renderPeriodicTable } from '../components/periodic-table.js';
import { loadData } from '../data/load.js';
import { loadState, saveState } from '../core/store.js';

// 元素分類的中文標籤。這份對照只有顯示用途，不影響任何邏輯判斷。
const CATEGORY_LABELS = {
  'alkali-metal': '鹼金屬',
  'alkaline-earth': '鹼土金屬',
  'transition-metal': '過渡金屬',
  'post-transition-metal': '後過渡金屬',
  'metalloid': '類金屬',
  'nonmetal': '非金屬',
  'halogen': '鹵素',
  'noble-gas': '惰性氣體',
  'lanthanide': '鑭系元素',
  'actinide': '錒系元素'
};

const STATE_LABELS = { solid: '固態', liquid: '液態', gas: '氣態' };

const GROUP_CODES = ['1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A'];

/**
 * 安全地取出某個原子序的學習卡片。
 * store.js 的 getCard 會直接讀 state.cards[...]，state.cards 若被手動
 * 竄改成 null 就會拋例外——查詢畫面不該因此整個開不了。
 * @param {object} state
 * @param {number} z
 * @returns {object | null}
 */
function cardOf(state, z) {
  const cards = state && state.cards;
  if (!cards || typeof cards !== 'object') return null;
  const card = cards[String(z)];
  return card && typeof card === 'object' ? card : null;
}

/**
 * 把口訣拆成一個個 <span>，指定位置的字加上高亮 class。
 * mapping 的第 i 項對應 chant 的第 i 個字，這是資料本身的約定。
 * @param {string} chant
 * @param {number} index 要高亮的字的位置，-1 表示都不高亮
 * @returns {HTMLElement}
 */
function renderChant(chant, index) {
  const wrap = document.createElement('p');
  wrap.className = 'chant';
  Array.from(chant).forEach((char, i) => {
    const span = document.createElement('span');
    span.className = i === index ? 'chant-char is-hit' : 'chant-char';
    span.textContent = char;
    wrap.appendChild(span);
  });
  return wrap;
}

function row(label, value) {
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value;
  return [dt, dd];
}

/**
 * 元素詳細面板。
 * @param {object} el
 * @param {object[]} groups
 * @param {object} state
 * @returns {HTMLElement}
 */
function renderDetail(el, groups, state) {
  const panel = document.createElement('section');
  panel.className = 'card detail';
  panel.setAttribute('aria-live', 'polite');

  const head = document.createElement('header');
  head.className = 'detail-head';
  head.dataset.category = el.category;

  const sym = document.createElement('span');
  sym.className = 'detail-symbol';
  sym.textContent = el.symbol;

  const names = document.createElement('span');
  names.className = 'detail-names';
  const zh = document.createElement('b');
  zh.textContent = el.zh;
  const zhuyin = document.createElement('span');
  zhuyin.className = 'detail-zhuyin';
  zhuyin.textContent = el.zhuyin || '';
  const en = document.createElement('span');
  en.className = 'detail-en';
  en.textContent = el.en;
  names.append(zh, zhuyin, en);

  const num = document.createElement('span');
  num.className = 'detail-z';
  num.textContent = el.z;

  head.append(num, sym, names);
  panel.appendChild(head);

  const dl = document.createElement('dl');
  dl.className = 'detail-list';
  const groupText = el.mainGroup ? `第 ${el.group} 族（${el.mainGroup}）` : `第 ${el.group} 族`;
  dl.append(
    ...row('週期', `第 ${el.period} 週期`),
    ...row('族', groupText),
    ...row('分類', CATEGORY_LABELS[el.category] || el.category),
    ...row('原子量', String(el.mass)),
    ...row('常溫狀態', STATE_LABELS[el.state] || el.state)
  );
  panel.appendChild(dl);

  // 口訣：只有主族元素才有。過渡金屬、鑭錒系不顯示這一區，也不報錯。
  if (el.mainGroup) {
    const groupDef = groups.find(g => g.group === el.mainGroup);
    if (groupDef) {
      const title = document.createElement('h3');
      title.className = 'detail-subtitle';
      title.textContent = `${groupDef.name}口訣`;
      const index = groupDef.mapping.findIndex(m => m.z === el.z);
      panel.append(title, renderChant(groupDef.chant, index));
    }
  }

  // 學習記錄。沒學過就明講「尚未學習」，不要留白或印出 undefined。
  const card = cardOf(state, el.z);
  const progress = document.createElement('p');
  progress.className = 'detail-progress';
  progress.textContent = card
    ? `學習狀態：第 ${card.box} 盒（答對 ${card.correct} 次、答錯 ${card.wrong} 次）`
    : '學習狀態：尚未學習';
  panel.appendChild(progress);

  return panel;
}

/**
 * 註冊用的畫面渲染函式。
 * @param {HTMLElement} container 清空後的 #app
 * @param {Record<string, string>} params hash 的查詢參數，支援 ?group=1A
 */
export function renderTableScreen(container, params) {
  const title = document.createElement('h2');
  title.className = 'screen-title';
  title.textContent = '週期表';

  const loading = document.createElement('p');
  loading.className = 'muted';
  loading.textContent = '載入中…';

  container.append(title, loading);

  loadData().then(({ elements, groups }) => {
    loading.remove();

    let state = loadState(localStorage);
    let selectedGroup = GROUP_CODES.indexOf(params.group) >= 0 ? params.group : null;
    let selectedZ = null;
    // 存進 settings 而不是只留在記憶體：學生每次進週期表都要重按一次開關
    // 會很煩。settings 原本就沒有這個欄位，undefined 代表關閉，
    // 因此不需要為它寫 schema migration。
    let showZhuyin = !!(state.settings && state.settings.showZhuyin);

    function setShowZhuyin(next) {
      showZhuyin = next;
      const settings = Object.assign({}, state.settings, { showZhuyin: next });
      state = Object.assign({}, state, { settings });
      saveState(localStorage, state);
      draw();
    }

    const filters = document.createElement('div');
    filters.className = 'group-filters';
    filters.setAttribute('role', 'group');
    filters.setAttribute('aria-label', '依主族篩選');

    const chantSlot = document.createElement('div');
    chantSlot.className = 'chant-slot';

    const toggleRow = document.createElement('div');
    toggleRow.className = 'group-filters';
    const zhuyinToggle = document.createElement('button');
    zhuyinToggle.type = 'button';
    zhuyinToggle.className = 'chip';
    zhuyinToggle.textContent = '顯示注音';
    zhuyinToggle.onclick = () => setShowZhuyin(!showZhuyin);
    toggleRow.appendChild(zhuyinToggle);

    const tableHost = document.createElement('div');
    const detailSlot = document.createElement('div');

    function drawFilters() {
      filters.innerHTML = '';
      [{ code: null, label: '全部' }, ...GROUP_CODES.map(c => ({ code: c, label: c }))]
        .forEach(({ code, label }) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'chip';
          btn.textContent = label;
          if (code === selectedGroup) btn.setAttribute('aria-pressed', 'true');
          else btn.setAttribute('aria-pressed', 'false');
          btn.onclick = () => { selectedGroup = code; draw(); };
          filters.appendChild(btn);
        });
    }

    function drawChant() {
      chantSlot.innerHTML = '';
      if (!selectedGroup) return;
      const groupDef = groups.find(g => g.group === selectedGroup);
      if (!groupDef) return;
      const heading = document.createElement('p');
      heading.className = 'muted';
      heading.textContent = `${groupDef.name}（${groupDef.group}）`;
      chantSlot.append(heading, renderChant(groupDef.chant, -1));
    }

    function drawDetail() {
      detailSlot.innerHTML = '';
      if (selectedZ === null) {
        const hint = document.createElement('p');
        hint.className = 'muted';
        hint.textContent = '點任何一格看詳細資料。';
        detailSlot.appendChild(hint);
        return;
      }
      const el = elements.find(e => e.z === selectedZ);
      if (el) detailSlot.appendChild(renderDetail(el, groups, state));
    }

    function draw() {
      drawFilters();
      drawChant();
      zhuyinToggle.setAttribute('aria-pressed', showZhuyin ? 'true' : 'false');
      renderPeriodicTable(tableHost, elements, {
        highlightGroup: selectedGroup,
        highlightZ: selectedZ === null ? [] : [selectedZ],
        showZhuyin,
        onSelect: el => { selectedZ = el.z; draw(); }
      });
      drawDetail();
    }

    container.append(filters, toggleRow, chantSlot, tableHost, detailSlot);
    draw();
  }).catch(err => {
    loading.className = 'muted error';
    loading.textContent = '資料載入失敗：' + err.message;
  });
}
