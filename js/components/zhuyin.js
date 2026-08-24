// 注音的直寫呈現。
//
// 台灣課本的注音是直排在字的右側，聲調符號另外放：
// 二、三、四聲標在音節右側偏下，輕聲（˙）標在正上方。
// 單純把整串字元丟給 writing-mode 會讓聲調符號跟著疊到最下面一格，
// 變成「ㄋ／ㄚ／ˋ」三層，那不是注音的寫法——所以這裡把聲調拆出來
// 獨立定位。
//
// 週期表格子、元素詳細面板、教學畫面三個地方共用這個函式，
// 樣式放在 css/components.css（那是三邊都會載入的檔案）。

const TONE_MARKS = 'ˊˇˋ˙';
const NEUTRAL_TONE = '˙';

/**
 * 把注音字串拆成「音節本體」與「聲調符號」。
 * @param {string} zhuyin 例如 'ㄋㄚˋ'
 * @returns {{ base: string, tone: string }}
 */
export function splitZhuyin(zhuyin) {
  const chars = Array.from(zhuyin || '');
  const base = chars.filter(c => TONE_MARKS.indexOf(c) < 0).join('');
  const tone = chars.filter(c => TONE_MARKS.indexOf(c) >= 0).join('');
  return { base, tone };
}

/**
 * 產生一個直寫注音的節點。注音為空時回傳 null，由呼叫端決定要不要放。
 * @param {string} zhuyin
 * @param {string} [className] 額外的 class，用來調字級
 * @returns {HTMLElement | null}
 */
export function renderZhuyin(zhuyin, className) {
  const { base, tone } = splitZhuyin(zhuyin);
  if (!base) return null;

  const wrap = document.createElement('span');
  wrap.className = className ? `zhuyin ${className}` : 'zhuyin';
  // 讀螢幕與複製文字時給回原本的橫式字串，直寫只是視覺呈現。
  wrap.setAttribute('aria-label', zhuyin);

  const baseNode = document.createElement('span');
  baseNode.className = 'zhuyin-base';
  baseNode.textContent = base;
  wrap.appendChild(baseNode);

  if (tone) {
    const toneNode = document.createElement('span');
    toneNode.className = tone === NEUTRAL_TONE ? 'zhuyin-tone is-neutral' : 'zhuyin-tone';
    toneNode.textContent = tone;
    wrap.appendChild(toneNode);
  }
  return wrap;
}
