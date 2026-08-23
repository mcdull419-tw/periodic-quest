test('關卡資料通過驗證', () => { eq(validateStages(STAGES, ELEMENTS), []); });

test('共七關，合計 54 個元素', () => {
  eq(STAGES.length, 7);
  eq(STAGES.reduce((n, s) => n + s.elements.length, 0), 54);
});

test('關卡順序為 1A 2A 7A 8A 然後 3A+4A 5A+6A', () => {
  eq(STAGES.map(s => s.groups.join('+')), ['1A', '2A', '7A', '8A', '3A+4A', '5A+6A', '']);
});

test('每個關卡的 elements 與其 groups 的口訣元素一致', () => {
  STAGES.filter(s => s.groups.length > 0).forEach(s => {
    const fromChant = s.groups
      .flatMap(g => GROUPS.find(x => x.group === g).mapping.map(m => m.z));
    eq(s.elements.slice().sort((a, b) => a - b),
       fromChant.slice().sort((a, b) => a - b));
  });
});

test('沒有元素被兩個關卡重複收錄', () => {
  const all = STAGES.flatMap(s => s.elements);
  eq(all.length, new Set(all).size);
});
