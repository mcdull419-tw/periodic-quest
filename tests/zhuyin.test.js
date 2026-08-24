// 直寫注音的拆解邏輯（js/components/zhuyin.js）。
// renderZhuyin 要碰 DOM 所以測不到，但「音節與聲調怎麼拆」是純邏輯，
// 而且拆錯的症狀很陰險——畫面照樣顯示得出來，只是聲調跑到最下面一格，
// 變成不是注音的寫法。

test('把聲調從音節裡拆出來', () => {
  eq(splitZhuyin('ㄋㄚˋ'), { base: 'ㄋㄚ', tone: 'ˋ' });
  eq(splitZhuyin('ㄊㄧㄝˇ'), { base: 'ㄊㄧㄝ', tone: 'ˇ' });
  eq(splitZhuyin('ㄇㄣˊ'), { base: 'ㄇㄣ', tone: 'ˊ' });
});

test('一聲沒有聲調符號', () => {
  eq(splitZhuyin('ㄑㄧㄥ'), { base: 'ㄑㄧㄥ', tone: '' });
  eq(splitZhuyin('ㄍㄨ'), { base: 'ㄍㄨ', tone: '' });
});

test('輕聲也拆得出來（目前資料沒有，但規則要完整）', () => {
  eq(splitZhuyin('˙ㄉㄜ'), { base: 'ㄉㄜ', tone: '˙' });
});

test('空值不會炸', () => {
  eq(splitZhuyin(''), { base: '', tone: '' });
  eq(splitZhuyin(null), { base: '', tone: '' });
  eq(splitZhuyin(undefined), { base: '', tone: '' });
});

// 需要 fixture（tests/.data.js），理由同 progress.test.js。
if (typeof ELEMENTS !== 'undefined') {
  test('118 個元素的注音都拆得出音節，聲調最多一個', () => {
    ELEMENTS.forEach(e => {
      const { base, tone } = splitZhuyin(e.zhuyin);
      ok(base.length > 0, `z=${e.z} ${e.zh} 拆不出音節`);
      ok(tone.length <= 1, `z=${e.z} ${e.zh} 有 ${tone.length} 個聲調符號`);
      eq(base + tone, e.zhuyin.replace(/^˙/, '') + (e.zhuyin.indexOf('˙') === 0 ? '˙' : ''));
    });
  });

  test('直排後最長不超過三個符號（格子高度是照這個訂的）', () => {
    ELEMENTS.forEach(e => {
      const { base } = splitZhuyin(e.zhuyin);
      ok(base.length <= 3, `z=${e.z} ${e.zh} 的注音有 ${base.length} 個符號：${e.zhuyin}`);
    });
  });
}
