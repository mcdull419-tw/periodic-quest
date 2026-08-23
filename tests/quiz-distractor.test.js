const EL = [
  { z: 11, symbol: 'Na', zh: '鈉', period: 3, group: 1,  mainGroup: '1A', category: 'alkali-metal' },
  { z: 19, symbol: 'K',  zh: '鉀', period: 4, group: 1,  mainGroup: '1A', category: 'alkali-metal' },
  { z: 3,  symbol: 'Li', zh: '鋰', period: 2, group: 1,  mainGroup: '1A', category: 'alkali-metal' },
  { z: 12, symbol: 'Mg', zh: '鎂', period: 3, group: 2,  mainGroup: '2A', category: 'alkaline-earth' },
  { z: 20, symbol: 'Ca', zh: '鈣', period: 4, group: 2,  mainGroup: '2A', category: 'alkaline-earth' },
  { z: 7,  symbol: 'N',  zh: '氮', period: 2, group: 15, mainGroup: '5A', category: 'nonmetal' },
  { z: 8,  symbol: 'O',  zh: '氧', period: 2, group: 16, mainGroup: '6A', category: 'nonmetal' }
];
const target = EL[0]; // Na

test('回傳指定數量的干擾項', () => {
  eq(buildDistractors(target, EL, 3, () => 0).length, 3);
});

test('干擾項不含正解本身', () => {
  const d = buildDistractors(target, EL, 3, () => 0);
  eq(d.filter(e => e.z === target.z).length, 0);
});

test('干擾項不重複', () => {
  const d = buildDistractors(target, EL, 3, () => 0);
  eq(d.length, new Set(d.map(e => e.z)).size);
});

test('優先取同族的元素', () => {
  const d = buildDistractors(target, EL, 2, () => 0);
  ok(d.every(e => e.mainGroup === '1A'), '鈉的前兩個干擾項應為同族的鋰與鉀');
});

test('同族不足時取同週期', () => {
  const d = buildDistractors(target, EL, 3, () => 0);
  const zs = d.map(e => e.z).sort((a, b) => a - b);
  ok(zs.indexOf(12) >= 0 || zs.indexOf(19) >= 0,
     '同族只有兩個，第三個應來自同週期的鎂');
});

test('候選不足時仍回傳能給的最大數量而不當掉', () => {
  const tiny = [target, EL[1]];
  eq(buildDistractors(target, tiny, 3, () => 0).length, 1);
});
