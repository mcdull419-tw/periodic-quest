function fakeStorage(initial) {
  const data = Object.assign({}, initial);
  return {
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    _dump: () => data
  };
}

test('createInitialState 產生合法的初始狀態', () => {
  const s = createInitialState();
  eq(s.schemaVersion, CURRENT_SCHEMA_VERSION);
  eq(s.unlockedStages, [1]);
  eq(s.cards, {});
  eq(s.stats.totalAnswered, 0);
});

test('空 storage 載入時回傳初始狀態', () => {
  const s = loadState(fakeStorage({}));
  eq(s.schemaVersion, CURRENT_SCHEMA_VERSION);
});

test('saveState 之後 loadState 拿回同樣的資料', () => {
  const st = fakeStorage({});
  const s = createInitialState();
  s.stats.totalAnswered = 42;
  saveState(st, s);
  eq(loadState(st).stats.totalAnswered, 42);
});

test('資料損毀時回傳初始狀態並保留備份', () => {
  const st = fakeStorage({ 'periodic-quest-state': '{壞掉的 JSON' });
  const s = loadState(st);
  eq(s.schemaVersion, CURRENT_SCHEMA_VERSION);
  const keys = Object.keys(st._dump()).filter(k => k.indexOf('backup') >= 0);
  ok(keys.length === 1, '應留下一份備份');
});

test('upsertCard 不修改原本的 state', () => {
  const s = createInitialState();
  const s2 = upsertCard(s, { z: 11, box: 1, nextDue: 0, lastSeen: 0, streak: 0, correct: 0, wrong: 0, avgMs: 0 });
  eq(Object.keys(s.cards).length, 0);
  eq(Object.keys(s2.cards).length, 1);
});

test('getCard 找不到時回傳 null', () => {
  eq(getCard(createInitialState(), 11), null);
});

test('migrate 對已是最新版的狀態不做更動', () => {
  const s = createInitialState();
  eq(migrate(s), s);
});

test('migrate 補上缺漏的欄位而不清空既有進度', () => {
  const old = {
    schemaVersion: 0,
    cards: { '11': { z: 11, box: 3, nextDue: 999, lastSeen: 0, streak: 2, correct: 5, wrong: 1, avgMs: 3000 } }
  };
  const s = migrate(old);
  eq(s.schemaVersion, CURRENT_SCHEMA_VERSION);
  eq(s.cards['11'].box, 3, '既有的盒號必須保留');
  eq(s.cards['11'].correct, 5, '既有的答對次數必須保留');
  ok(s.settings, '應補上 settings');
  ok(s.stats, '應補上 stats');
});
