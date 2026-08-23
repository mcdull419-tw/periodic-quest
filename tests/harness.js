// 極簡測試框架：提供 test() / eq() / ok() / throws() 全域函式。
// 這個檔案同時被 run.py（串接進 bundle，交給 osascript JXA 執行）
// 與 tests/index.html（用 <script> 直接載入到瀏覽器）使用，因此不能有 export。

var __pass = 0, __fail = 0, __msgs = [];

function test(name, fn) {
  try {
    fn();
    __pass++;
    __msgs.push("  PASS  " + name);
  } catch (e) {
    __fail++;
    __msgs.push("  FAIL  " + name + "\n         " + e.message);
  }
}

function eq(actual, expected) {
  var a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error("expected " + b + " but got " + a);
}

function ok(value, msg) {
  if (!value) throw new Error(msg || ("expected truthy but got " + JSON.stringify(value)));
}

function throws(fn, msg) {
  var threw = false;
  try { fn(); } catch (e) { threw = true; }
  if (!threw) throw new Error(msg || "expected function to throw");
}

function __report() {
  __msgs.forEach(function (m) { console.log(m); });
  console.log("");
  console.log(__pass + " passed, " + __fail + " failed");
  return __fail;
}
