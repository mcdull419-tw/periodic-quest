// 測驗畫面（task 3.4）。
//
// 作答流程本身在 js/ui/quiz-runner.js，這裡只決定「題目從哪裡來」——
// 測驗是從已解鎖範圍依 due／weak／fresh 三個池的權重抽題，
// 複習畫面（task 3.5）會傳入不同的取題函式，其餘體驗完全相同。

import { runQuiz } from './quiz-runner.js';
import { nextQuestion } from '../core/question.js';

/**
 * 註冊用的畫面渲染函式。
 * @param {HTMLElement} container 清空後的 #app
 */
export function renderQuizScreen(container) {
  runQuiz(container, {
    title: '測驗',
    pickQuestion: ctx => nextQuestion(ctx),
    emptyMessage: '目前沒有可以出的題目。先去週期表把第一族學過一輪吧。'
  });
}
