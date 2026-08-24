// 八族口訣的場景插圖（Plan 2 的內容，提前到 Plan 1 做）。
//
// 授權（spec §8.1）：口訣原圖 `元素表口訣.jpg` 的插畫**不可使用**，那是
// @酪梨寶 的原創畫作。可以使用的是「場景概念」——佳如、被雷劈的蓋斯、
// 飛機、楊柳溪、鱷魚、乃亞克。以下所有圖形都是依這些概念自行重畫的
// 幾何構成，沒有描摹、沒有裁切、沒有引用任何外部素材。
//
// 為什麼用 JS 字串而不是 assets/*.svg 檔：外部載入的 SVG 拿不到頁面的
// CSS 變數，深色模式就得再維護一套色值。內嵌之後所有顏色走
// currentColor 與 --accent／--accent-2，主題換了插圖自動跟著換，
// 也省掉八個額外請求。
//
// 畫風約定（之後補畫或修改時請遵守）：
//   - viewBox 一律 0 0 160 100，讓八張圖在版面上等高
//   - 只用線條與單純色塊，stroke-width 3、圓角端點
//   - 不寫死任何色碼；主色 currentColor，強調色 var(--accent)／var(--accent-2)
//   - 圖要能在 320px 寬的手機上縮到約 140px 仍看得出在畫什麼

const HEAD = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="currentColor" stroke-width="3"/>`;

// 站著的人：頭、身體、兩腿、兩臂
const PERSON = (x, y) => `
  ${HEAD(x, y, 9)}
  <path d="M${x} ${y + 9} V${y + 34} M${x} ${y + 16} l-11 8 M${x} ${y + 16} l11 8
           M${x} ${y + 34} l-9 14 M${x} ${y + 34} l9 14"
        fill="none" stroke="currentColor" stroke-width="3"
        stroke-linecap="round" stroke-linejoin="round"/>`;

const SCENE_ART = {
  // 1A 請你讓佳如設法：一個叫佳如的女生站著想辦法
  '1A': `
    ${PERSON(52, 26)}
    <path d="M100 20 h44 a6 6 0 0 1 6 6 v20 a6 6 0 0 1 -6 6 h-30 l-10 9 v-9 h-4
             a6 6 0 0 1 -6 -6 v-20 a6 6 0 0 1 6 -6 z"
          fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>
    <text x="122" y="44" text-anchor="middle" font-size="20" font-weight="700"
          fill="var(--accent)">？</text>
    <circle cx="88" cy="58" r="3" fill="var(--accent)"/>
    <circle cx="80" cy="65" r="2" fill="var(--accent)"/>`,

  // 2A 媲美蓋斯被雷：想著被雷劈到的蓋斯
  '2A': `
    ${PERSON(104, 34)}
    <path d="M40 8 l26 0 -14 26 18 0 -30 42 8 -30 -18 0 z"
          fill="var(--accent-2)" stroke="none"/>
    <path d="M124 28 l8 -7 M134 40 l10 -5" stroke="var(--accent-2)"
          stroke-width="3" stroke-linecap="round"/>`,

  // 3A 朋屢嫁英他：朋友屢次搭飛機嫁到英國去
  '3A': `
    <path d="M18 74 q40 -46 96 -52" fill="none" stroke="var(--text-dim)"
          stroke-width="2" stroke-dasharray="5 6" stroke-linecap="round"/>
    <path d="M150 44 L104 36 L86 36 L62 16 L50 16 L66 38 L44 40 L34 30 L26 30
             L30 44 L26 58 L34 58 L44 48 L66 50 L50 72 L62 72 L86 52 L104 52 Z"
          fill="currentColor" stroke="none"/>
    <path d="M30 60 a10 10 0 0 1 18 0 a10 10 0 0 1 18 0 q0 14 -18 26 q-18 -12 -18 -26 z"
          fill="var(--accent)" stroke="none"/>`,

  // 4A 嘆息著西遷：嘆著氣往西邊遷徙
  '4A': `
    <line x1="8" y1="84" x2="152" y2="84" stroke="currentColor"
          stroke-width="3" stroke-linecap="round"/>
    <path d="M14 84 a18 18 0 0 1 36 0 z" fill="var(--accent)"/>
    <path d="M8 74 l-5 -7 M32 60 v-9 M56 74 l5 -7" stroke="var(--accent)"
          stroke-width="3" stroke-linecap="round"/>
    ${HEAD(102, 30, 9)}
    <path d="M102 39 V62 M102 46 l14 8 M102 46 l-14 4
             M102 62 l-16 20 M102 62 l10 20"
          fill="none" stroke="currentColor" stroke-width="3"
          stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M114 24 q11 -6 21 -2" fill="none" stroke="var(--text-dim)"
          stroke-width="3" stroke-linecap="round" stroke-dasharray="4 5"/>
    <path d="M80 70 h-22 M58 70 l8 -6 M58 70 l8 6" fill="none"
          stroke="var(--text-dim)" stroke-width="3"
          stroke-linecap="round" stroke-linejoin="round"/>`,

  // 5A 但你身體病：但你身體生病了
  '5A': `
    <rect x="16" y="52" width="112" height="30" rx="6"
          fill="none" stroke="currentColor" stroke-width="3"/>
    <path d="M16 62 h112" stroke="currentColor" stroke-width="3"/>
    ${HEAD(38, 42, 9)}
    <path d="M50 52 h64" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    <rect x="126" y="18" width="8" height="40" rx="4"
          fill="none" stroke="var(--accent-2)" stroke-width="3"/>
    <circle cx="130" cy="64" r="8" fill="var(--accent-2)"/>
    <path d="M56 28 h18 M65 19 v18" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>`,

  // 6A 楊柳溪地破：楊柳樹下的小溪，地被水沖破
  '6A': `
    <path d="M46 88 V34" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="46" cy="28" rx="30" ry="18" fill="var(--accent)"/>
    <path d="M18 38 q-3 22 1 38 M30 42 q-4 20 -1 34 M62 42 q4 20 1 34
             M74 38 q3 22 -1 38 M40 46 q-2 16 0 26 M52 46 q2 16 0 26"
          fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
    <path d="M8 90 q16 -10 32 0 t32 0 t32 0 t32 0" fill="none"
          stroke="var(--accent-2)" stroke-width="3" stroke-linecap="round"/>
    <path d="M96 74 l10 -8 6 10 10 -6" fill="none" stroke="var(--text-dim)"
          stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,

  // 7A 浮綠秀點鱷：溪裡浮著一隻綠色的鱷魚
  '7A': `
    <path d="M16 58 q0 -12 16 -12 h58 l48 9 -48 9 H32 q-16 0 -16 -6 z"
          fill="var(--accent)" stroke="none"/>
    <path d="M36 46 l7 -11 7 11 M58 46 l7 -11 7 11 M80 46 l7 -11 7 11"
          fill="var(--accent)" stroke="none"/>
    <circle cx="96" cy="50" r="6" fill="var(--accent)"/>
    <circle cx="96" cy="49" r="2.5" fill="var(--surface)"/>
    <path d="M120 58 l12 2 M120 63 l12 -2" stroke="var(--surface)"
          stroke-width="2" stroke-linecap="round"/>
    <path d="M4 64 q14 -9 28 0 t28 0 t28 0 t28 0 t28 0" fill="none"
          stroke="var(--accent-2)" stroke-width="4" stroke-linecap="round"/>
    <path d="M4 80 q14 -9 28 0 t28 0 t28 0 t28 0 t28 0" fill="none"
          stroke="var(--accent-2)" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`,

  // 8A 害乃亞克先動：乃亞克被鱷魚嚇到先動了
  '8A': `
    ${HEAD(70, 34, 10)}
    <path d="M70 44 V66 M70 50 l-16 -12 M70 50 l16 -12 M70 66 l-12 18 M70 66 l12 18"
          fill="none" stroke="currentColor" stroke-width="3"
          stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M30 22 l-8 -12 M42 14 l-2 -12 M100 14 l2 -12 M112 22 l8 -12"
          stroke="var(--accent-2)" stroke-width="3" stroke-linecap="round"/>
    <circle cx="66" cy="32" r="2" fill="currentColor"/>
    <circle cx="74" cy="32" r="2" fill="currentColor"/>`
};

/**
 * 產生某一族的場景插圖。沒有對應的族回傳 null，由呼叫端決定要不要留白。
 * @param {string} groupCode 例如 '1A'
 * @param {string} [label] 給輔助技術用的說明，通常直接傳該族的 scene 文字
 * @returns {SVGElement | null}
 */
export function renderSceneArt(groupCode, label) {
  const art = SCENE_ART[groupCode];
  if (!art) return null;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 160 100');
  svg.setAttribute('class', 'scene-art');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label || `${groupCode} 的口訣場景`);
  svg.innerHTML = art;
  return svg;
}

export { SCENE_ART };
