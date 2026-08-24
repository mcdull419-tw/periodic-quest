// 個別元素圖像掛鉤（data/mnemonics-elements.json）的驗證。
//
// 這份資料目前只有 1A 的七筆，之後會由 sub-agent 依關卡分批量產
// （spec §11.4）。守門測試現在就要建立好——批次產出的東西沒有機器可檢查
// 的規則就進資料庫，等於把品質賭在每一次派工的 prompt 上。

const EL = [
  { z: 1, symbol: 'H', zh: '氫' },
  { z: 11, symbol: 'Na', zh: '鈉' }
];

test('合法資料回傳空陣列', () => {
  eq(validateElementMnemonics([{ z: 1, imagery: '水龍頭的水。', hook: '水就是氫加氧' }], EL), []);
});

test('抓出 z 對不到任何元素', () => {
  const errs = validateElementMnemonics([{ z: 999, imagery: 'x', hook: 'y' }], EL);
  eq(errs.length, 1);
  ok(errs[0].indexOf('找不到') >= 0, errs[0]);
});

test('抓出同一個元素被定義兩次', () => {
  const errs = validateElementMnemonics([
    { z: 1, imagery: 'a', hook: 'b' },
    { z: 1, imagery: 'c', hook: 'd' }
  ], EL);
  eq(errs.length, 1);
  ok(errs[0].indexOf('重複定義') >= 0, errs[0]);
});

test('抓出 hook 超過字數上限', () => {
  const errs = validateElementMnemonics(
    [{ z: 1, imagery: 'a', hook: '一二三四五六七八九十十一十二十三' }], EL);
  eq(errs.length, 1);
  ok(errs[0].indexOf('超過') >= 0, errs[0]);
});

test('剛好等於上限不算超過', () => {
  eq(validateElementMnemonics([{ z: 1, imagery: 'a', hook: '一二三四五六七八九十十一' }], EL), []);
});

test('抓出空的 imagery 與 hook', () => {
  const errs = validateElementMnemonics([{ z: 1, imagery: '  ', hook: '' }], EL);
  eq(errs.length, 2);
});

test('null 項目不會讓驗證整個炸掉', () => {
  const errs = validateElementMnemonics([null, { z: 1, imagery: 'a', hook: 'b' }], EL);
  eq(errs.length, 1);
});

// 需要 fixture（tests/.data.js），理由同 progress.test.js。
if (typeof ELEMENT_MNEMONICS !== 'undefined' && typeof ELEMENTS !== 'undefined') {
  test('真實資料：mnemonics-elements.json 通過驗證', () => {
    eq(validateElementMnemonics(ELEMENT_MNEMONICS, ELEMENTS), []);
  });

  test('真實資料：目前正好涵蓋 1A 的七個元素', () => {
    // 之後補其他關卡時這條會失敗——那是提醒，不是錯誤：
    // 請把預期的原子序一起更新，確認新增的正是打算新增的那些。
    const zs = ELEMENT_MNEMONICS.map(m => m.z).sort((a, b) => a - b);
    eq(zs, [1, 3, 11, 19, 37, 55, 87]);
  });

  test('真實資料：每一筆的 hook 都在 12 字以內且不重複', () => {
    const hooks = ELEMENT_MNEMONICS.map(m => m.hook);
    hooks.forEach(h => ok(Array.from(h).length <= HOOK_MAX_LENGTH, `「${h}」太長`));
    eq(hooks.length, new Set(hooks).size);
  });
}
