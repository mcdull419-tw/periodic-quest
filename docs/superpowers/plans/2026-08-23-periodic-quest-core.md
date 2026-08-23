# Periodic Quest — Plan 1：核心與最小可用版本

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出一個學生能實際打開使用的 PWA：可查詢完整週期表與八族口訣、可依 Leitner 排程做隨機測驗、答錯會自動排入複習。

**Architecture:** 純瀏覽器 ES Modules，無建置工具。`js/core/` 是不碰 DOM 的純函式邏輯並全部有測試；`js/ui/` 只負責渲染與事件。資料（元素、口訣、關卡）全部在 `data/*.json`，與程式碼分離。進度存 localStorage 並帶 schema 版本。

**Tech Stack:** HTML5 / CSS Grid / 原生 ES Modules / localStorage / Service Worker。測試以 Python 串接原始碼後交給 macOS 內建的 `osascript -l JavaScript`（JXA）執行，不需要 node 或任何測試框架。

**Spec:** `docs/superpowers/specs/2026-08-23-periodic-quest-design.md`

## Global Constraints

以下規則適用於**每一個** task，不再逐項重複：

- **語言**：所有使用者可見文字使用台灣繁體中文，避免中國大陸用語。程式碼註解亦同。
- **無依賴**：不得引入任何 npm 套件、CDN 連結、外部字體或外部圖片。環境沒有 node，也不會安裝。
- **ES Modules**：`js/` 底下所有檔案使用 `export` / `import`，以 `<script type="module">` 載入。
- **`js/core/` 不得碰 DOM**：不使用 `document`、`window`、`localStorage` 全域物件。需要儲存時由呼叫端把 storage 物件當參數傳入。這是測試能在 JXA 下執行的前提。
- **檔案大小**：任一檔案超過 400 行就必須拆分。
- **版權硬性規範**（spec §8.1）：不得使用任何官方圖片、角色立繪、照片、logo、字體、音樂；不得出現《排球少年》角色／隊伍名稱或 NCT WISH 成員姓名；不得嵌入或改作 `reference/化學元素週期表.jpg`（CC BY-NC-ND 3.0，禁止修改）。所有視覺素材以 CSS 與 SVG 自行繪製。
- **不破壞學生進度**：任何 localStorage 結構變動都必須附帶 migration，且有測試證明既有進度不遺失。
- **每個 task 結束**：跑測試 → commit → 更新 `docs/PROGRESS.md`。
- **參考素材位置**：`reference/元素表口訣.jpg`、`reference/化學元素週期表.jpg`（皆已 gitignore，僅供本機核對）。

## 共用資料形狀

所有 task 依此定義，不得自行更動欄位名稱。

**card**（單一元素的學習狀態）
```js
{ z: 11, box: 2, nextDue: 1756036400000, lastSeen: 1755950000000,
  streak: 1, correct: 3, wrong: 1, avgMs: 4200, hesitant: false }
```
`hesitant` 表示最近一次答對時超過 `HESITATION_MS`（8 秒）。答對但想很久，
代表還沒真的記熟，會提高該元素在弱項抽題時的權重。

**慣例：** `js/core/` 中所有接受 `cards` 參數的函式，一律收 **card 陣列**，
不收 `state.cards` 物件。`Object.values(state.cards)` 的轉換由呼叫端負責。
唯一例外是 `summarize(state, stages)`，它需要讀 `state.stats`，因此收整個 state。

**state**（存入 localStorage 的完整狀態）
```js
{
  schemaVersion: 1,
  updatedAt: 1755950000000,
  settings: { theme: "default", soundOn: true,
              customImages: { background: null, rewardCard: null } },
  unlockedStages: [1],
  cards: { "11": card, ... },
  stats: { totalAnswered: 0, totalCorrect: 0, cheerPoints: 0,
           bestRally: 0, sessions: [] }
}
```

**element**（`data/elements.json` 的一筆）
```js
{ z: 11, symbol: "Na", zh: "鈉", en: "Sodium", period: 3, group: 1,
  mainGroup: "1A", category: "alkali-metal", mass: 22.990, state: "solid" }
```
`group` 使用 IUPAC 1–18 編號。`mainGroup` 為 `"1A"`–`"8A"`，過渡金屬與鑭錒系為 `null`。

---

# Phase 0：地基

## Task 0.1：測試執行器

**建議模型：** Sonnet

**Files:**
- Create: `tests/harness.js`
- Create: `tests/run.py`
- Create: `tests/index.html`
- Create: `tests/fixtures/sample.js`
- Create: `tests/fixtures/sample.test.js`

**Interfaces:**
- Consumes: 無（第一個 task）
- Produces: 全域測試函式 `test(name, fn)`、`eq(actual, expected)`、`ok(value, msg)`、`throws(fn, msg)`；命令列入口 `python3 tests/run.py <src.js>... <file.test.js>`，測試全過時 exit 0，有任何失敗時 exit 1。

**背景：** 環境沒有 node，也沒有 `jsc`。macOS 內建的 `osascript -l JavaScript`（JXA）能執行現代 JS，但**不支援 ES modules**。做法是用 Python 讀取原始碼、以正規表示式移除 `import` / `export` 關鍵字、與測試檔串接後交給 osascript 執行。這條路已實測可行。

- [ ] **Step 1：寫 harness**

`tests/harness.js` — 這個檔案同時被 `run.py`（串接進 bundle）與 `tests/index.html`（瀏覽器裡用 `<script>` 載入）使用，因此**不能有 `export`**。

```javascript
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
```

- [ ] **Step 2：寫 run.py**

```python
#!/usr/bin/env python3
"""串接 ES module 原始碼與測試檔，交給 osascript (JXA) 執行。

用法：python3 tests/run.py js/core/scheduler.js tests/scheduler.test.js
測試全過 exit 0，有失敗 exit 1。
"""
import pathlib
import re
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
HARNESS = ROOT / "tests" / "harness.js"
FOOTER = '\nif (__report() > 0) { throw new Error("TESTS_FAILED"); }\n'


def strip_modules(src):
    """移除 ES module 語法，讓 JXA 能直接執行。"""
    src = re.sub(r'^\s*import\s+[^;]*?;\s*$', '', src, flags=re.M | re.S)
    src = re.sub(r'^\s*export\s+default\s+', '', src, flags=re.M)
    src = re.sub(r'^\s*export\s+', '', src, flags=re.M)
    return src


def build_bundle(paths):
    parts = [HARNESS.read_text(encoding="utf-8")]
    for p in paths:
        path = pathlib.Path(p)
        if not path.is_absolute():
            path = ROOT / path
        parts.append("// ==== %s ====" % p)
        parts.append(strip_modules(path.read_text(encoding="utf-8")))
    parts.append(FOOTER)
    return "\n".join(parts)


def main(paths):
    if not paths:
        sys.stderr.write("用法：python3 tests/run.py <src.js>... <file.test.js>\n")
        return 2
    bundle = build_bundle(paths)
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False,
                                     encoding="utf-8") as f:
        f.write(bundle)
        tmp = f.name
    result = subprocess.run(["osascript", "-l", "JavaScript", tmp],
                            capture_output=True, text=True)
    sys.stdout.write(result.stdout)
    if result.returncode != 0 and "TESTS_FAILED" not in result.stderr:
        sys.stderr.write(result.stderr)
    return 1 if result.returncode != 0 else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

- [ ] **Step 3：寫 fixture，證明執行器抓得到失敗**

`tests/fixtures/sample.js`
```javascript
export function double(n) { return n * 2; }
```

`tests/fixtures/sample.test.js`
```javascript
test('double 會加倍', () => { eq(double(3), 6); });
test('這個測試故意失敗', () => { eq(double(3), 7); });
```

- [ ] **Step 4：執行並確認失敗被偵測到**

Run: `python3 tests/run.py tests/fixtures/sample.js tests/fixtures/sample.test.js; echo "EXIT=$?"`

Expected: 輸出含 `1 passed, 1 failed`，且 `EXIT=1`。

**這一步是本 task 的重點。** 一個永遠回報成功的測試執行器比沒有測試更危險。

- [ ] **Step 5：改掉 fixture 的失敗案例，確認會通過**

把 `eq(double(3), 7)` 改成 `eq(double(3), 6)`，重跑。

Expected: `2 passed, 0 failed`，`EXIT=0`。

- [ ] **Step 6：寫瀏覽器版測試頁**

`tests/index.html` — 用 `<script>` 依序載入 harness、原始碼、測試檔，把 `__report()` 的輸出寫進 `<pre>`。這是給人看的備援管道，CI 與 sub-agent 一律用 `run.py`。

因為瀏覽器直接載入的原始碼帶有 `export` 關鍵字會語法錯誤，此頁改以 `fetch` 取得檔案內容、用與 `run.py` 相同的規則去除 module 語法後 `eval`。頁面上需列出目前載入的檔案清單。

- [ ] **Step 7：Commit**

```bash
git add tests/
git commit -m "test: 加入 JXA 測試執行器"
```

---

## Task 0.2：PWA 外殼與設計 token

**建議模型：** Sonnet

**Files:**
- Create: `index.html`
- Create: `manifest.json`
- Create: `sw.js`
- Create: `css/tokens.css`
- Create: `css/components.css`
- Create: `js/main.js`
- Create: `assets/icon.svg`

**Interfaces:**
- Consumes: 無
- Produces: `js/main.js` 匯出 `registerScreen(name, renderFn)` 與 `navigate(name)`；`index.html` 內有 `<main id="app">` 供各畫面渲染。

- [ ] **Step 1：寫 index.html**

單一 `<main id="app">` 容器加上底部導覽列（首頁／週期表／測驗／複習）。以 `<script type="module" src="js/main.js">` 載入。`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`，並加入 `apple-mobile-web-app-capable`、`apple-mobile-web-app-status-bar-style` 這兩個讓 iPhone 加入主畫面後全螢幕顯示的 meta。

- [ ] **Step 2：寫 css/tokens.css**

所有色彩、字級、間距以 CSS 自訂屬性定義在 `:root`，之後換主題只改這個檔。至少包含：`--bg`、`--surface`、`--text`、`--text-dim`、`--accent`、`--accent-2`、`--correct`、`--wrong`、`--radius`、`--gap`。

字體使用系統字體堆疊，**不得連外部字體服務**：
```css
--font: -apple-system, "PingFang TC", "Heiti TC", sans-serif;
```

配色先給一組中性的預設值。spec §8.2 明確要求**不預先硬寫任何宣稱為官方應援色的色值**，實際配色留待學生在設定頁調整（Plan 2 實作）。

必須提供深色與淺色兩套：淺色寫在 `:root`，深色寫在 `@media (prefers-color-scheme: dark)` 底下覆寫同一組變數。

- [ ] **Step 3：寫 js/main.js 路由**

以 `location.hash` 做路由。維護一個 `screens` 物件，`navigate(name)` 清空 `#app` 後呼叫對應的 render 函式。此時尚無畫面註冊，先讓它在找不到畫面時顯示「建置中」。

- [ ] **Step 4：寫 manifest.json 與 sw.js**

`manifest.json`：`name`、`short_name`（「元素週期表」）、`start_url: "./"`、`display: "standalone"`、`background_color`、`theme_color`、指向 `assets/icon.svg` 的 icons。

`sw.js`：cache-first 策略，快取名稱含版本字串（例如 `pq-v1`）。`activate` 事件中刪除所有名稱不等於目前版本的舊快取。**這一段必須做對**，否則學生會拿到舊版卡住。

- [ ] **Step 5：手動驗證**

Run: `python3 -m http.server 8000`（在專案根目錄）

在瀏覽器開 `http://localhost:8000`，確認：頁面載入無 console 錯誤、底部導覽可點、Service Worker 在 DevTools 的 Application 分頁顯示為 activated。

- [ ] **Step 6：Commit**

```bash
git add index.html manifest.json sw.js css/ js/ assets/
git commit -m "feat: PWA 外殼、路由與設計 token"
```

---

# Phase 1：資料

## Task 1.1：資料驗證測試

**建議模型：** Sonnet

**Files:**
- Create: `tests/data.test.js`
- Create: `js/core/validate.js`

**Interfaces:**
- Consumes: 無
- Produces: `validateElements(elements)`、`validateGroups(groups, elements)`、`validateStages(stages, elements)`，各回傳錯誤訊息字串陣列（空陣列代表通過）。

**這個 task 先寫，讓後面產生資料的 task 有客觀的驗收標準。** 特別是 Task 1.3 由 Haiku 執行，必須有自動化的方式抓出捏造或抄錯的資料。

- [ ] **Step 1：寫測試**

`tests/data.test.js`
```javascript
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
```

- [ ] **Step 2：跑測試確認失敗**

Run: `python3 tests/run.py js/core/validate.js tests/data.test.js`

Expected: 失敗，訊息類似 `validateElements is not defined`（此時 `validate.js` 尚未建立，`run.py` 會因讀不到檔案而報錯，先建立空檔即可）。

- [ ] **Step 3：實作 validate.js**

`CATEGORIES` 列舉：`alkali-metal`, `alkaline-earth`, `transition-metal`, `post-transition-metal`, `metalloid`, `nonmetal`, `halogen`, `noble-gas`, `lanthanide`, `actinide`。

`validateElements` 檢查：`z` 為 1–118 的整數且不重複、`symbol` 符合 `/^[A-Z][a-z]{0,2}$/`、`zh` 非空、`period` 為 1–7、`category` 在列舉內、`mainGroup` 為 `null` 或 `1A`–`8A`。

`validateGroups` 檢查：`chant` 的字數等於 `mapping` 長度、`mapping[i].char` 等於 `chant` 的第 i 個字、每筆 `z` 都能在 `elements` 中找到、且 `symbol` 與 `zh` 與 `elements` 完全一致。

`validateStages` 檢查：`id` 唯一、`elements` 內每個 `z` 都存在於 `elements`、跨 stage 不重複收錄同一元素。

錯誤訊息使用繁體中文，並標明是哪一筆出問題（例如 `"元素 z=52：中文名不一致，elements 為「碲」但 mapping 為「地」"`）。

- [ ] **Step 4：跑測試確認通過**

Run: `python3 tests/run.py js/core/validate.js tests/data.test.js`

Expected: `8 passed, 0 failed`

- [ ] **Step 5：Commit**

```bash
git add js/core/validate.js tests/data.test.js
git commit -m "test: 加入元素、口訣、關卡的資料驗證"
```

---

## Task 1.2：八族口訣資料

**建議模型：** Sonnet

**Files:**
- Create: `data/mnemonics-groups.json`
- Create: `tests/groups.test.js`

**Interfaces:**
- Consumes: `validateGroups` (Task 1.1)
- Produces: `data/mnemonics-groups.json`，八筆，供出題器題型 6、7 與教學畫面使用。

**這是逐字抄寫工作，不是創作。** 口訣內容一字不得更動，來源為 spec §5.2.1 的表格。抄錯一個字，學生就背錯一個元素。

- [ ] **Step 1：寫入八族資料**

每筆結構如 spec §5.2.1。八族口訣與對應元素：

| group | name | chant | mapping 的 z 依序 |
|---|---|---|---|
| 1A | 鹼金族 | 請你讓佳如設法 | 1, 3, 11, 19, 37, 55, 87 |
| 2A | 鹼土金族 | 媲美蓋斯被雷 | 4, 12, 20, 38, 56, 88 |
| 3A | 硼族 | 朋屢嫁英他 | 5, 13, 31, 49, 81 |
| 4A | 碳族 | 嘆息著西遷 | 6, 14, 32, 50, 82 |
| 5A | 氮族 | 但你身體病 | 7, 15, 33, 51, 83 |
| 6A | 氧族 | 楊柳溪地破 | 8, 16, 34, 52, 84 |
| 7A | 鹵素 | 浮綠秀點鱷 | 9, 17, 35, 53, 85 |
| 8A | 惰性氣體 | 害乃亞克先動 | 2, 10, 18, 36, 54, 86 |

`scene` 與 `sceneNext` 依 spec §5.2.2 的場景串接填寫：

- 1A `scene`：「一個叫佳如的女生站著想辦法」，`sceneNext`：`"2A"`
- 2A `scene`：「佳如想著被雷劈到的蓋斯」，`sceneNext`：`"3A"`
- 3A `scene`：「朋友屢次搭飛機嫁到英國去」，`sceneNext`：`"4A"`
- 4A `scene`：「嘆著氣往西邊遷徙」，`sceneNext`：`"5A"`
- 5A `scene`：「但你身體生病了」，`sceneNext`：`"6A"`
- 6A `scene`：「楊柳樹下的小溪，地被水沖破」，`sceneNext`：`"7A"`
- 7A `scene`：「溪裡浮著一隻綠色的鱷魚」，`sceneNext`：`"8A"`
- 8A `scene`：「乃亞克被鱷魚嚇到先動了」，`sceneNext`：`null`

- [ ] **Step 2：寫測試**

`tests/groups.test.js`
```javascript
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
```

因為 JXA 無法 `fetch` JSON，測試需要能取用資料。做法是在 `run.py` 的呼叫中加入一個由 Python 產生的資料橋接檔。實作方式：新增 `tests/make-data-fixture.py`，讀取 `data/*.json` 後輸出 `tests/.data.js`，內容為 `var ELEMENTS = [...]; var GROUPS = [...]; var STAGES = [...];`。跑測試前先執行它。

- [ ] **Step 3：跑測試**

```bash
python3 tests/make-data-fixture.py
python3 tests/run.py js/core/validate.js tests/.data.js tests/groups.test.js
```

Expected: `6 passed, 0 failed`

此時 `elements.json` 尚未建立，`validateGroups` 會回報找不到元素。**這是預期的**——本 task 只需確認結構正確；完整通過留待 Task 1.3 完成後。若要先跑過，可暫時只驗證不依賴 elements 的四個測試。

- [ ] **Step 4：把 `tests/.data.js` 加入 .gitignore**

它是產生物，不進版控。

- [ ] **Step 5：Commit**

```bash
git add data/mnemonics-groups.json tests/groups.test.js tests/make-data-fixture.py .gitignore
git commit -m "feat: 加入八族口訣資料"
```

---

## Task 1.3：118 個元素資料

**建議模型：** Haiku

**Files:**
- Create: `data/elements.json`

**Interfaces:**
- Consumes: `validateElements`、`validateGroups` (Task 1.1)、`data/mnemonics-groups.json` (Task 1.2)
- Produces: `data/elements.json`，118 筆，所有後續功能的資料基礎。

**這是查表填值工作，不需要創作。** 資料正確性由 Task 1.1 的驗證測試與 Task 1.2 的交叉比對自動把關。

- [ ] **Step 1：核對中文名來源**

台灣慣用的元素中文名與其他地區有差異（例如 Si 台灣作「矽」、At 台灣作「砈」），必須以 `reference/化學元素週期表.jpg` 為準。用 Read 工具開啟該圖檔逐一核對，**不要憑記憶填寫**。

該圖檔為 CC BY-NC-ND 3.0 授權，禁止修改與再散布。此處僅作為查核資料正確性的參考，**不得**將圖檔本身複製進專案的任何可發布目錄。

- [ ] **Step 2：建立 elements.json**

118 筆，依 `z` 由小到大排序。欄位依本文件開頭「共用資料形狀」的 element 定義。

`state` 為 `"solid"` / `"liquid"` / `"gas"`（常溫常壓下）；未有定論的超重元素填 `"unknown"`。
`mass` 取小數點後三位；無穩定同位素者填該元素最穩定同位素的質量數（整數）。

- [ ] **Step 3：跑驗證**

```bash
python3 tests/make-data-fixture.py
python3 tests/run.py js/core/validate.js tests/.data.js tests/data.test.js tests/groups.test.js
```

Expected: 全數通過，`0 failed`。

`validateGroups` 會把口訣中的 44 個主族元素與 `elements.json` 逐一交叉比對符號與中文名。這一步若通過，代表最關鍵的 44 筆資料正確。

- [ ] **Step 4：加寫抽查測試**

`tests/data.test.js` 末尾追加，涵蓋容易搞錯的項目：

```javascript
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
```

- [ ] **Step 5：重跑並 commit**

```bash
python3 tests/make-data-fixture.py
python3 tests/run.py js/core/validate.js tests/.data.js tests/data.test.js tests/groups.test.js
git add data/elements.json tests/data.test.js
git commit -m "feat: 加入 118 個元素的完整資料"
```

---

## Task 1.4：關卡資料

**建議模型：** Sonnet

**Files:**
- Create: `data/stages.json`
- Create: `tests/stages.test.js`

**Interfaces:**
- Consumes: `validateStages` (Task 1.1)
- Produces: `data/stages.json`，七筆，供 `progress.js` 判定解鎖與 `quiz.js` 決定出題範圍。

- [ ] **Step 1：建立 stages.json**

依 spec §5.3。每筆結構：

```json
{
  "id": 1,
  "name": "新生入隊",
  "groups": ["1A"],
  "elements": [1, 3, 11, 19, 37, 55, 87],
  "unlockRatio": 0.8
}
```

七個關卡：

| id | name | groups | 元素數 |
|---|---|---|---|
| 1 | 新生入隊 | ["1A"] | 7 |
| 2 | 板凳待命 | ["2A"] | 6 |
| 3 | 先發登場 | ["7A"] | 5 |
| 4 | 快攻上手 | ["8A"] | 6 |
| 5 | 主力攻手 | ["3A","4A"] | 10 |
| 6 | 隊上王牌 | ["5A","6A"] | 10 |
| 7 | 全國大賽 | [] | 10 |

關卡 7 的 `groups` 為空陣列（無口訣，走圖像法），`elements` 為常見過渡金屬：
`[26, 29, 30, 47, 79, 80, 24, 25, 28, 78]`（鐵、銅、鋅、銀、金、汞、鉻、錳、鎳、鉑）。

- [ ] **Step 2：寫測試**

```javascript
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
```

- [ ] **Step 3：跑測試**

```bash
python3 tests/make-data-fixture.py
python3 tests/run.py js/core/validate.js tests/.data.js tests/stages.test.js
```

Expected: `5 passed, 0 failed`

- [ ] **Step 4：Commit**

```bash
git add data/stages.json tests/stages.test.js
git commit -m "feat: 加入七個關卡的資料"
```

---

# Phase 2：核心邏輯

## Task 2.1：狀態儲存與 schema 遷移

**建議模型：** Sonnet

**Files:**
- Create: `js/core/store.js`
- Create: `tests/store.test.js`

**Interfaces:**
- Consumes: 無
- Produces:
  - `CURRENT_SCHEMA_VERSION` → `1`
  - `createInitialState()` → state
  - `migrate(state)` → state（已是最新版則原樣回傳）
  - `loadState(storage)` → state（storage 為具備 `getItem`/`setItem` 的物件）
  - `saveState(storage, state)` → void
  - `getCard(state, z)` → card 或 `null`
  - `upsertCard(state, card)` → 新的 state（不可變更新，不修改原物件）

`STORAGE_KEY` 為 `"periodic-quest-state"`。

- [ ] **Step 1：寫測試**

```javascript
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
```

最後一個測試是本 task 的重點。**這是唯一能證明「改版不會清空學生進度」的東西。**

- [ ] **Step 2：跑測試確認失敗**

Run: `python3 tests/run.py js/core/store.js tests/store.test.js`
Expected: 全部 FAIL（函式未定義）

- [ ] **Step 3：實作 store.js**

`migrate` 以逐版遞增的方式實作：一個 `MIGRATIONS` 陣列，索引 i 的函式負責把版本 i 升到 i+1。`migrate` 從 `state.schemaVersion` 開始依序套用到最新版。目前只需要 `MIGRATIONS[0]`：把任何缺漏的頂層欄位以初始值補齊，**且不覆寫已存在的欄位**。

`loadState` 讀不到值時回傳 `createInitialState()`；`JSON.parse` 拋錯時，先以 `periodic-quest-backup-<timestamp>` 為 key 存下原始字串，再回傳初始狀態。

`saveState` 寫入前更新 `updatedAt`。

- [ ] **Step 4：跑測試確認通過**

Run: `python3 tests/run.py js/core/store.js tests/store.test.js`
Expected: `8 passed, 0 failed`

- [ ] **Step 5：Commit**

```bash
git add js/core/store.js tests/store.test.js
git commit -m "feat: 狀態儲存與 schema 遷移"
```

---

## Task 2.2：Leitner 複習排程

**建議模型：** Sonnet

**Files:**
- Create: `js/core/scheduler.js`
- Create: `tests/scheduler.test.js`

**Interfaces:**
- Consumes: 無
- Produces:
  - `BOX_INTERVALS_DAYS` → `[0, 1, 3, 7, 14]`（索引為 box−1）
  - `HESITATION_MS` → `8000`
  - `MAX_BOX` → `5`
  - `newCard(z, now)` → card（box 1，`nextDue` 等於 `now`）
  - `reviewCard(card, isCorrect, elapsedMs, now)` → 新的 card
  - `isDue(card, now)` → boolean
  - `dueCards(cards, now)` → card 陣列，依 `nextDue` 由早到晚
  - `weaknessScore(card)` → number（越高越弱）
  - `weakCards(cards, limit)` → card 陣列，依 `weaknessScore` 由高到低

`cards` 參數一律接受 card 陣列（不是 state.cards 物件），轉換由呼叫端負責。

- [ ] **Step 1：寫測試**

```javascript
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
```

- [ ] **Step 2：跑測試確認失敗**

Run: `python3 tests/run.py js/core/scheduler.js tests/scheduler.test.js`
Expected: 全部 FAIL

- [ ] **Step 3：實作 scheduler.js**

`weaknessScore` 的公式：`wrong * 2 + (MAX_BOX - box) + (card.hesitant ? 1 : 0)`。

`avgMs` 以 `(avgMs * n + elapsedMs) / (n + 1)` 更新，其中 `n = correct + wrong`（更新前的值）。

所有函式回傳新物件，不修改傳入的 card。

- [ ] **Step 4：跑測試確認通過**

Run: `python3 tests/run.py js/core/scheduler.js tests/scheduler.test.js`
Expected: `13 passed, 0 failed`

- [ ] **Step 5：Commit**

```bash
git add js/core/scheduler.js tests/scheduler.test.js
git commit -m "feat: Leitner 五盒複習排程"
```

---

## Task 2.3：出題來源與抽題權重

**建議模型：** Sonnet

**Files:**
- Create: `js/core/quiz.js`
- Create: `tests/quiz-pool.test.js`

**Interfaces:**
- Consumes: `dueCards`、`weakCards`、`newCard` (Task 2.2)
- Produces:
  - `POOL_WEIGHTS` → `{ due: 0.6, weak: 0.25, fresh: 0.15 }`
  - `availableElements(stages, unlockedStages)` → 原子序陣列
  - `buildPools(cards, availableZ, now)` → `{ due: [z...], weak: [z...], fresh: [z...] }`
  - `pickSource(pools, rng)` → `"due" | "weak" | "fresh"`（來源池為空時依序遞補）

`rng` 是一個回傳 0（含）到 1（不含）的函式，預設 `Math.random`。所有需要隨機的函式都必須接受它，測試才能給定值。

- [ ] **Step 1：寫測試**

```javascript
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
```

- [ ] **Step 2：跑測試確認失敗**

Run: `python3 tests/run.py js/core/scheduler.js js/core/quiz.js tests/quiz-pool.test.js`
Expected: 全部 FAIL

- [ ] **Step 3：實作**

`buildPools` 的順序很重要：先算 `due`，再從「不在 due 且已學過」的卡中取 `weak`（上限取 available 長度的一半，至少 3），最後 `fresh` 是 available 中完全沒有卡片記錄的元素。三個池互斥。

`pickSource` 把 `POOL_WEIGHTS` 依序累加成區間，用 `rng()` 落點決定。選中的池為空時，依 `due → weak → fresh` 的順序找第一個非空的池。

- [ ] **Step 4：跑測試確認通過**

Expected: `7 passed, 0 failed`

- [ ] **Step 5：Commit**

```bash
git add js/core/quiz.js tests/quiz-pool.test.js
git commit -m "feat: 出題來源池與抽題權重"
```

---

## Task 2.4：干擾選項

**建議模型：** Sonnet

**Files:**
- Modify: `js/core/quiz.js`
- Create: `tests/quiz-distractor.test.js`

**Interfaces:**
- Consumes: `data/elements.json` 的 element 形狀
- Produces: `buildDistractors(target, allElements, count, rng)` → element 陣列，長度為 `count`

**這個函式決定題目品質。** 隨機抽選的干擾項會讓學生用刪去法過關，等於沒測到辨識能力。

優先序（依序取，取滿為止）：
1. 同族（`mainGroup` 相同）
2. 同週期（`period` 相同）
3. 符號形近（首字母相同，或兩字母符號僅差一個字元）
4. 中文名形近（共用偏旁：金、气、石、水四類部首）
5. 仍不足時才隨機補

- [ ] **Step 1：寫測試**

```javascript
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
```

- [ ] **Step 2：跑測試確認失敗**

Run: `python3 tests/run.py js/core/quiz.js tests/quiz-distractor.test.js`

- [ ] **Step 3：實作**

依優先序逐層蒐集候選，每層內用 `rng` 洗牌後取用，避免每次都拿到同樣的干擾項。已取用的以 `z` 去重。

中文部首判斷：取中文名的第一個字元，比對它是否以「金」「气」「石」「氵」為部首。JS 無法直接取部首，改以硬編對照——`category` 為金屬類者視為金部，`noble-gas` 與常溫氣體視為气部。這個近似已足夠產生像樣的干擾項，不需要真正的部首資料庫。

- [ ] **Step 4：跑測試確認通過**

Expected: `6 passed, 0 failed`

- [ ] **Step 5：Commit**

```bash
git add js/core/quiz.js tests/quiz-distractor.test.js
git commit -m "feat: 依同族、同週期、形近排序的干擾選項"
```

---

## Task 2.5：題目生成與判分

**建議模型：** Sonnet

**Files:**
- Modify: `js/core/quiz.js`
- Create: `tests/quiz-question.test.js`

**Interfaces:**
- Consumes: `buildPools`、`pickSource`、`buildDistractors`
- Produces:
  - `QUESTION_TYPES` → `['symbol-to-zh','zh-to-symbol','z-to-element','symbol-spell','table-locate','chant-blank','group-id']`
  - `makeQuestion(type, z, data, rng)` → question
  - `nextQuestion(ctx, rng)` → question 或 `null`
  - `checkAnswer(question, answer)` → `{ correct: boolean, correctAnswer: any }`

question 形狀：
```js
{ type: 'symbol-to-zh', z: 11, prompt: 'Na', options: ['鈉','鋰','鉀','鎂'],
  answer: '鈉', groupRef: '1A' }
```
`options` 僅選擇題有；填空題（`symbol-spell`）為 `null`。

`data` 為 `{ elements, groups, stages }`。
`ctx` 為 `{ cards, stages, unlockedStages, data, now }`。

- [ ] **Step 1：寫測試**

```javascript
const EL = [
  { z: 1,  symbol: 'H',  zh: '氫', period: 1, group: 1,  mainGroup: '1A', category: 'nonmetal' },
  { z: 3,  symbol: 'Li', zh: '鋰', period: 2, group: 1,  mainGroup: '1A', category: 'alkali-metal' },
  { z: 11, symbol: 'Na', zh: '鈉', period: 3, group: 1,  mainGroup: '1A', category: 'alkali-metal' },
  { z: 19, symbol: 'K',  zh: '鉀', period: 4, group: 1,  mainGroup: '1A', category: 'alkali-metal' },
  { z: 12, symbol: 'Mg', zh: '鎂', period: 3, group: 2,  mainGroup: '2A', category: 'alkaline-earth' },
  { z: 20, symbol: 'Ca', zh: '鈣', period: 4, group: 2,  mainGroup: '2A', category: 'alkaline-earth' },
  { z: 26, symbol: 'Fe', zh: '鐵', period: 4, group: 8,  mainGroup: null, category: 'transition-metal' },
  { z: 8,  symbol: 'O',  zh: '氧', period: 2, group: 16, mainGroup: '6A', category: 'nonmetal' }
];

const DATA = {
  elements: EL,
  groups: [{
    group: '1A', name: '鹼金族', chant: '請你讓佳如設法',
    mapping: [
      { char: '請', z: 1,  symbol: 'H',  zh: '氫' },
      { char: '你', z: 3,  symbol: 'Li', zh: '鋰' },
      { char: '讓', z: 11, symbol: 'Na', zh: '鈉' }
    ]
  }],
  stages: [{ id: 1, name: 'A', groups: ['1A'], elements: [1, 3, 11] }]
};

test('symbol-to-zh 的題幹是符號，選項含正解', () => {
  const q = makeQuestion('symbol-to-zh', 11, DATA, () => 0);
  eq(q.prompt, 'Na');
  eq(q.answer, '鈉');
  ok(q.options.indexOf('鈉') >= 0);
  eq(q.options.length, 4);
});

test('zh-to-symbol 的題幹是中文名', () => {
  const q = makeQuestion('zh-to-symbol', 11, DATA, () => 0);
  eq(q.prompt, '鈉');
  eq(q.answer, 'Na');
});

test('symbol-spell 是填空題，沒有選項', () => {
  const q = makeQuestion('symbol-spell', 11, DATA, () => 0);
  eq(q.options, null);
  eq(q.answer, 'Na');
});

test('chant-blank 挖掉口訣中的一個字', () => {
  const q = makeQuestion('chant-blank', 11, DATA, () => 0);
  eq(q.answer, '讓');
  ok(q.prompt.indexOf('□') >= 0, '題幹應有空格符號');
  eq(q.prompt.length, '請你讓佳如設法'.length);
  eq(q.groupRef, '1A');
});

test('group-id 問元素屬於哪一族', () => {
  const q = makeQuestion('group-id', 11, DATA, () => 0);
  eq(q.answer, '1A');
  ok(q.options.indexOf('1A') >= 0);
});

test('沒有口訣的元素不會產生 chant-blank 題', () => {
  eq(makeQuestion('chant-blank', 26, DATA, () => 0), null);
});

test('checkAnswer 對選擇題做精確比對', () => {
  const q = makeQuestion('symbol-to-zh', 11, DATA, () => 0);
  eq(checkAnswer(q, '鈉').correct, true);
  eq(checkAnswer(q, '鋰').correct, false);
});

test('symbol-spell 判分時忽略大小寫與前後空白', () => {
  const q = makeQuestion('symbol-spell', 11, DATA, () => 0);
  eq(checkAnswer(q, ' na ').correct, true);
  eq(checkAnswer(q, 'NA').correct, true);
  eq(checkAnswer(q, 'Nb').correct, false);
});

test('checkAnswer 一律回報正確答案供回饋顯示', () => {
  const q = makeQuestion('symbol-spell', 11, DATA, () => 0);
  eq(checkAnswer(q, 'xx').correctAnswer, 'Na');
});

test('nextQuestion 在無可用元素時回傳 null', () => {
  eq(nextQuestion({ cards: [], stages: DATA.stages, unlockedStages: [],
                    data: DATA, now: 0 }, () => 0), null);
});

test('nextQuestion 產生的題目其元素在已解鎖範圍內', () => {
  const q = nextQuestion({ cards: [], stages: DATA.stages, unlockedStages: [1],
                           data: DATA, now: 0 }, () => 0.5);
  ok([1, 3, 11].indexOf(q.z) >= 0);
});
```

- [ ] **Step 2：跑測試確認失敗**

Run: `python3 tests/run.py js/core/scheduler.js js/core/quiz.js tests/quiz-question.test.js`

- [ ] **Step 3：實作**

`makeQuestion` 對不適用的組合回傳 `null`（例如過渡金屬沒有口訣，`chant-blank` 與 `group-id` 都無法出題）。`nextQuestion` 遇到 `null` 時改抽其他題型，最多重試題型總數次後放棄。

`chant-blank` 的題幹以 `□` 取代該字，`answer` 為被挖掉的字。

`table-locate` 的 `answer` 為 `{ period, group }`，`checkAnswer` 比對兩個數字皆相符。

`checkAnswer` 對 `symbol-spell` 使用 `String(answer).trim().toLowerCase()` 與正解比較。

- [ ] **Step 4：跑測試確認通過**

Expected: `11 passed, 0 failed`

- [ ] **Step 5：跑全部測試，確認沒有弄壞既有功能**

```bash
python3 tests/make-data-fixture.py
for t in tests/*.test.js; do echo "== $t"; python3 tests/run.py js/core/*.js tests/.data.js "$t" || exit 1; done
```

- [ ] **Step 6：Commit**

```bash
git add js/core/quiz.js tests/quiz-question.test.js
git commit -m "feat: 七種題型的生成與判分"
```

---

## Task 2.6：進度與關卡解鎖

**建議模型：** Sonnet

**Files:**
- Create: `js/core/progress.js`
- Create: `tests/progress.test.js`

**Interfaces:**
- Consumes: state（Task 2.1）、stages（Task 1.4）
- Produces:
  - `UNLOCK_BOX_THRESHOLD` → `3`
  - `stageCompletion(cards, stage)` → `{ total, mastered, ratio }`（`cards` 為 card 陣列，`mastered` 為 box ≥ 3 的張數）
  - `isStageUnlocked(cards, stages, stageId)` → boolean
  - `computeUnlockedStages(cards, stages)` → 已解鎖的 stage id 陣列
  - `summarize(state, stages)` → `{ answered, correct, accuracy, masteredCount, totalCount, byStage }`

解鎖規則：關卡 1 永遠解鎖；關卡 N 解鎖的條件是關卡 N−1 有 `Math.ceil(total * unlockRatio)` 個元素達到 box ≥ 3。

- [ ] **Step 1：寫測試**

```javascript
const ST = [
  { id: 1, name: 'A', groups: ['1A'], elements: [1, 3, 11, 19, 37], unlockRatio: 0.8 },
  { id: 2, name: 'B', groups: ['2A'], elements: [4, 12], unlockRatio: 0.8 }
];
function c(z, box) {
  return { z, box, nextDue: 0, lastSeen: 0, streak: 0, correct: 0, wrong: 0, avgMs: 0 };
}

test('stageCompletion 只計入盒 3 以上的元素', () => {
  const r = stageCompletion([c(1, 3), c(3, 2), c(11, 5)], ST[0]);
  eq(r.total, 5);
  eq(r.mastered, 2);
});

test('關卡 1 永遠是解鎖的', () => {
  ok(isStageUnlocked([], ST, 1));
});

test('前一關未達門檻時下一關維持鎖定', () => {
  ok(!isStageUnlocked([c(1, 3), c(3, 3), c(11, 3)], ST, 2),
     '五個元素需要四個達標，目前只有三個');
});

test('前一關達到門檻時下一關解鎖', () => {
  ok(isStageUnlocked([c(1, 3), c(3, 3), c(11, 3), c(19, 4)], ST, 2),
     'ceil(5 * 0.8) = 4，達標');
});

test('答對過但只在盒 2 不算達標', () => {
  ok(!isStageUnlocked([c(1, 2), c(3, 2), c(11, 2), c(19, 2), c(37, 2)], ST, 2));
});

test('computeUnlockedStages 回傳連續解鎖的關卡', () => {
  eq(computeUnlockedStages([], ST), [1]);
  eq(computeUnlockedStages([c(1, 3), c(3, 3), c(11, 3), c(19, 3)], ST), [1, 2]);
});

test('summarize 計算正確率', () => {
  const state = { cards: { '1': c(1, 3) },
                  stats: { totalAnswered: 10, totalCorrect: 7 } };
  const s = summarize(state, ST);
  eq(s.answered, 10);
  eq(s.accuracy, 0.7);
});

test('summarize 在尚未作答時不會除以零', () => {
  const s = summarize({ cards: {}, stats: { totalAnswered: 0, totalCorrect: 0 } }, ST);
  eq(s.accuracy, 0);
});
```

- [ ] **Step 2：跑測試確認失敗**

Run: `python3 tests/run.py js/core/progress.js tests/progress.test.js`

- [ ] **Step 3：實作 progress.js**

`computeUnlockedStages` 由關卡 1 起逐一判斷，遇到第一個未解鎖的就停止——關卡是線性的，不會跳關。

- [ ] **Step 4：跑測試確認通過**

Expected: `8 passed, 0 failed`

- [ ] **Step 5：Commit**

```bash
git add js/core/progress.js tests/progress.test.js
git commit -m "feat: 進度統計與關卡解鎖判定"
```

---

# Phase 3：最小可用介面

Phase 3 的驗證方式與前面不同：`js/ui/` 不寫自動化測試（spec §9），改為在 `python3 -m http.server 8000` 下用瀏覽器人工確認。每個 task 都列出明確的人工驗收項目。

## Task 3.1：互動式週期表元件

**建議模型：** Sonnet

**Files:**
- Create: `js/components/periodic-table.js`
- Create: `css/periodic-table.css`

**Interfaces:**
- Consumes: `data/elements.json`
- Produces: `renderPeriodicTable(container, elements, options)` → void

`options`：
```js
{ onSelect: (element) => void,   // 點擊格子時呼叫
  highlightGroup: '1A' | null,   // 整族高亮
  highlightZ: [11, 19],          // 個別元素高亮
  mode: 'browse' | 'locate' }    // locate 模式下格子不顯示文字，供答題用
```

- [ ] **Step 1：實作版面**

CSS Grid，18 欄 7 列。每格用 `grid-column` 與 `grid-row` 明確定位（例如 H 是 `1/1`，He 是 `18/1`）。鑭系與錒系另外排成兩列置於下方，並在主表的 3 號位置放置「57–71」「89–103」的佔位格。

依 `category` 上色，色值全部取自 `css/tokens.css` 的變數，不在此檔硬寫顏色。

- [ ] **Step 2：手機版面**

18 欄在手機上無法縮到看得清楚。外層包一個 `overflow-x: auto` 的容器讓表格水平捲動，格子維持最小寬度 44px（可點擊的最小尺寸）。**頁面本身不得出現水平捲動**，只有表格容器內捲動。

- [ ] **Step 3：實作互動**

點擊格子呼叫 `options.onSelect(element)`。`highlightGroup` 有值時，該族所有格子加上高亮 class。`mode: 'locate'` 時格子只顯示原子序不顯示符號與中文名。

- [ ] **Step 4：人工驗收**

Run: `python3 -m http.server 8000`，開 `http://localhost:8000`

確認：118 格全部就位且原子序連續；鑭錒系位置正確；分類顏色在淺色與深色模式下都看得清楚；手機寬度（DevTools 375px）下表格可水平捲動而頁面不會；點擊任一格會觸發 callback。

- [ ] **Step 5：Commit**

```bash
git add js/components/periodic-table.js css/periodic-table.css
git commit -m "feat: 互動式週期表元件"
```

---

## Task 3.2：週期表查詢畫面

**建議模型：** Sonnet

**Files:**
- Create: `js/ui/screen-table.js`
- Modify: `js/main.js`（註冊畫面）

**Interfaces:**
- Consumes: `renderPeriodicTable` (Task 3.1)、`data/elements.json`、`data/mnemonics-groups.json`
- Produces: 註冊名為 `table` 的畫面

實作 spec §7.3。這是學生最常用的功能之一，且不受關卡解鎖限制——118 個元素全部可查。

- [ ] **Step 1：實作畫面**

上方是族別選擇列（1A–8A 八個按鈕加一個「全部」），選中時整族高亮並在表格上方顯示該族口訣。

點擊任一格展開詳細面板：原子序、符號、中文名、英文名、週期、族、分類、原子量、常溫狀態；若該元素屬於某一主族，顯示所屬族口訣並把對應的字高亮；若學生已有該元素的學習記錄，顯示目前在第幾個盒子。

- [ ] **Step 2：人工驗收**

確認：點鈉會顯示「請你**讓**佳如設法」且「讓」字高亮；點鐵（無口訣）不會顯示口訣區塊也不報錯；選 6A 時整條直行高亮且口訣顯示「楊柳溪地破」；未學過的元素顯示「尚未學習」而非空白或 undefined。

- [ ] **Step 3：Commit**

```bash
git add js/ui/screen-table.js js/main.js
git commit -m "feat: 完整週期表查詢畫面"
```

---

## Task 3.3：記憶法教學畫面

**建議模型：** Sonnet

**Files:**
- Create: `js/ui/screen-learn.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `data/mnemonics-groups.json`、`makeQuestion` (Task 2.5)
- Produces: 註冊名為 `learn` 的畫面，接受 `?group=1A` 參數

spec §5.2 要求：讀完記憶法要立刻用一次，不能只讀不用。

- [ ] **Step 1：實作逐字教學**

依 `mapping` 順序逐字呈現：顯示口訣全文，目前的字高亮，下方顯示該字對應的元素符號、中文名、原子序。「下一個」按鈕推進。

- [ ] **Step 2：實作場景串接**

在該族口訣的開頭顯示 `scene` 描述，結尾若 `sceneNext` 非 null，提示下一族的場景如何接上。

- [ ] **Step 3：學完立刻小測**

整族走完後，用 `makeQuestion` 對該族每個元素各出一題（題型在 `symbol-to-zh` 與 `zh-to-symbol` 之間輪流），答完顯示結果。此處**不寫入** localStorage——這是教學階段的當場練習，不是正式測驗，不應影響 Leitner 排程。

- [ ] **Step 4：人工驗收**

確認：1A 走完七個字順序正確；小測出七題；答錯有回饋並顯示正解；離開再進來不會殘留上次的狀態。

- [ ] **Step 5：Commit**

```bash
git add js/ui/screen-learn.js js/main.js
git commit -m "feat: 按族逐字教學與當場小測"
```

---

## Task 3.4：測驗畫面

**建議模型：** Sonnet

**Files:**
- Create: `js/ui/screen-quiz.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `nextQuestion`、`checkAnswer` (Task 2.5)、`reviewCard` (Task 2.2)、`loadState`/`saveState`/`upsertCard` (Task 2.1)、`renderPeriodicTable` (Task 3.1，供 `table-locate` 題型)
- Produces: 註冊名為 `quiz` 的畫面

- [ ] **Step 1：實作作答流程**

進入時 `loadState`，用 `nextQuestion` 取題。記錄題目呈現的時間戳，作答時算出 `elapsedMs`。

依 `question.type` 渲染：選擇題出四個按鈕；`symbol-spell` 出輸入框（`autocapitalize="off"` `autocorrect="off"`，避免 iPhone 自動修正把答案改掉）；`table-locate` 嵌入 `locate` 模式的週期表。

- [ ] **Step 2：實作判分與寫入**

`checkAnswer` 後顯示回饋：對錯、正解、該元素所屬族的口訣（若有）。`symbol-spell` 答對時額外顯示大小寫規則提示。

用 `reviewCard` 更新卡片，`upsertCard` 併回 state，更新 `stats.totalAnswered` 與 `totalCorrect`，`saveState` 寫回。

**這是唯一會寫入學習進度的畫面**，寫入邏輯集中在此，不散落各處。

- [ ] **Step 3：實作結束條件**

作答滿 20 題或使用者主動結束時，顯示本次結果：答對數、正確率、哪些元素答錯了。把該次記錄追加進 `stats.sessions`（只保留最近 30 筆）。

- [ ] **Step 4：人工驗收**

確認：連續答 20 題流程順暢；答錯的元素在重新進入測驗後很快再度出現（盒 1 立刻重考）；iPhone 上填空題不會被自動大寫干擾；重整頁面後進度沒有遺失；DevTools 的 Application → Local Storage 中能看到 `periodic-quest-state` 且 `cards` 有資料。

- [ ] **Step 5：Commit**

```bash
git add js/ui/screen-quiz.js js/main.js
git commit -m "feat: 測驗畫面與作答結果寫入"
```

---

## Task 3.5：首頁、複習入口與導覽

**建議模型：** Sonnet

**Files:**
- Create: `js/ui/screen-home.js`
- Create: `js/ui/screen-review.js`
- Modify: `js/main.js`
- Modify: `css/components.css`

**Interfaces:**
- Consumes: `summarize`、`computeUnlockedStages` (Task 2.6)、`dueCards` (Task 2.2)
- Produces: 註冊名為 `home` 與 `review` 的畫面；`home` 為預設路由

- [ ] **Step 1：實作首頁**

顯示：今天有幾張卡到期、目前解鎖到第幾關、各關卡的完成度（用 `stageCompletion` 的 ratio 畫進度條）、總正確率。

主要行動按鈕兩個：「開始複習」（到期卡優先）與「學新的一族」（跳到下一個未完成關卡的教學畫面）。未解鎖的關卡顯示鎖定狀態與解鎖條件（「再讓 2 個元素進入第 3 盒」）。

- [ ] **Step 2：實作複習畫面**

`review` 與 `quiz` 共用同一套作答元件，差別只在題目來源限定為 `dueCards`。若今天沒有到期卡，顯示「今天沒有要複習的，去學新的一族吧」並提供跳轉。

為避免重複程式碼，把 Task 3.4 的作答流程抽成 `js/ui/quiz-runner.js` 匯出的 `runQuiz(container, options)`，`quiz` 與 `review` 各自傳入不同的取題函式。

- [ ] **Step 3：完成底部導覽**

四個分頁：首頁、週期表、測驗、複習。目前所在分頁高亮。

- [ ] **Step 4：人工驗收**

確認：從首頁能走到全部四個畫面再走回來；沒有到期卡時複習頁的提示正確；關卡進度條數字與實際 box 狀態相符；未解鎖關卡的解鎖條件文字正確。

- [ ] **Step 5：跑全部核心測試，確認 UI 工作沒有動到邏輯**

```bash
python3 tests/make-data-fixture.py
for t in tests/*.test.js; do echo "== $t"; python3 tests/run.py js/core/*.js tests/.data.js "$t" || exit 1; done
```

- [ ] **Step 6：Commit**

```bash
git add js/ui/ js/main.js css/components.css
git commit -m "feat: 首頁、複習畫面與底部導覽"
```

---

# Phase 4：上線

## Task 4.1：階段 1 的個別元素圖像掛鉤

**建議模型：** Opus（主 session 親自撰寫）

**Files:**
- Create: `data/mnemonics-elements.json`
- Modify: `js/ui/screen-table.js`（顯示圖像掛鉤）

**Interfaces:**
- Consumes: `data/elements.json`
- Produces: `data/mnemonics-elements.json`，先只填 1A 的七個元素

spec §11.4：先驗證再量產。這七組是之後派給 Haiku 批次生產的範本樣本，風格必須立住。

- [ ] **Step 1：撰寫七筆內容**

1A 的七個元素：氫(1)、鋰(3)、鈉(11)、鉀(19)、銣(37)、銫(55)、鍅(87)。

每筆含 `z`、`imagery`、`hook`。風格要求見 spec §5.2.3：台灣繁中語感、圖像必須是國中生日常真的看得到的東西、`hook` 12 字以內、不與所屬族的口訣場景衝突。

- [ ] **Step 2：接到查詢畫面**

`screen-table.js` 的詳細面板中，若該元素有圖像掛鉤就顯示；沒有則不顯示該區塊（不要顯示空白框）。

- [ ] **Step 3：人工驗收**

確認：點鈉會同時看到族口訣（讓）與個別圖像掛鉤；點鐵兩者都沒有但畫面不會壞。

- [ ] **Step 4：Commit**

```bash
git add data/mnemonics-elements.json js/ui/screen-table.js
git commit -m "feat: 1A 七個元素的圖像記憶掛鉤"
```

---

## Task 4.2：部署與說明文件

**建議模型：** Sonnet

**Files:**
- Create: `README.md`
- Create: `.github/workflows/pages.yml`（若採用 Actions 部署）
- Modify: `sw.js`（確認快取版本策略）

**Interfaces:**
- Consumes: 全部
- Produces: 可公開存取的 GitHub Pages 網址

- [ ] **Step 1：寫 README**

包含：專案用途、本機開發方式（`python3 -m http.server 8000`）、測試執行方式、資料檔說明、**素材來源致謝與授權聲明**。

致謝需明確寫出：口訣來源為 @酪梨寶 的元素表口訣圖（僅採用口訣文字，插圖為本專案自行繪製）；元素中文名核對來源為 LiFe 生活化學的化學元素週期表（CC BY-NC-ND 3.0，僅作資料核對，未嵌入或改作原圖）。

- [ ] **Step 2：設定 GitHub remote 與 Pages**

此步驟需要使用者的 GitHub 帳號。建立 repo 後：

```bash
git remote add origin <使用者提供的網址>
git push -u origin main
```

在 repo 的 Settings → Pages 選擇由 `main` 分支根目錄提供服務。

- [ ] **Step 3：驗證 Service Worker 的更新行為**

部署後改一行文字再 push，確認手機重整後會拿到新版而不是卡在快取。這是 PWA 最常見的坑，必須實際驗過。

- [ ] **Step 4：iPhone 實機驗收**

用 Safari 開 Pages 網址 → 分享 → 加入主畫面 → 從主畫面開啟。

確認：全螢幕無 Safari 網址列；開飛航模式後仍能開啟並作答；作答進度在關閉再開啟後仍在。

- [ ] **Step 5：Commit**

```bash
git add README.md .github/
git commit -m "docs: 說明文件與 GitHub Pages 部署"
```

---

## 完成標準

Plan 1 完成時應達到：

1. `for t in tests/*.test.js; do python3 tests/run.py js/core/*.js tests/.data.js "$t"; done` 全數通過
2. 學生能從 iPhone 主畫面開啟，離線可用
3. 118 個元素可查詢，點任一主族元素能看到所屬族口訣並高亮對應字
4. 八族口訣皆可學可測
5. 測驗會依 Leitner 排程重複出現答錯的元素
6. 關卡依學習狀況解鎖

Plan 2 的範圍（不在本計畫內）：遊戲層（連段、應援值、賽末點、SVG 視覺）、其餘六個關卡的圖像掛鉤內容、設定畫面與自訂圖片、圖鑑收藏。
