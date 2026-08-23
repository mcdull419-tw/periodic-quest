const EL = [
  { z: 1,  symbol: 'H',  zh: '氫', period: 1, group: 1,  mainGroup: '1A', category: 'nonmetal' },
  { z: 3,  symbol: 'Li', zh: '鋰', period: 2, group: 1,  mainGroup: '1A', category: 'alkali-metal' },
  { z: 11, symbol: 'Na', zh: '鈉', period: 3, group: 1,  mainGroup: '1A', category: 'alkali-metal' },
  { z: 19, symbol: 'K',  zh: '鉀', period: 4, group: 1,  mainGroup: '1A', category: 'alkali-metal' },
  { z: 12, symbol: 'Mg', zh: '鎂', period: 3, group: 2,  mainGroup: '2A', category: 'alkaline-earth' },
  { z: 20, symbol: 'Ca', zh: '鈣', period: 4, group: 2,  mainGroup: '2A', category: 'alkaline-earth' },
  { z: 26, symbol: 'Fe', zh: '鐵', period: 4, group: 8,  mainGroup: null, category: 'transition-metal' },
  { z: 8,  symbol: 'O',  zh: '氧', period: 2, group: 16, mainGroup: '6A', category: 'nonmetal' }
];

const DATA = {
  elements: EL,
  groups: [{
    group: '1A', name: '鹼金族', chant: '請你讓佳如設法',
    mapping: [
      { char: '請', z: 1,  symbol: 'H',  zh: '氫' },
      { char: '你', z: 3,  symbol: 'Li', zh: '鋰' },
      { char: '讓', z: 11, symbol: 'Na', zh: '鈉' }
    ]
  }],
  // 第二關只有鐵（過渡金屬，沒有主族、沒有口訣），
  // 專門用來驗證 nextQuestion 遇到不適用題型時會換題型重試。
  stages: [
    { id: 1, name: 'A', groups: ['1A'], elements: [1, 3, 11] },
    { id: 2, name: 'B', groups: [], elements: [26] }
  ]
};

// 依序回放固定的亂數序列，讓 nextQuestion 內每一次 rng() 呼叫的結果
// 都可控——用來精確逼出「shuffle(QUESTION_TYPES) 後第一個是 chant-blank」
// 這種原本要跑很多次才會遇到的情境。序列用完後重複最後一個值。
function queueRng(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

test('symbol-to-zh 的題幹是符號，選項含正解', () => {
  const q = makeQuestion('symbol-to-zh', 11, DATA, () => 0);
  eq(q.prompt, 'Na');
  eq(q.answer, '鈉');
  ok(q.options.indexOf('鈉') >= 0);
  eq(q.options.length, 4);
});

test('zh-to-symbol 的題幹是中文名', () => {
  const q = makeQuestion('zh-to-symbol', 11, DATA, () => 0);
  eq(q.prompt, '鈉');
  eq(q.answer, 'Na');
});

test('symbol-spell 是填空題，沒有選項', () => {
  const q = makeQuestion('symbol-spell', 11, DATA, () => 0);
  eq(q.options, null);
  eq(q.answer, 'Na');
});

test('chant-blank 挖掉口訣中的一個字', () => {
  const q = makeQuestion('chant-blank', 11, DATA, () => 0);
  eq(q.answer, '讓');
  ok(q.prompt.indexOf('□') >= 0, '題幹應有空格符號');
  eq(q.prompt.length, '請你讓佳如設法'.length);
  eq(q.groupRef, '1A');
});

test('group-id 問元素屬於哪一族', () => {
  const q = makeQuestion('group-id', 11, DATA, () => 0);
  eq(q.answer, '1A');
  ok(q.options.indexOf('1A') >= 0);
});

test('沒有口訣的元素不會產生 chant-blank 題', () => {
  eq(makeQuestion('chant-blank', 26, DATA, () => 0), null);
});

test('table-locate 的 answer 為 period 與 group 座標，且沒有選項', () => {
  const q = makeQuestion('table-locate', 11, DATA, () => 0);
  eq(q.prompt, 'Na');
  eq(q.options, null);
  eq(q.answer, { period: 3, group: 1 });
});

test('checkAnswer 對 table-locate 要求 period 與 group 皆相符', () => {
  const q = makeQuestion('table-locate', 11, DATA, () => 0);
  eq(checkAnswer(q, { period: 3, group: 1 }).correct, true);
  // 只有 period 對：group 錯仍算錯
  eq(checkAnswer(q, { period: 3, group: 2 }).correct, false);
  // 只有 group 對：period 錯仍算錯
  eq(checkAnswer(q, { period: 4, group: 1 }).correct, false);
  eq(checkAnswer(q, { period: 3, group: 1 }).correctAnswer, { period: 3, group: 1 });
});

// 官方 fixture 原本的三個主族元素（H／Li／Na）七種題型全部適用，
// makeQuestion 永不回傳 null，nextQuestion 的重試分支因此從未被執行到
// ——這是 code review 找出的測試盲點。這裡用固定 rng 序列精確逼出
// 「shuffle(QUESTION_TYPES) 後第一個是 chant-blank」，目標元素是鐵
// （關卡 2，mainGroup: null，沒有口訣），驗證 nextQuestion 真的會換
// 下一個題型重試，而不是直接放棄回傳 null。
test('nextQuestion 換題型重試：過渡金屬先抽到 chant-blank 仍能拿到合法題目', () => {
  // 呼叫序：pickSource(1) → 選 z 的索引(1) → shuffle(QUESTION_TYPES) 的
  // 6 次 Fisher-Yates 迭代（i = 6..1）。這組序列讓前兩次呼叫的結果不影響
  // 結論（關卡 2 只有鐵一個元素可選），後六次刻意讓 shuffle 後陣列的
  // 第 0 個元素固定是 QUESTION_TYPES 原本索引 5 的 'chant-blank'。
  const rng = queueRng([0.5, 0.5, 0.9, 0.0, 0.9, 0.9, 0.9, 0.9]);
  const q = nextQuestion(
    { cards: [], stages: DATA.stages, unlockedStages: [2], data: DATA, now: 0 },
    rng
  );
  ok(q !== null, 'nextQuestion 應該換題型重試，不是直接放棄回傳 null');
  eq(q.z, 26);
  ok(q.type !== 'chant-blank', '第一個抽到的 chant-blank 對鐵不適用，應該已經換成別的題型');
});

test('checkAnswer 對選擇題做精確比對', () => {
  const q = makeQuestion('symbol-to-zh', 11, DATA, () => 0);
  eq(checkAnswer(q, '鈉').correct, true);
  eq(checkAnswer(q, '鋰').correct, false);
});

test('symbol-spell 判分時忽略大小寫與前後空白', () => {
  const q = makeQuestion('symbol-spell', 11, DATA, () => 0);
  eq(checkAnswer(q, ' na ').correct, true);
  eq(checkAnswer(q, 'NA').correct, true);
  eq(checkAnswer(q, 'Nb').correct, false);
});

test('checkAnswer 一律回報正確答案供回饋顯示', () => {
  const q = makeQuestion('symbol-spell', 11, DATA, () => 0);
  eq(checkAnswer(q, 'xx').correctAnswer, 'Na');
});

test('nextQuestion 在無可用元素時回傳 null', () => {
  eq(nextQuestion({ cards: [], stages: DATA.stages, unlockedStages: [],
                    data: DATA, now: 0 }, () => 0), null);
});

test('nextQuestion 產生的題目其元素在已解鎖範圍內', () => {
  const q = nextQuestion({ cards: [], stages: DATA.stages, unlockedStages: [1],
                           data: DATA, now: 0 }, () => 0.5);
  ok([1, 3, 11].indexOf(q.z) >= 0);
});
