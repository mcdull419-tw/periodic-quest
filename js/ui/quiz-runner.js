// 作答流程（task 3.4，裁決 C 提前到這裡建立）。
//
// 「測驗」與「複習」兩個畫面的作答體驗完全相同，差別只在題目從哪裡來，
// 所以流程抽在這裡，由呼叫端傳入 pickQuestion。計畫原本把這個抽取排在
// Task 3.5，但那等於先在 screen-quiz.js 寫一份、再搬過來，白做一次。
//
// **這是整個 App 唯一會寫入學習進度的地方。** 寫入邏輯集中在此，
// 不散落到各畫面——教學畫面的當場小測刻意不寫（見 screen-learn.js）。

import { loadData } from '../data/load.js';
import { renderPeriodicTable } from '../components/periodic-table.js';
import { renderZhuyin } from '../components/zhuyin.js';
import { checkAnswer, ANSWER_MODES, QUESTION_PROMPTS } from '../core/question.js';
import { newCard, reviewCard } from '../core/scheduler.js';
import { computeUnlockedStages } from '../core/progress.js';
import { loadState, saveState, upsertCard } from '../core/store.js';

// 一輪測驗的題數上限。
const DEFAULT_LIMIT = 20;

// stats.sessions 只保留最近幾筆——這份紀錄是給首頁看趨勢用的，
// 不是完整歷史，無上限成長只會把 localStorage 撐爆。
const MAX_SESSIONS = 30;

// 一輪之內，最近考過的幾個元素不要再考。
//
// 為什麼需要這個：答錯的卡會被 reviewCard 退回第 1 盒且 nextDue = now，
// 也就是立刻到期；而到期池的抽題權重是 60%。幾題之後到期池往往只剩
// 「剛剛答錯的那一兩個」，於是整輪測驗會反覆轟炸同一個元素——實測
// 曾出現連續 16 題都在考同一個。這是 Leitner 規則在單一輪次內的副作用，
// 不是 core 的錯（隔天再複習時「立刻到期」是對的），所以修在這一層。
const RECENT_WINDOW = 3;

// 重抽次數上限。到期卡真的只剩一張時重複無可避免，不能無限迴圈。
const PICK_ATTEMPTS = 12;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * 把狀態裡的 cards 物件轉成陣列。core 層的函式一律吃陣列。
 * @param {object} state
 * @returns {object[]}
 */
function cardArray(state) {
  const cards = state && state.cards;
  if (!cards || typeof cards !== 'object') return [];
  return Object.keys(cards).map(k => cards[k])
    .filter(c => c && typeof c === 'object' && typeof c.z === 'number');
}

/**
 * 跑一輪作答。
 * @param {HTMLElement} container
 * @param {object} options
 * @param {string} options.title 畫面標題
 * @param {(ctx: object) => object | null} options.pickQuestion 取題函式，
 *   拿到 { cards, stages, unlockedStages, data, now }，回傳題目或 null。
 * @param {string} options.emptyMessage 取不到題目時顯示的訊息
 * @param {{ label: string, run: () => void } | null} [options.onEmptyAction]
 *   取不到題目時額外給一個出口按鈕。複習畫面用它把學生導去學新的一族——
 *   只丟一句「今天沒有要複習的」就把人晾在原地，等於逼他自己找路。
 * @param {number} [options.limit] 題數上限
 */
export function runQuiz(container, options) {
  const { title, pickQuestion, emptyMessage, onEmptyAction = null,
          limit = DEFAULT_LIMIT } = options;

  const heading = el('h2', 'screen-title', title);
  const loading = el('p', 'muted', '載入中…');
  container.append(heading, loading);

  loadData().then(data => {
    loading.remove();
    let state = loadState(localStorage);

    // 解鎖狀態以「算出來的」為準，存起來的只當快取（Phase 2 留下的約束 6）。
    // 兩者不一致時（例如改過 stages 資料）以計算結果覆寫並存回，
    // 否則首頁與測驗會各說各話。
    const unlockedStages = computeUnlockedStages(cardArray(state), data.stages);
    if (JSON.stringify(state.unlockedStages) !== JSON.stringify(unlockedStages)) {
      state = Object.assign({}, state, { unlockedStages });
      saveState(localStorage, state);
    }

    const body = el('div');
    container.appendChild(body);

    let answered = 0;
    let correctCount = 0;
    const wrongZ = [];
    let current = null;
    let shownAt = 0;
    // 最近考過的原子序（最多 RECENT_WINDOW 個）。
    const recent = [];
    // 回饋訊息要插進來的位置（作答區與「結束這一輪」之間）
    let feedbackSlot = null;
    // table-locate 題的週期表容器。答完要在原地換成 browse 模式標出正解，
    // 而不是在下面再畫一張——兩張 118 格的表疊著看會很吵。
    let locateHost = null;

    // ---- 取題 ---------------------------------------------------------

    function nextRound() {
      if (answered >= limit) { drawResult(); return; }
      const ctx = {
        cards: cardArray(state),
        stages: data.stages,
        unlockedStages,
        data,
        now: Date.now()
      };
      current = pickQuestion(ctx);
      for (let i = 0; current && recent.indexOf(current.z) >= 0 && i < PICK_ATTEMPTS; i++) {
        const retry = pickQuestion(ctx);
        if (!retry) break;
        current = retry;
      }
      if (!current) { drawEmpty(); return; }
      recent.push(current.z);
      if (recent.length > RECENT_WINDOW) recent.shift();
      shownAt = Date.now();
      drawQuestion();
    }

    function drawEmpty() {
      body.innerHTML = '';
      body.appendChild(el('p', 'muted', emptyMessage));
      if (answered > 0) {
        drawResultButtons();
      } else if (onEmptyAction) {
        const nav = el('div', 'learn-nav');
        const btn = el('button', 'btn btn-primary', onEmptyAction.label);
        btn.type = 'button';
        btn.onclick = onEmptyAction.run;
        nav.appendChild(btn);
        body.appendChild(nav);
      }
    }

    // ---- 題目呈現 -----------------------------------------------------

    function drawQuestion() {
      body.innerHTML = '';
      locateHost = null;
      feedbackSlot = null;
      body.appendChild(el('p', 'muted', `第 ${answered + 1} 題 / 共 ${limit} 題`));
      // 題幹常常只是一個符號或一個數字（例如「1」），沒有指示語學生
      // 看不出要答什麼。指示語由 core 提供，與題型一對一登記。
      body.appendChild(el('p', 'quiz-ask', QUESTION_PROMPTS[current.type] || ''));
      body.appendChild(el('p', 'quiz-prompt', current.prompt));

      // 依 core 登記的作答方式分派，不要用「不是 A 也不是 B 就當 C」
      // 去猜——漏掉一種型別就是一次當機（chant-blank 就這樣掛過）。
      const mode = ANSWER_MODES[current.type];
      if (mode === 'text') drawSpellInput();
      else if (mode === 'table') drawLocateTable();
      else if (mode === 'choice') drawChoices();
      else {
        // 未登記的題型：寧可顯示錯誤也不要靜悄悄畫出一個沒辦法作答的畫面。
        body.appendChild(el('p', 'muted error',
          `題型「${current.type}」還沒有對應的作答方式，請回報這個問題。`));
      }

      // 回饋與「下一題」要接在作答區正下方，所以先放一個插入點；
      // 「結束這一輪」永遠留在最底下。之前直接 append 到 body 末端，
      // 結果答完之後回饋跑到「結束這一輪」下面去，閱讀順序是亂的。
      feedbackSlot = el('div');
      body.appendChild(feedbackSlot);

      const quit = el('button', 'btn btn-quiet', '結束這一輪');
      quit.type = 'button';
      quit.onclick = drawResult;
      body.appendChild(quit);
    }

    function drawChoices() {
      const opts = el('div', 'quiz-options');
      current.options.forEach(value => {
        const btn = el('button', 'btn quiz-option', value);
        btn.type = 'button';
        btn.onclick = () => submit(value, opts);
        opts.appendChild(btn);
      });
      body.appendChild(opts);
    }

    function drawSpellInput() {
      const form = el('form', 'spell-form');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'spell-input';
      // iPhone 的自動修正會把 na 改成 Na 以外的東西、或自動大寫第一個字母，
      // 那會讓「大小寫是否正確」這件事變成裝置在答而不是學生在答。
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('spellcheck', 'false');
      input.setAttribute('aria-label', '輸入元素符號');
      const send = el('button', 'btn btn-primary', '送出');
      send.type = 'submit';
      form.append(input, send);
      form.onsubmit = event => {
        event.preventDefault();
        if (!input.value.trim()) return;
        submit(input.value, form);
      };
      body.appendChild(form);
      input.focus();
    }

    function drawLocateTable() {
      const hint = el('p', 'muted', '在週期表上點出它的位置');
      locateHost = el('div');
      body.append(hint, locateHost);
      renderPeriodicTable(locateHost, data.elements, {
        mode: 'locate',
        onSelect: picked => submit({ period: picked.period, group: picked.group }, locateHost)
      });
    }

    // ---- 判分與寫入 ---------------------------------------------------

    function submit(answer, controlNode) {
      const elapsedMs = Date.now() - shownAt;
      const { correct, correctAnswer } = checkAnswer(current, answer);

      // 鎖住輸入，避免連點改答案
      controlNode.querySelectorAll('button, input').forEach(n => { n.disabled = true; });
      if (controlNode.classList.contains('quiz-options')) {
        Array.from(controlNode.children).forEach(btn => {
          if (btn.textContent === String(correctAnswer)) btn.classList.add('is-correct');
          else if (btn.textContent === String(answer) && !correct) btn.classList.add('is-wrong');
        });
      }

      writeProgress(correct, elapsedMs);
      answered++;
      if (correct) correctCount++;
      else if (wrongZ.indexOf(current.z) < 0) wrongZ.push(current.z);

      drawFeedback(correct, correctAnswer);
    }

    /**
     * 更新這張卡與整體統計，寫回 localStorage。
     * 沒有卡片就先建一張（newCard 從盒 1 開始且立刻到期），
     * 再交給 reviewCard 依對錯調整——不要自己算盒號與下次到期時間，
     * 那是 scheduler 的職責。
     */
    function writeProgress(correct, elapsedMs) {
      const now = Date.now();
      const existing = state.cards && state.cards[String(current.z)];
      const base = (existing && typeof existing === 'object')
        ? existing : newCard(current.z, now);
      const updated = reviewCard(base, correct, elapsedMs, now);

      state = upsertCard(state, updated);
      const stats = Object.assign({}, state.stats);
      stats.totalAnswered = (stats.totalAnswered || 0) + 1;
      stats.totalCorrect = (stats.totalCorrect || 0) + (correct ? 1 : 0);
      state = Object.assign({}, state, { stats });
      saveState(localStorage, state);
    }

    function drawFeedback(correct, correctAnswer) {
      const slot = feedbackSlot || body;
      const text = correct
        ? '答對了'
        : `答錯了，正解是「${formatAnswer(correctAnswer)}」`;
      slot.appendChild(el('p', correct ? 'feedback is-correct' : 'feedback is-wrong', text));

      // 答完 table-locate 要讓學生看見正解在表上的哪一格，光給座標數字
      // 記不起來。在原本那張表的位置切回 browse 模式並把那一格捲進畫面。
      if (current.type === 'table-locate' && locateHost) {
        renderPeriodicTable(locateHost, data.elements, {
          highlightZ: [current.z],
          revealZ: current.z
        });
      }

      // 大小寫是符號題最常見的錯法，答對也提醒一次，強化規則。
      if (current.type === 'symbol-spell') {
        slot.appendChild(el('p', 'muted',
          '符號的寫法：第一個字母大寫，第二個字母小寫（例如 Na 不是 NA 或 na）。'));
      }

      const groupDef = current.groupRef
        ? data.groups.find(g => g.group === current.groupRef) : null;
      if (groupDef) {
        const line = el('p', 'muted');
        line.textContent = `${groupDef.name}口訣：${groupDef.chant}`;
        slot.appendChild(line);
      }

      const next = el('button', 'btn btn-primary',
        answered >= limit ? '看結果' : '下一題');
      next.type = 'button';
      next.onclick = nextRound;
      slot.appendChild(next);
      next.scrollIntoView({ block: 'nearest' });
    }

    function formatAnswer(value) {
      if (value && typeof value === 'object' && 'period' in value) {
        return `第 ${value.period} 週期、第 ${value.group} 族`;
      }
      return String(value);
    }

    // ---- 結果 ---------------------------------------------------------

    function drawResult() {
      recordSession();
      body.innerHTML = '';
      if (answered === 0) {
        body.appendChild(el('p', 'muted', '這一輪沒有作答。'));
        drawResultButtons();
        return;
      }
      const rate = Math.round((correctCount / answered) * 100);
      body.appendChild(el('p', 'quiz-result', `${answered} 題答對 ${correctCount} 題（${rate}%）`));

      if (wrongZ.length > 0) {
        body.appendChild(el('h3', 'detail-subtitle', '這些要再看一次'));
        const list = el('div', 'wrong-list');
        wrongZ.forEach(z => {
          const item = data.elements.find(e => e.z === z);
          if (!item) return;
          const chip = el('span', 'wrong-item');
          chip.appendChild(el('b', null, item.symbol));
          chip.appendChild(document.createTextNode(` ${item.zh}`));
          const zy = renderZhuyin(item.zhuyin);
          if (zy) chip.appendChild(zy);
          list.appendChild(chip);
        });
        body.appendChild(list);
        body.appendChild(el('p', 'muted',
          '答錯的卡片已經退回第 1 盒，下一輪會立刻再考一次。'));
      } else {
        body.appendChild(el('p', 'muted', '全部答對。'));
      }
      drawResultButtons();
    }

    function drawResultButtons() {
      const nav = el('div', 'learn-nav');
      const again = el('button', 'btn btn-primary', '再來一輪');
      again.type = 'button';
      again.onclick = () => {
        answered = 0; correctCount = 0; wrongZ.length = 0;
        nextRound();
      };
      nav.appendChild(again);
      body.appendChild(nav);
    }

    /** 把這一輪追加進 stats.sessions，只留最近 MAX_SESSIONS 筆。 */
    function recordSession() {
      if (answered === 0) return;
      const stats = Object.assign({}, state.stats);
      const sessions = Array.isArray(stats.sessions) ? stats.sessions.slice() : [];
      sessions.push({
        date: new Date().toISOString().slice(0, 10),
        answered,
        correct: correctCount
      });
      stats.sessions = sessions.slice(-MAX_SESSIONS);
      state = Object.assign({}, state, { stats });
      saveState(localStorage, state);
    }

    nextRound();
  }).catch(err => {
    container.appendChild(el('p', 'muted error', '資料載入失敗：' + err.message));
  });
}
