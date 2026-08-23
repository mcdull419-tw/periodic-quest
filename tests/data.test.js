test('validateElements 抓出重複的原子序', () => {
  const errs = validateElements([
    { z: 1, symbol: 'H', zh: '氫', period: 1, group: 1, mainGroup: '1A', category: 'nonmetal' },
    { z: 1, symbol: 'X', zh: '假', period: 1, group: 1, mainGroup: '1A', category: 'nonmetal' }
  ]);
  ok(errs.some(e => e.indexOf('重複') >= 0), '應回報重複原子序');
});

test('validateElements 抓出不合法的元素符號', () => {
  const errs = validateElements([
    { z: 1, symbol: 'hH', zh: '氫', period: 1, group: 1, mainGroup: '1A', category: 'nonmetal' }
  ]);
  ok(errs.length > 0, '符號 hH 不符合首字母大寫規則');
});

test('validateElements 抓出不在列舉內的 category', () => {
  const errs = validateElements([
    { z: 1, symbol: 'H', zh: '氫', period: 1, group: 1, mainGroup: '1A', category: '亂寫' }
  ]);
  ok(errs.length > 0, '應回報未知的 category');
});

test('validateElements 對合法資料回傳空陣列', () => {
  const errs = validateElements([
    { z: 1, symbol: 'H', zh: '氫', period: 1, group: 1, mainGroup: '1A', category: 'nonmetal' }
  ]);
  eq(errs, []);
});

test('validateGroups 抓出口訣字數與元素數不符', () => {
  const elements = [{ z: 1, symbol: 'H', zh: '氫', period: 1, group: 1, mainGroup: '1A', category: 'nonmetal' }];
  const errs = validateGroups([{
    group: '1A', name: '鹼金族', chant: '請你',
    mapping: [{ char: '請', z: 1, symbol: 'H', zh: '氫' }]
  }], elements);
  ok(errs.some(e => e.indexOf('字數') >= 0), '口訣兩字但只對應一個元素，應回報');
});

test('validateGroups 抓出 mapping 與 elements 不一致', () => {
  const elements = [{ z: 1, symbol: 'H', zh: '氫', period: 1, group: 1, mainGroup: '1A', category: 'nonmetal' }];
  const errs = validateGroups([{
    group: '1A', name: '鹼金族', chant: '請',
    mapping: [{ char: '請', z: 1, symbol: 'H', zh: '錯的中文名' }]
  }], elements);
  ok(errs.length > 0, 'mapping 的 zh 與 elements 不符，應回報');
});

test('validateGroups 抓出 mapping 指向不存在的元素', () => {
  const errs = validateGroups([{
    group: '1A', name: '鹼金族', chant: '請',
    mapping: [{ char: '請', z: 999, symbol: 'Zz', zh: '不存在' }]
  }], []);
  ok(errs.length > 0, '應回報找不到 z=999');
});

test('validateStages 抓出指向不存在的元素', () => {
  const errs = validateStages(
    [{ id: 1, name: '新生入隊', elements: [999] }],
    [{ z: 1, symbol: 'H', zh: '氫', period: 1, group: 1, mainGroup: '1A', category: 'nonmetal' }]
  );
  ok(errs.length > 0, '應回報 stage 內有不存在的元素');
});
