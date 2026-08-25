// 首頁（task 3.5）。
//
// 學生一打開 App 看到的第一個畫面，要回答三個問題：
// 今天該做什麼、我學到哪裡了、下一關要怎麼解開。

import { loadData } from '../data/load.js';
import { loadState, saveState } from '../core/store.js';
import { summarize, computeUnlockedStages } from '../core/progress.js';
import { dueCards } from '../core/scheduler.js';
import { navigate } from '../main.js';
import { BUILD } from '../version.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** state.cards 轉陣列，並過濾掉手動竄改過的壞資料。 */
function cardArray(state) {
  const cards = state && state.cards;
  if (!cards || typeof cards !== 'object') return [];
  return Object.keys(cards).map(k => cards[k])
    .filter(c => c && typeof c === 'object' && typeof c.z === 'number');
}

/**
 * 一個關卡的進度列。
 * @param {object} stage summarize 的 byStage 項目
 * @param {object | null} prev 前一關的項目，用來算解鎖條件
 * @returns {HTMLElement}
 */
function renderStageRow(stage, prev) {
  const row = el('div', stage.unlocked ? 'stage-row' : 'stage-row is-locked');

  const head = el('div', 'stage-head');
  head.append(
    el('span', 'stage-name', `${stage.id}　${stage.name}`),
    el('span', 'stage-count', `${stage.mastered} / ${stage.total}`)
  );
  row.appendChild(head);

  const bar = el('div', 'bar');
  const fill = el('div', 'bar-fill');
  // 用 style 直接設寬度是刻意的：進度是連續值，沒辦法用 class 表達。
  fill.style.width = `${Math.round(stage.ratio * 100)}%`;
  bar.appendChild(fill);
  row.appendChild(bar);

  if (!stage.unlocked && prev) {
    const need = Math.max(0, prev.required - prev.mastered);
    row.appendChild(el('p', 'stage-lock',
      `鎖定中：再讓「${prev.name}」的 ${need} 個元素進入第 3 盒就會解開`));
  }
  return row;
}

/**
 * 找出「下一個該學的族」。
 * 取第一個已解鎖但還沒練完的關卡，用它的第一個族。
 * 過渡金屬那一關沒有主族口訣（groups 是空陣列），回傳 null 讓呼叫端
 * 改導去週期表。
 * @param {object[]} byStage
 * @param {object[]} stages
 * @returns {string | null}
 */
function nextGroupToLearn(byStage, stages) {
  for (const s of byStage) {
    if (!s.unlocked) break;
    if (s.mastered >= s.total) continue;
    const stage = stages.find(x => x.id === s.id);
    if (stage && stage.groups.length > 0) return stage.groups[0];
    return null;
  }
  return null;
}

/**
 * 註冊用的畫面渲染函式。
 * @param {HTMLElement} container 清空後的 #app
 */
export function renderHomeScreen(container) {
  const loading = el('p', 'muted', '載入中…');
  container.appendChild(loading);

  loadData().then(data => {
    loading.remove();
    let state = loadState(localStorage);
    const cards = cardArray(state);

    // 與 quiz-runner 一致：解鎖狀態以算出來的為準，存的只當快取。
    const unlocked = computeUnlockedStages(cards, data.stages);
    if (JSON.stringify(state.unlockedStages) !== JSON.stringify(unlocked)) {
      state = Object.assign({}, state, { unlockedStages: unlocked });
      saveState(localStorage, state);
    }

    const s = summarize(state, data.stages);
    const due = dueCards(cards, Date.now()).length;

    container.appendChild(el('h2', 'screen-title', '元素週期表大挑戰'));

    // ---- 今天該做什麼 ------------------------------------------------
    const today = el('section', 'card');
    today.appendChild(el('p', 'today-line',
      due > 0 ? `今天有 ${due} 張卡要複習` : '今天沒有要複習的卡'));
    const actions = el('div', 'learn-nav');

    const review = el('button', 'btn btn-primary', '開始複習');
    review.type = 'button';
    review.disabled = due === 0;
    review.onclick = () => navigate('review');

    const learnGroup = nextGroupToLearn(s.byStage, data.stages);
    const learn = el('button', due > 0 ? 'btn' : 'btn btn-primary', '學新的一族');
    learn.type = 'button';
    learn.onclick = () => {
      if (learnGroup) navigate('learn', { group: learnGroup });
      else navigate('table');
    };

    actions.append(review, learn);
    today.appendChild(actions);
    container.appendChild(today);

    // ---- 整體進度 ----------------------------------------------------
    const overview = el('section', 'card');
    overview.appendChild(el('h3', 'detail-subtitle', '整體進度'));
    const dl = el('dl', 'detail-list');
    const rate = s.answered === 0 ? '尚未作答' : `${Math.round(s.accuracy * 100)}%`;
    [['已解鎖關卡', `${unlocked.length} / ${data.stages.length}`],
     ['記熟的元素', `${s.masteredCount} / ${s.totalCount}`],
     ['累計答題', `${s.answered} 題`],
     ['總正確率', rate]].forEach(([k, v]) => {
      dl.append(el('dt', null, k), el('dd', null, v));
    });
    overview.appendChild(dl);
    container.appendChild(overview);

    // ---- 各關卡 ------------------------------------------------------
    const stagesBox = el('section', 'card');
    stagesBox.appendChild(el('h3', 'detail-subtitle', '關卡'));
    s.byStage.forEach((stage, i) => {
      stagesBox.appendChild(renderStageRow(stage, i > 0 ? s.byStage[i - 1] : null));
    });
    container.appendChild(stagesBox);

    // 版本標示。看起來多餘，但「我現在看到的是哪一版」在快取出問題時
    // 是最先要回答的問題，而畫面上看不出來的話只能靠猜。
    container.appendChild(el('p', 'muted build-mark', `版本 ${BUILD}`));
  }).catch(err => {
    container.appendChild(el('p', 'muted error', '資料載入失敗：' + err.message));
  });
}
