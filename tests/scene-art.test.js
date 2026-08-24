// 口訣場景插圖（js/components/scene-art.js）的結構檢查。
// renderSceneArt 要碰 DOM 所以測不到，但「八族都有圖」「沒有引用外部素材」
// 「沒有硬寫色碼」這三件事是純字串檢查——而它們正好對應授權要求與
// 深色模式的正確性，漏掉不會報錯，只會安靜地壞掉。

const CODES = ['1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A'];

test('八族都有場景插圖', () => {
  eq(Object.keys(SCENE_ART).sort(), CODES.slice().sort());
});

test('沒有引用任何外部素材（spec §8.1：不使用原圖、不連外部資源）', () => {
  CODES.forEach(code => {
    const art = SCENE_ART[code];
    ok(art.indexOf('http') < 0, `${code} 出現外部連結`);
    ok(art.indexOf('<image') < 0, `${code} 嵌入了點陣圖`);
    ok(art.indexOf('xlink') < 0, `${code} 引用了外部參照`);
  });
});

test('顏色一律走 token，不硬寫色碼（深色模式才會跟著變）', () => {
  CODES.forEach(code => {
    ok(!/#[0-9a-fA-F]{3,6}/.test(SCENE_ART[code]), `${code} 硬寫了色碼`);
    ok(/currentColor|var\(--/.test(SCENE_ART[code]), `${code} 沒有用到任何 token`);
  });
});

test('每張圖都有實際的圖形，不是空殼', () => {
  CODES.forEach(code => {
    const art = SCENE_ART[code];
    const shapes = (art.match(/<(path|circle|rect|line|text)\b/g) || []).length;
    ok(shapes >= 3, `${code} 只有 ${shapes} 個圖形，太空了`);
  });
});
