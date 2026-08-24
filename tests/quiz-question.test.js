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
  groups: [
    {
      group: '1A', name: '鹼金族', chant: '請你讓佳如設法',
      mapping: [
        { char: '請', z: 1,  symbol: 'H',  zh: '氫' },
        { char: '你', z: 3,  symbol: 'Li', zh: '鋰' },
        { char: '讓', z: 11, symbol: 'Na', zh: '鈉' }
      ]
    },
    // 以下三族只給族碼，沒有 chant／mapping：group-id 只用得到 group 欄位。
    // 它們的存在是為了讓 group-id 有干擾項可抽——真實資料有八個主族，
    // 只放 1A 的 fixture 會讓 group-id 的選項數失真。
    { group: '2A', name: '鹼土族' },
    { group: '6A', name: '氧族' },
    { group: '7A', name: '鹵素' }
  ],
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

// 複製 question.js 內 shuffle 的 Fisher-Yates 演算法。用途只有一個：
// 讓下面那個重試測試能先驗證自己的前提是否還成立（見該測試的註解）。
function shuffleForCheck(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 可重現的偽亂數：要掃過「很多種洗牌結果」時用它，不要用 Math.random，
// 否則測試會變成偶發性失敗。線性同餘法，數值品質不重要，可重現才重要。
function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
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

// 第一關只解鎖 1A，scopedData.groups 就只剩 1A 一筆，group-id 會做出
// 「只有一個選項」的題目——正解直接寫在唯一的選項上。這是每個學生開局
// 都會遇到的情境，不是邊角案例。干擾項掛零時應回傳 null，讓 nextQuestion
// 換題型。
test('可選族別只剩一個時不產生 group-id 題', () => {
  const onlyOneGroup = { elements: EL, groups: [DATA.groups[0]], stages: DATA.stages };
  eq(makeQuestion('group-id', 11, onlyOneGroup, () => 0), null);
});

test('nextQuestion 在只解鎖第一關時不會出單選項的 group-id', () => {
  const rng = seededRng(7);
  for (let i = 0; i < 50; i++) {
    const q = nextQuestion({ cards: [], stages: DATA.stages, unlockedStages: [1],
                             data: DATA, now: 0 }, rng);
    ok(q !== null, 'nextQuestion 不該回傳 null');
    if (q.options) ok(q.options.length >= 2, q.type + ' 的選項不該少於兩個');
  }
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
  // 使用者還沒點任何格子就送出，answer 會是 null；要判錯而不是拋例外
  eq(checkAnswer(q, null).correct, false);
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
  const seq = [0.5, 0.5, 0.9, 0.0, 0.9, 0.9, 0.9, 0.9];

  // 前提檢查。洗牌結果同時取決於這組序列「和」QUESTION_TYPES 的原始順序，
  // 日後若有人調動 QUESTION_TYPES，第一個抽到的就不再是 chant-blank——
  // 這個測試會照樣通過，卻已經不再走到重試分支，coverage 靜悄悄消失。
  // 先在這裡把前提釘死：前提一垮就直接失敗，逼人重新調序列。
  eq(shuffleForCheck(QUESTION_TYPES, queueRng(seq.slice(2)))[0], 'chant-blank');

  const rng = queueRng(seq);
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

// 教學畫面（Task 3.3）的小測是用「只含同一族元素」的 data 呼叫
// makeQuestion，讓干擾項一定來自同族。這裡拿真實資料把八族 × 兩種題型
// 全跑一遍，確認每一族的元素數都足夠產生四個選項——某一族若只剩三個
// 元素，選項會少於四個而不會報錯，只會安靜地變成送分題。
// 需要 fixture（tests/.data.js），沒有就跳過，理由同 progress.test.js。
if (typeof ELEMENTS !== 'undefined' && typeof GROUPS !== 'undefined') {
  test('教學小測：八族每個元素都能產生四選項的題目', () => {
    GROUPS.forEach(def => {
      const groupZ = {};
      def.mapping.forEach(m => { groupZ[m.z] = true; });
      const scoped = {
        elements: ELEMENTS.filter(e => groupZ[e.z]),
        groups: GROUPS,
        stages: []
      };
      eq(scoped.elements.length, def.mapping.length);
      def.mapping.forEach(m => {
        ['symbol-to-zh', 'zh-to-symbol'].forEach(type => {
          const q = makeQuestion(type, m.z, scoped, () => 0.5);
          ok(q !== null, `${def.group} z=${m.z} ${type} 產不出題目`);
          eq(q.options.length, 4);
          ok(q.options.indexOf(q.answer) >= 0, `${def.group} z=${m.z} 選項裡沒有正解`);
        });
      });
    });
  });
}
