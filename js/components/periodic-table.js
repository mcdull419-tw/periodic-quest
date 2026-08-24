// 互動式週期表元件（task 3.1）。
//
// 唯一對外介面是 renderPeriodicTable()。它只負責「畫出一張表並回報點擊」，
// 不知道任何關於題目、進度、關卡的事——週期表查詢畫面（3.2）、
// 記憶法教學畫面（3.3）、table-locate 題型（3.4）都會重用它。
//
// 這個檔案在 js/components/ 而非 js/core/，可以碰 DOM。
// 顏色一律取自 css/tokens.css 的變數，這裡不硬寫任何色值。

// 主表是 18 欄 × 7 列。鑭系與錒系不排進主表，另外放到下方兩列
// （第 9、10 列，第 8 列留白當間隔），主表第 3 欄第 6／7 列改放佔位格。
const MAIN_COLUMNS = 18;
const F_BLOCK_ROW = { lanthanide: 9, actinide: 10 };
const F_BLOCK_START_COLUMN = 3;

/**
 * 建一個元素格子。
 * @param {object} el 元素資料
 * @param {'browse' | 'locate'} mode
 * @returns {HTMLButtonElement}
 */
function createCell(el, mode) {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.className = 'pt-cell';
  cell.dataset.z = String(el.z);
  cell.dataset.category = el.category;
  if (el.mainGroup) cell.dataset.mainGroup = el.mainGroup;

  const num = document.createElement('span');
  num.className = 'pt-z';
  num.textContent = String(el.z);
  cell.appendChild(num);

  if (mode === 'locate') {
    // 答題用：不給符號也不給中文名，否則「這個元素在哪一格」的題目
    // 等於把答案印在格子上。原子序留著，學生才有辦法描述自己點了哪裡。
    cell.setAttribute('aria-label', `第 ${el.z} 號元素`);
  } else {
    const symbol = document.createElement('span');
    symbol.className = 'pt-symbol';
    symbol.textContent = el.symbol;

    const zh = document.createElement('span');
    zh.className = 'pt-zh';
    zh.textContent = el.zh;

    cell.append(symbol, zh);
    cell.setAttribute('aria-label', `${el.z} ${el.zh} ${el.symbol}`);
  }
  return cell;
}

/**
 * 建主表裡代表鑭系／錒系的佔位格。這一格不可點，只是告訴讀者
 * 「這段元素被移到下面去了」。
 * @param {string} label 例如 '57–71'
 * @param {number} row
 * @returns {HTMLElement}
 */
function createPlaceholder(label, row) {
  const cell = document.createElement('div');
  cell.className = 'pt-cell pt-placeholder';
  cell.textContent = label;
  cell.style.gridColumn = String(F_BLOCK_START_COLUMN);
  cell.style.gridRow = String(row);
  return cell;
}

/**
 * 畫出週期表。會清空 container 後重畫，要更新高亮就整個重呼叫一次。
 *
 * @param {HTMLElement} container 容器
 * @param {object[]} elements 元素資料陣列（通常是 data/elements.json 的全部 118 筆）
 * @param {object} [options]
 * @param {(element: object) => void} [options.onSelect] 點擊格子時呼叫
 * @param {string | null} [options.highlightGroup] 主族代號，例如 '1A'，整族高亮
 * @param {number[]} [options.highlightZ] 個別高亮的原子序
 * @param {'browse' | 'locate'} [options.mode] locate 模式下格子不顯示符號與中文名
 * @returns {void}
 */
export function renderPeriodicTable(container, elements, options = {}) {
  const { onSelect, highlightGroup = null, highlightZ = [], mode = 'browse' } = options;
  const highlightSet = new Set(highlightZ);

  container.innerHTML = '';

  // 捲動只發生在這一層。頁面本身不得出現水平捲動——18 欄 × 最小 44px
  // 一定超出手機寬度，若讓它撐開 body，整個 App 的版面都會跟著歪掉。
  const scroller = document.createElement('div');
  scroller.className = 'pt-scroll';

  const grid = document.createElement('div');
  grid.className = 'pt-grid';
  grid.dataset.mode = mode;
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', '元素週期表');

  const fBlock = [];

  for (const el of elements) {
    const row = F_BLOCK_ROW[el.category];
    if (row) {
      fBlock.push(el);
      continue;
    }
    const cell = createCell(el, mode);
    cell.style.gridColumn = String(el.group);
    cell.style.gridRow = String(el.period);
    grid.appendChild(cell);
  }

  // 鑭系／錒系：各自依原子序排好，從第 3 欄開始一路往右排。
  // 依 category 分組再排序，不假設輸入的順序。
  for (const category of Object.keys(F_BLOCK_ROW)) {
    const series = fBlock
      .filter(el => el.category === category)
      .sort((a, b) => a.z - b.z);
    series.forEach((el, i) => {
      const cell = createCell(el, mode);
      cell.style.gridColumn = String(F_BLOCK_START_COLUMN + i);
      cell.style.gridRow = String(F_BLOCK_ROW[category]);
      grid.appendChild(cell);
    });
    if (series.length > 0) {
      const first = series[0].z;
      const last = series[series.length - 1].z;
      grid.appendChild(createPlaceholder(
        `${first}–${last}`,
        // 佔位格放在主表裡該系列所屬的週期列（鑭系第 6 列、錒系第 7 列）
        series[0].period
      ));
    }
  }

  // 高亮：整族與個別原子序兩種來源，套的是同一個 class。
  grid.querySelectorAll('.pt-cell[data-z]').forEach(cell => {
    const z = Number(cell.dataset.z);
    const inGroup = highlightGroup !== null && cell.dataset.mainGroup === highlightGroup;
    if (inGroup || highlightSet.has(z)) cell.classList.add('is-highlight');
    else if (highlightGroup !== null || highlightSet.size > 0) cell.classList.add('is-dimmed');
  });

  if (typeof onSelect === 'function') {
    // 用事件委派而非逐格掛 listener：118 個 listener 在每次重畫時
    // 都要重新建立，而重畫是高亮變動的唯一手段，會很頻繁。
    grid.addEventListener('click', event => {
      const cell = event.target.closest('.pt-cell[data-z]');
      if (!cell || !grid.contains(cell)) return;
      const el = elements.find(e => e.z === Number(cell.dataset.z));
      if (el) onSelect(el);
    });
  }

  scroller.appendChild(grid);
  container.appendChild(scroller);
}

export { MAIN_COLUMNS };
