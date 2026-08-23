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

// 以下三個測試是 Task 1.3 資料修正的核心：原本的抽查測試只涵蓋 4 個
// 中文名，讓鑭系、錒系共 13 個抄錯的字（例如 65 號被寫成「銥」——那其實
// 是 77 號 Ir 的字）全部溜過驗收。這裡逐一比對全部 30 個鑭系＋錒系元素，
// 並加上「中文名不得重複」與「不得與其他原子序的正確字撞名」兩條通用檢查。

test('鑭系 15 個元素的中文名逐一比對', () => {
  const byZ = z => ELEMENTS.find(e => e.z === z);
  const expected = {
    57: '鑭', 58: '鈰', 59: '鐠', 60: '釹', 61: '鉕',
    62: '釤', 63: '銪', 64: '釓', 65: '鋱', 66: '鏑',
    67: '鈥', 68: '鉺', 69: '銩', 70: '鐿', 71: '鎦'
  };
  Object.entries(expected).forEach(([z, zh]) => {
    eq(byZ(Number(z)).zh, zh);
  });
});

test('錒系 15 個元素的中文名逐一比對', () => {
  const byZ = z => ELEMENTS.find(e => e.z === z);
  const expected = {
    89: '錒', 90: '釷', 91: '鏷', 92: '鈾', 93: '錼',
    94: '鈽', 95: '鋂', 96: '鋦', 97: '鉳', 98: '鉲',
    99: '鑀', 100: '鐨', 101: '鍆', 102: '鍩', 103: '鐒'
  };
  Object.entries(expected).forEach(([z, zh]) => {
    eq(byZ(Number(z)).zh, zh);
  });
});

test('validateElements 抓出中文名重複（同一個字填給兩個原子序）', () => {
  const errs = validateElements([
    { z: 96, symbol: 'Cm', zh: '鎦', period: 7, group: 3, mainGroup: null, category: 'actinide' },
    { z: 98, symbol: 'Cf', zh: '鎦', period: 7, group: 3, mainGroup: null, category: 'actinide' }
  ]);
  ok(errs.some(e => e.indexOf('重複') >= 0 && e.indexOf('96') >= 0 && e.indexOf('98') >= 0),
    '應回報 z=96 與 z=98 的中文名重複');
});

test('118 個元素的中文名彼此不重複', () => {
  const errs = validateElements(ELEMENTS);
  const dupErrs = errs.filter(e => e.indexOf('重複') >= 0 && e.indexOf('中文名') >= 0);
  eq(dupErrs, []);
});

test('中文名不得與其他元素的符號對應錯位：65 號不是「銥」（銥是 77 號 Ir）', () => {
  const byZ = z => ELEMENTS.find(e => e.z === z);
  eq(byZ(77).zh, '銥');
  ok(byZ(65).zh !== '銥', '65 號 Tb 的中文名不該是 77 號 Ir 的「銥」');
});

test('118 個元素的中文名逐一比對（鎖定已核對的狀態）', () => {
  // 這份對照表已由參考圖檔逐字核對過。任何改動 elements.json 中文名的
  // 行為都會被這條測試擋下——若確實需要修正某個字，請連同這份對照表
  // 一起更新，並在 commit 訊息說明依據。
  const EXPECTED_ZH = {
    1: '氫',
    2: '氦',
    3: '鋰',
    4: '鈹',
    5: '硼',
    6: '碳',
    7: '氮',
    8: '氧',
    9: '氟',
    10: '氖',
    11: '鈉',
    12: '鎂',
    13: '鋁',
    14: '矽',
    15: '磷',
    16: '硫',
    17: '氯',
    18: '氬',
    19: '鉀',
    20: '鈣',
    21: '鈧',
    22: '鈦',
    23: '釩',
    24: '鉻',
    25: '錳',
    26: '鐵',
    27: '鈷',
    28: '鎳',
    29: '銅',
    30: '鋅',
    31: '鎵',
    32: '鍺',
    33: '砷',
    34: '硒',
    35: '溴',
    36: '氪',
    37: '銣',
    38: '鍶',
    39: '釔',
    40: '鋯',
    41: '鈮',
    42: '鉬',
    43: '鎝',
    44: '釕',
    45: '銠',
    46: '鈀',
    47: '銀',
    48: '鎘',
    49: '銦',
    50: '錫',
    51: '銻',
    52: '碲',
    53: '碘',
    54: '氙',
    55: '銫',
    56: '鋇',
    57: '鑭',
    58: '鈰',
    59: '鐠',
    60: '釹',
    61: '鉕',
    62: '釤',
    63: '銪',
    64: '釓',
    65: '鋱',
    66: '鏑',
    67: '鈥',
    68: '鉺',
    69: '銩',
    70: '鐿',
    71: '鎦',
    72: '鉿',
    73: '鉭',
    74: '鎢',
    75: '錸',
    76: '鋨',
    77: '銥',
    78: '鉑',
    79: '金',
    80: '汞',
    81: '鉈',
    82: '鉛',
    83: '鉍',
    84: '釙',
    85: '砈',
    86: '氡',
    87: '鍅',
    88: '鐳',
    89: '錒',
    90: '釷',
    91: '鏷',
    92: '鈾',
    93: '錼',
    94: '鈽',
    95: '鋂',
    96: '鋦',
    97: '鉳',
    98: '鉲',
    99: '鑀',
    100: '鐨',
    101: '鍆',
    102: '鍩',
    103: '鐒',
    104: '鑪',
    105: '𨧀',
    106: '𨭎',
    107: '𨨏',
    108: '𨭆',
    109: '鿏',
    110: '鐽',
    111: '錀',
    112: '鎶',
    113: '鉨',
    114: '鈇',
    115: '鏌',
    116: '鉝',
    117: '鿬',
    118: '鿫',
  };
  ELEMENTS.forEach(e => {
    eq(e.zh, EXPECTED_ZH[e.z]);
  });
  eq(Object.keys(EXPECTED_ZH).length, 118);
});
