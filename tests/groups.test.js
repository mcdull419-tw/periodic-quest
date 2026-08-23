test('八族口訣通過驗證', () => {
  const errs = validateGroups(GROUPS, ELEMENTS);
  eq(errs, []);
});

test('共八族', () => { eq(GROUPS.length, 8); });

test('口訣涵蓋 44 個主族元素', () => {
  const total = GROUPS.reduce((n, g) => n + g.mapping.length, 0);
  eq(total, 44);
});

test('6A 第四個字是碲不是鉬', () => {
  const g = GROUPS.find(x => x.group === '6A');
  eq(g.mapping[3].zh, '碲');
  eq(g.mapping[3].symbol, 'Te');
  eq(g.mapping[3].z, 52);
});

test('3A 最後一個字對應鉈', () => {
  const g = GROUPS.find(x => x.group === '3A');
  eq(g.mapping[4].char, '他');
  eq(g.mapping[4].symbol, 'Tl');
});

test('場景串接成一條線，只有 8A 是終點', () => {
  const ends = GROUPS.filter(g => g.sceneNext === null);
  eq(ends.length, 1);
  eq(ends[0].group, '8A');
});
