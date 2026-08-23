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

// 以下五個測試涵蓋「陣列內含 null / undefined 項目」的對抗性案例。
// 這種情況在真實情境下會發生（例如 Haiku 產生資料時放棄某個元素留了
// 佔位符、或修 JSON 語法錯誤時手滑漏刪一筆），驗證函式必須清楚回報
// 是第幾筆有問題，而不是讓整支驗證被未捕捉例外中斷。

test('validateElements 對 elements 陣列內的 null 項目不崩潰，且回報錯誤', () => {
  const errs = validateElements([null]);
  ok(errs.length > 0, '應回報第 0 筆為 null');
});

test('validateGroups 對 groups 陣列內的 null 項目不崩潰，且回報錯誤', () => {
  const elements = [{ z: 1, symbol: 'H', zh: '氫', period: 1, group: 1, mainGroup: '1A', category: 'nonmetal' }];
  const errs = validateGroups([null], elements);
  ok(errs.length > 0, '應回報 groups 第 0 筆為 null');
});

test('validateGroups 對 elements 陣列內的 null 項目不崩潰', () => {
  const groups = [{
    group: '1A', name: '鹼金族', chant: '請',
    mapping: [{ char: '請', z: 1, symbol: 'H', zh: '氫' }]
  }];
  const errs = validateGroups(groups, [null]);
  ok(errs.length > 0, '應回報 mapping 指向的 z=1 在 elements 中找不到');
});

test('validateGroups 對 mapping 陣列內的 null 項目不崩潰，且回報錯誤', () => {
  const elements = [{ z: 1, symbol: 'H', zh: '氫', period: 1, group: 1, mainGroup: '1A', category: 'nonmetal' }];
  const errs = validateGroups([{
    group: '1A', name: '鹼金族', chant: '請',
    mapping: [null]
  }], elements);
  ok(errs.length > 0, '應回報 mapping 第 1 筆為 null');
});

test('validateStages 對 stages 陣列內的 null 項目不崩潰，且回報錯誤', () => {
  const elements = [{ z: 1, symbol: 'H', zh: '氫', period: 1, group: 1, mainGroup: '1A', category: 'nonmetal' }];
  const errs = validateStages([null], elements);
  ok(errs.length > 0, '應回報 stages 第 0 筆為 null');
});

test('台灣慣用中文名：矽、砈、鈉、鉀', () => {
  const byZ = z => ELEMENTS.find(e => e.z === z);
  eq(byZ(14).zh, '矽');
  eq(byZ(85).zh, '砈');
  eq(byZ(11).zh, '鈉');
  eq(byZ(19).zh, '鉀');
});

test('共 118 個元素且原子序連續', () => {
  eq(ELEMENTS.length, 118);
  for (let i = 0; i < 118; i++) eq(ELEMENTS[i].z, i + 1);
});

test('鑭系與錒系的 mainGroup 為 null', () => {
  const la = ELEMENTS.find(e => e.z === 57);
  eq(la.category, 'lanthanide');
  eq(la.mainGroup, null);
});

test('常見過渡金屬的分類正確', () => {
  const byZ = z => ELEMENTS.find(e => e.z === z);
  [26, 29, 30, 47, 79, 80].forEach(z => eq(byZ(z).category, 'transition-metal'));
});
