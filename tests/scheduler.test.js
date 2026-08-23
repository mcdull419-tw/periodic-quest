const DAY = 86400000;
function card(over) {
  return Object.assign({ z: 1, box: 1, nextDue: 0, lastSeen: 0, streak: 0,
                         correct: 0, wrong: 0, avgMs: 0 }, over);
}

test('newCard 從盒 1 開始且立刻到期', () => {
  const c = newCard(11, 1000);
  eq(c.z, 11); eq(c.box, 1); eq(c.nextDue, 1000);
});

test('答對升一盒，間隔依 BOX_INTERVALS_DAYS', () => {
  const c = reviewCard(card({ box: 1 }), true, 3000, 1000);
  eq(c.box, 2);
  eq(c.nextDue, 1000 + 1 * DAY);
});

test('從盒 3 答對升到盒 4，間隔七天', () => {
  const c = reviewCard(card({ box: 3 }), true, 3000, 1000);
  eq(c.box, 4);
  eq(c.nextDue, 1000 + 7 * DAY);
});

test('盒 5 是上限', () => {
  eq(reviewCard(card({ box: 5 }), true, 3000, 0).box, 5);
});

test('答錯直接掉回盒 1，不是退一盒', () => {
  const c = reviewCard(card({ box: 5, streak: 9 }), false, 3000, 1000);
  eq(c.box, 1);
  eq(c.streak, 0);
  eq(c.nextDue, 1000, '盒 1 立刻重考');
});

test('答對累加 correct，答錯累加 wrong', () => {
  eq(reviewCard(card({ correct: 2 }), true, 1000, 0).correct, 3);
  eq(reviewCard(card({ wrong: 2 }), false, 1000, 0).wrong, 3);
});

test('avgMs 以累計作答次數做移動平均', () => {
  const c1 = reviewCard(card({ correct: 0, wrong: 0, avgMs: 0 }), true, 4000, 0);
  eq(c1.avgMs, 4000);
  const c2 = reviewCard(c1, true, 2000, 0);
  eq(c2.avgMs, 3000);
});

test('答對但超過 8 秒，升盒但標記為猶豫', () => {
  const c = reviewCard(card({ box: 2 }), true, 9000, 0);
  eq(c.box, 3, '仍然升盒');
  eq(c.hesitant, true);
});

test('答對且夠快時不標記猶豫', () => {
  eq(reviewCard(card({ box: 2 }), true, 2000, 0).hesitant, false);
});

test('isDue 以 nextDue 小於等於 now 判定', () => {
  ok(isDue(card({ nextDue: 100 }), 100));
  ok(!isDue(card({ nextDue: 101 }), 100));
});

test('dueCards 依 nextDue 由早到晚排序', () => {
  const list = dueCards([card({ z: 1, nextDue: 50 }), card({ z: 2, nextDue: 10 }),
                         card({ z: 3, nextDue: 999 })], 100);
  eq(list.map(c => c.z), [2, 1]);
});

test('weaknessScore：錯越多、盒越低、會猶豫，分數越高', () => {
  ok(weaknessScore(card({ wrong: 5, box: 1 })) > weaknessScore(card({ wrong: 0, box: 5 })));
  ok(weaknessScore(card({ box: 3, hesitant: true })) > weaknessScore(card({ box: 3, hesitant: false })));
});

test('weakCards 取出最弱的前 N 張', () => {
  const list = weakCards([card({ z: 1, wrong: 0, box: 5 }),
                          card({ z: 2, wrong: 9, box: 1 }),
                          card({ z: 3, wrong: 3, box: 2 })], 2);
  eq(list.map(c => c.z), [2, 3]);
});

test('dueCards 遇到 null 項目不崩潰，正常的卡仍被正確處理', () => {
  const good1 = card({ z: 1, nextDue: 50 });
  const good2 = card({ z: 2, nextDue: 10 });
  const list = dueCards([good1, null, good2], 100);
  eq(list.map(c => c.z), [2, 1]);
});

test('dueCards 遇到 undefined 項目不崩潰，正常的卡仍被正確處理', () => {
  const good = card({ z: 1, nextDue: 50 });
  const list = dueCards([good, undefined], 100);
  eq(list.map(c => c.z), [1]);
});

test('weakCards 遇到 null 項目不崩潰，正常的卡仍被正確處理', () => {
  const good1 = card({ z: 1, wrong: 0, box: 5 });
  const good2 = card({ z: 2, wrong: 9, box: 1 });
  const list = weakCards([good1, null, good2], 2);
  eq(list.map(c => c.z), [2, 1]);
});

test('weakCards 遇到 undefined 項目不崩潰，正常的卡仍被正確處理', () => {
  const good = card({ z: 1, wrong: 9, box: 1 });
  const list = weakCards([good, undefined], 2);
  eq(list.map(c => c.z), [1]);
});
