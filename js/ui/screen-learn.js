// 記憶法教學畫面（task 3.3，spec §5.2）。
//
// spec 的要求是「讀完記憶法要立刻用一次，不能只讀不用」，所以這個畫面
// 分成兩段：先逐字走完整族口訣，走完立刻對同一族出一輪小測。
//
// 小測**不寫入 localStorage**。這是教學階段的當場練習，不是正式測驗，
// 寫進去會污染 Leitner 排程——學生在教學畫面剛看過答案就答對，
// 不代表他記得住，那張卡不該因此被推到下一個盒子。

import { loadData } from '../data/load.js';
import { makeQuestion, checkAnswer } from '../core/question.js';
import { navigate } from '../main.js';

const GROUP_CODES = ['1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A'];

// 小測輪流用這兩種題型：一個考「看符號說中文」，一個考反向。
const QUIZ_TYPES = ['symbol-to-zh', 'zh-to-symbol'];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * 口訣逐字呈現，指定位置的字高亮。
 * @param {string} chant
 * @param {number} index -1 表示都不高亮
 * @returns {HTMLElement}
 */
function renderChant(chant, index) {
  const wrap = el('p', 'chant');
  Array.from(chant).forEach((char, i) => {
    wrap.appendChild(el('span', i === index ? 'chant-char is-hit' : 'chant-char', char));
  });
  return wrap;
}

/**
 * 註冊用的畫面渲染函式。接受 ?group=1A。
 * @param {HTMLElement} container 清空後的 #app
 * @param {Record<string, string>} params
 */
export function renderLearnScreen(container, params) {
  const code = GROUP_CODES.indexOf(params.group) >= 0 ? params.group : GROUP_CODES[0];
  const loading = el('p', 'muted', '載入中…');
  container.appendChild(loading);

  loadData().then(({ elements, groups }) => {
    loading.remove();
    const def = groups.find(g => g.group === code);
    if (!def) {
      container.appendChild(el('p', 'muted error', `找不到 ${code} 的口訣資料。`));
      return;
    }

    // 小測的干擾選項只從同一族裡取。教學階段考的是「這一族七個字分別是誰」，
    // 拿別族的元素當干擾項會讓題目變成另一件事，也違反 Phase 2 留下的約束
    // （傳給 buildDistractors 的範圍要限縮，不能整個 118 筆丟進去）。
    const groupZ = new Set(def.mapping.map(m => m.z));
    const scopedData = {
      elements: elements.filter(e => groupZ.has(e.z)),
      groups,
      stages: []
    };

    const body = el('div');
    container.appendChild(body);

    let step = 0;               // 目前教到第幾個字
    let quizIndex = -1;         // -1 表示還在教學階段
    let quizResults = [];       // 每題 true/false

    function header() {
      const head = el('header', 'learn-head');
      head.append(
        el('h2', 'screen-title', `${def.name}　${def.group}`),
        renderChant(def.chant, quizIndex < 0 ? step : -1)
      );
      return head;
    }

    // ---- 教學階段 -------------------------------------------------------

    function drawTeach() {
      body.innerHTML = '';
      body.appendChild(header());

      // 場景只在第一個字時出現：它是整族的開場，不是每個字都要重講一次。
      if (step === 0) {
        body.appendChild(el('p', 'scene', `場景：${def.scene}`));
      }

      const m = def.mapping[step];
      const item = elements.find(e => e.z === m.z);
      const card = el('section', 'card learn-card');
      card.append(
        el('div', 'learn-char', m.char),
        el('div', 'learn-arrow', '→'),
        el('div', 'learn-el')
      );
      const info = card.querySelector('.learn-el');
      info.append(
        el('span', 'learn-symbol', m.symbol),
        el('span', 'learn-zh', m.zh + (item && item.zhuyin ? `　${item.zhuyin}` : '')),
        el('span', 'learn-z', `第 ${m.z} 號`)
      );
      body.appendChild(card);

      body.appendChild(el('p', 'muted', `${step + 1} / ${def.mapping.length}`));

      const nav = el('div', 'learn-nav');
      const prev = el('button', 'btn', '上一個');
      prev.type = 'button';
      prev.disabled = step === 0;
      prev.onclick = () => { step--; drawTeach(); };

      const next = el('button', 'btn btn-primary',
        step === def.mapping.length - 1 ? '學完了，來測一下' : '下一個');
      next.type = 'button';
      next.onclick = () => {
        if (step === def.mapping.length - 1) startQuiz();
        else { step++; drawTeach(); }
      };
      nav.append(prev, next);
      body.appendChild(nav);

      // 最後一個字時才提示下一族怎麼接上——場景是串起來的，
      // 在中途講會打斷這一族本身的節奏。
      if (step === def.mapping.length - 1 && def.sceneNext) {
        const nextDef = groups.find(g => g.group === def.sceneNext);
        if (nextDef) {
          body.appendChild(el('p', 'scene scene-next',
            `接下來（${nextDef.name} ${nextDef.group}）：${nextDef.scene}`));
        }
      }
    }

    // ---- 小測階段 -------------------------------------------------------

    function startQuiz() {
      quizIndex = 0;
      quizResults = [];
      drawQuiz();
    }

    function drawQuiz() {
      body.innerHTML = '';
      body.appendChild(header());

      const m = def.mapping[quizIndex];
      const type = QUIZ_TYPES[quizIndex % QUIZ_TYPES.length];
      const q = makeQuestion(type, m.z, scopedData);
      if (!q) {
        // 同族元素不足以產生選項時（資料異常）不要卡死，直接跳過這題。
        recordAndAdvance(false);
        return;
      }

      body.appendChild(el('p', 'muted', `小測　${quizIndex + 1} / ${def.mapping.length}`));
      body.appendChild(el('p', 'quiz-prompt', q.prompt));

      const opts = el('div', 'quiz-options');
      q.options.forEach(value => {
        const btn = el('button', 'btn quiz-option', value);
        btn.type = 'button';
        btn.onclick = () => {
          const { correct, correctAnswer } = checkAnswer(q, value);
          // 作答後鎖住整組選項，避免連點改答案。
          opts.querySelectorAll('button').forEach(b => { b.disabled = true; });
          btn.classList.add(correct ? 'is-correct' : 'is-wrong');
          if (!correct) {
            opts.querySelectorAll('button').forEach(b => {
              if (b.textContent === String(correctAnswer)) b.classList.add('is-correct');
            });
          }
          const feedback = el('p', correct ? 'feedback is-correct' : 'feedback is-wrong',
            correct ? '答對了' : `答錯了，正解是「${correctAnswer}」`);
          body.appendChild(feedback);

          const next = el('button', 'btn btn-primary',
            quizIndex === def.mapping.length - 1 ? '看結果' : '下一題');
          next.type = 'button';
          next.onclick = () => recordAndAdvance(correct);
          body.appendChild(next);
        };
        opts.appendChild(btn);
      });
      body.appendChild(opts);
    }

    function recordAndAdvance(correct) {
      quizResults.push(correct);
      quizIndex++;
      if (quizIndex >= def.mapping.length) drawResult();
      else drawQuiz();
    }

    function drawResult() {
      body.innerHTML = '';
      body.appendChild(header());
      const right = quizResults.filter(Boolean).length;
      const total = quizResults.length;
      body.appendChild(el('p', 'quiz-result', `${total} 題答對 ${right} 題`));
      body.appendChild(el('p', 'muted',
        '這一輪是教學階段的練習，不會影響複習排程。正式測驗在「測驗」分頁。'));

      const nav = el('div', 'learn-nav');
      const again = el('button', 'btn', '再測一次');
      again.type = 'button';
      again.onclick = startQuiz;

      const reread = el('button', 'btn', '重看口訣');
      reread.type = 'button';
      reread.onclick = () => { quizIndex = -1; step = 0; drawTeach(); };

      const toTable = el('button', 'btn btn-primary', '回週期表');
      toTable.type = 'button';
      toTable.onclick = () => navigate('table', { group: def.group });

      nav.append(again, reread, toTable);
      body.appendChild(nav);
    }

    drawTeach();
  }).catch(err => {
    container.appendChild(el('p', 'muted error', '資料載入失敗：' + err.message));
  });
}
