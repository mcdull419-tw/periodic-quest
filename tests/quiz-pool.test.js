const STAGES_FIX = [
  { id: 1, name: 'A', groups: ['1A'], elements: [1, 3, 11] },
  { id: 2, name: 'B', groups: ['2A'], elements: [4, 12] }
];
function card(over) {
  return Object.assign({ z: 1, box: 1, nextDue: 0, lastSeen: 0, streak: 0,
                         correct: 0, wrong: 0, avgMs: 0, hesitant: false }, over);
}

test('availableElements 只給已解鎖關卡的元素', () => {
  eq(availableElements(STAGES_FIX, [1]), [1, 3, 11]);
  eq(availableElements(STAGES_FIX, [1, 2]), [1, 3, 11, 4, 12]);
});

test('buildPools 把沒學過的元素放進 fresh', () => {
  const pools = buildPools([], [1, 3, 11], 1000);
  eq(pools.fresh, [1, 3, 11]);
  eq(pools.due, []);
  eq(pools.weak, []);
});

test('buildPools 把到期的卡放進 due', () => {
  const pools = buildPools([card({ z: 1, nextDue: 500 }), card({ z: 3, nextDue: 9999 })],
                           [1, 3], 1000);
  eq(pools.due, [1]);
});

test('buildPools 的 weak 不含已在 due 的元素', () => {
  const cards = [card({ z: 1, nextDue: 500, wrong: 9 }), card({ z: 3, nextDue: 9999, wrong: 5 })];
  const pools = buildPools(cards, [1, 3], 1000);
  eq(pools.due, [1]);
  eq(pools.weak.indexOf(1), -1, 'due 的元素不應重複出現在 weak');
});

test('pickSource 依權重選擇來源', () => {
  const pools = { due: [1], weak: [2], fresh: [3] };
  eq(pickSource(pools, () => 0.1), 'due');
  eq(pickSource(pools, () => 0.7), 'weak');
  eq(pickSource(pools, () => 0.9), 'fresh');
});

test('來源池為空時遞補到有內容的池', () => {
  eq(pickSource({ due: [], weak: [2], fresh: [3] }, () => 0.1), 'weak');
  eq(pickSource({ due: [], weak: [], fresh: [3] }, () => 0.1), 'fresh');
});

test('全部池皆空時回傳 null', () => {
  eq(pickSource({ due: [], weak: [], fresh: [] }, () => 0.5), null);
});
