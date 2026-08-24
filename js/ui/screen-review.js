// 複習畫面（task 3.5）。
//
// 與測驗共用 js/ui/quiz-runner.js 的作答流程，差別只有一件事：
// 題目只從**到期的卡片**出。測驗會依 due／weak／fresh 三個池的權重抽題，
// 也就是會夾雜新元素；複習則是純粹把該回顧的東西回顧完。

import { runQuiz } from './quiz-runner.js';
import { questionForZ } from '../core/question.js';
import { availableElements } from '../core/quiz.js';
import { dueCards } from '../core/scheduler.js';
import { navigate } from '../main.js';

/**
 * 從到期卡裡挑一張出題。
 * 到期卡可能包含已解鎖範圍以外的卡（例如改過 stages 資料），
 * 所以要先與 availableElements 取交集，否則會考出學生現在根本
 * 看不到的元素。
 * @param {object} ctx runQuiz 傳進來的 { cards, stages, unlockedStages, data, now }
 * @returns {object | null}
 */
function pickDueQuestion(ctx) {
  const available = new Set(availableElements(ctx.stages, ctx.unlockedStages));
  const due = dueCards(ctx.cards, ctx.now).filter(c => available.has(c.z));
  if (due.length === 0) return null;
  // dueCards 已依到期時間排序，取最該複習的那幾張裡隨機一張——
  // 完全照順序的話，同一輪裡會一直卡在同一張答錯的卡上。
  const head = due.slice(0, Math.min(5, due.length));
  const card = head[Math.floor(Math.random() * head.length)];
  return questionForZ(card.z, ctx);
}

/**
 * 註冊用的畫面渲染函式。
 * @param {HTMLElement} container 清空後的 #app
 */
export function renderReviewScreen(container) {
  runQuiz(container, {
    title: '複習',
    pickQuestion: pickDueQuestion,
    emptyMessage: '今天沒有要複習的，去學新的一族吧。',
    onEmptyAction: {
      label: '去學新的一族',
      run: () => navigate('home')
    }
  });
}
