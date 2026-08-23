const ST = [
  { id: 1, name: 'A', groups: ['1A'], elements: [1, 3, 11, 19, 37], unlockRatio: 0.8 },
  { id: 2, name: 'B', groups: ['2A'], elements: [4, 12], unlockRatio: 0.8 }
];
function c(z, box) {
  return { z, box, nextDue: 0, lastSeen: 0, streak: 0, correct: 0, wrong: 0, avgMs: 0 };
}

test('stageCompletion 只計入盒 3 以上的元素', () => {
  const r = stageCompletion([c(1, 3), c(3, 2), c(11, 5)], ST[0]);
  eq(r.total, 5);
  eq(r.mastered, 2);
});

test('stageCompletion 的 ratio 是達標數除以關卡元素總數', () => {
  eq(stageCompletion([c(1, 3), c(3, 4)], ST[0]).ratio, 0.4);
  eq(stageCompletion([], ST[0]).ratio, 0);
});

test('stageCompletion 不計入不屬於這一關的卡', () => {
  // 第二關的鎂（12）達標，不該灌水到第一關
  eq(stageCompletion([c(12, 5)], ST[0]).mastered, 0);
});

test('關卡 1 永遠是解鎖的', () => {
  ok(isStageUnlocked([], ST, 1));
});

test('前一關未達門檻時下一關維持鎖定', () => {
  ok(!isStageUnlocked([c(1, 3), c(3, 3), c(11, 3)], ST, 2),
     '五個元素需要四個達標，目前只有三個');
});

test('前一關達到門檻時下一關解鎖', () => {
  ok(isStageUnlocked([c(1, 3), c(3, 3), c(11, 3), c(19, 4)], ST, 2),
     'ceil(5 * 0.8) = 4，達標');
});

test('答對過但只在盒 2 不算達標', () => {
  ok(!isStageUnlocked([c(1, 2), c(3, 2), c(11, 2), c(19, 2), c(37, 2)], ST, 2));
});

test('不存在的關卡 id 視為未解鎖', () => {
  ok(!isStageUnlocked([], ST, 99));
});

test('computeUnlockedStages 回傳連續解鎖的關卡', () => {
  eq(computeUnlockedStages([], ST), [1]);
  eq(computeUnlockedStages([c(1, 3), c(3, 3), c(11, 3), c(19, 3)], ST), [1, 2]);
});

// 關卡是線性的：中間某關沒過，後面就算內容全部達標也不能跳關解鎖。
test('中間關卡未達標時不跳關解鎖', () => {
  const three = ST.concat([{ id: 3, name: 'C', groups: [], elements: [26], unlockRatio: 0.8 }]);
  // 第二關的兩個元素全達標，但第一關只有一個達標
  eq(computeUnlockedStages([c(1, 3), c(4, 5), c(12, 5)], three), [1]);
  ok(!isStageUnlocked([c(1, 3), c(4, 5), c(12, 5)], three, 3));
});

test('summarize 計算正確率', () => {
  const state = { cards: { '1': c(1, 3) },
                  stats: { totalAnswered: 10, totalCorrect: 7 } };
  const s = summarize(state, ST);
  eq(s.answered, 10);
  eq(s.correct, 7);
  eq(s.accuracy, 0.7);
});

test('summarize 在尚未作答時不會除以零', () => {
  const s = summarize({ cards: {}, stats: { totalAnswered: 0, totalCorrect: 0 } }, ST);
  eq(s.accuracy, 0);
});

test('summarize 統計全部關卡的達標數與元素總數', () => {
  const state = { cards: { '1': c(1, 3), '3': c(3, 1), '4': c(4, 5) },
                  stats: { totalAnswered: 3, totalCorrect: 2 } };
  const s = summarize(state, ST);
  eq(s.masteredCount, 2);
  eq(s.totalCount, 7); // 5 + 2
});

test('summarize 的 byStage 逐關列出進度與解鎖狀態', () => {
  const state = { cards: { '1': c(1, 3), '3': c(3, 3) },
                  stats: { totalAnswered: 4, totalCorrect: 4 } };
  const s = summarize(state, ST);
  eq(s.byStage.length, 2);
  eq(s.byStage[0].id, 1);
  eq(s.byStage[0].name, 'A');
  eq(s.byStage[0].mastered, 2);
  eq(s.byStage[0].required, 4); // ceil(5 * 0.8)，也是解鎖第二關的門檻
  eq(s.byStage[0].unlocked, true);
  eq(s.byStage[1].unlocked, false);
});

// store.js 的 migrate 對「cards 是陣列而非物件」不修正也不報錯（已知問題），
// 只可能來自手動竄改 localStorage。summarize 是首頁一進來就會呼叫的函式，
// 遇到壞資料要回傳零值而不是讓整個畫面掛掉。
test('summarize 對缺漏或損壞的 state 欄位防呆', () => {
  eq(summarize({}, ST).answered, 0);
  eq(summarize({ cards: null, stats: null }, ST).masteredCount, 0);
  eq(summarize({ cards: [c(1, 3)], stats: {} }, ST).masteredCount, 1);
  eq(summarize({ cards: { '1': null, '3': 'x', '11': c(11, 4) } }, ST).masteredCount, 1);
});

test('unlockRatio 缺漏或型別錯誤時退回預設值 0.8', () => {
  const broken = [{ id: 1, name: 'A', groups: [], elements: [1, 3, 11, 19, 37] },
                  { id: 2, name: 'B', groups: [], elements: [4] }];
  ok(!isStageUnlocked([c(1, 3), c(3, 3), c(11, 3)], broken, 2), '三個達標不足 ceil(5*0.8)=4');
  ok(isStageUnlocked([c(1, 3), c(3, 3), c(11, 3), c(19, 3)], broken, 2));
});

// 以下用真實的 data/stages.json（由 tests/make-data-fixture.py 產生的
// tests/.data.js 提供 STAGES）。計畫給 Task 2.6 的指令是
//   python3 tests/run.py js/core/progress.js tests/progress.test.js
// 不含 fixture，所以這裡先判斷 STAGES 是否存在——沒有就跳過，
// 有的話（Task 3.5 那個把 js/core/*.js 與 .data.js 全串起來的迴圈）就檢查。
// 這一條擋的是「有人改了 stages.json 的 unlockRatio 或元素數，
// 導致學生開局就卡死或反過來全部解鎖」這類資料層面的錯。
if (typeof STAGES !== 'undefined') {
  test('真實關卡資料：全新玩家只解鎖第一關，且門檻是七取六', () => {
    eq(computeUnlockedStages([], STAGES), [1]);
    const s = summarize({ cards: {}, stats: {} }, STAGES);
    eq(s.totalCount, 54);
    eq(s.byStage[0].required, 6); // ceil(7 * 0.8)
    eq(s.byStage.filter(x => x.unlocked).length, 1);
  });

  test('真實關卡資料：第一關七個元素全進第 3 盒就解開第二關', () => {
    const cards = [1, 3, 11, 19, 37, 55, 87].map(z => ({ z, box: 3 }));
    eq(computeUnlockedStages(cards, STAGES), [1, 2]);
  });
}
