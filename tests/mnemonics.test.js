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

  test('真實資料：七個關卡的 54 個元素全部都有掛鉤', () => {
    // 這條在 1A 七筆的時代就存在，補完其餘六關時如預期失敗了——
    // 那正是它的用途：涵蓋範圍變動必須是有意識的更新，不是默默通過。
    // 之後若再擴充（例如補到 118 個），請連同這份清單一起改。
    const zs = ELEMENT_MNEMONICS.map(m => m.z).sort((a, b) => a - b);
    eq(zs, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 24, 25, 26, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 47, 49, 50, 51, 52, 53, 54, 55, 56, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88]);
  });

  test('真實資料：掛鉤的涵蓋範圍與關卡資料一致', () => {
    // 不只比對寫死的清單，也和 stages.json 交叉比對——
    // 關卡資料改了而掛鉤沒跟上（或反過來）都會被抓到。
    const inStages = [];
    STAGES.forEach(st => st.elements.forEach(z => inStages.push(z)));
    const covered = ELEMENT_MNEMONICS.map(m => m.z);
    inStages.forEach(z => {
      ok(covered.indexOf(z) >= 0, `關卡裡的 z=${z} 沒有圖像掛鉤`);
    });
  });

  test('真實資料：每一筆的 hook 都在 12 字以內且不重複', () => {
    const hooks = ELEMENT_MNEMONICS.map(m => m.hook);
    hooks.forEach(h => ok(Array.from(h).length <= HOOK_MAX_LENGTH, `「${h}」太長`));
    eq(hooks.length, new Set(hooks).size);
  });
}
