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
  stages: [{ id: 1, name: 'A', groups: ['1A'], elements: [1, 3, 11] }]
};

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
