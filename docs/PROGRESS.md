# Periodic Quest 進度

**最後更新：** 2026-08-23
**目前位置：** 執行中，分支 `feat/plan-1-core`。已完成 Task 0.1，下一步是 Task 0.2

---

## 給接手的 session：三十秒上手

1. 讀這個檔（你正在讀）
2. `git log --oneline -10` 看最近做了什麼
3. 翻到下面的〈下一步〉，照 `docs/superpowers/plans/2026-08-23-periodic-quest-core.md`
   裡對應的 task 執行

**不需要**重讀整個程式碼庫。每個 task 在計畫裡都是自包含的：要讀哪些檔、
產出哪些檔、驗收標準是什麼，都寫在該 task 底下。

---

## 這個專案是什麼

一個幫台灣國中生背元素週期表的 PWA，跑在 Mac 與 iPhone。
按族（直行）背口訣、Leitner 五盒間隔複習、隨機測驗、排球主題遊戲化。

- **設計文件：** `docs/superpowers/specs/2026-08-23-periodic-quest-design.md`
- **實作計畫：** `docs/superpowers/plans/2026-08-23-periodic-quest-core.md`（Plan 1）

---

## 環境重點（會踩到的坑）

- **沒有 node，也不會裝。** 不要提議 npm 套件、CDN 或任何建置工具。
- **沒有完整 Xcode**，只有 Command Line Tools。這就是選 PWA 而非原生 App 的原因。
- **測試怎麼跑：** `python3 tests/run.py js/core/xxx.js tests/xxx.test.js`
  底層是 Python 串接原始碼後交給 macOS 內建的 `osascript -l JavaScript`（JXA）。
  JXA 不支援 ES modules，所以 `run.py` 會先用正規表示式移除 `import` / `export`。
  失敗時 exit code 為 1，可以程式化驗證。
- **`js/core/` 不得碰 DOM。** 這是測試能在 JXA 下跑的前提，不是風格偏好。
- **本機預覽：** `python3 -m http.server 8000`
- **參考素材：** `reference/` 底下兩張圖已 gitignore，供核對元素中文名用，
  **不得**複製進可發布目錄（授權見設計文件 §8.1）。

---

## 工作規則

**一個 task = 一個 sub-agent = 一個 commit。**

每個 task 做完就 commit 並更新這個檔案，因此中斷點永遠落在 commit 邊界。
任何時候 token 用完都可以直接停，不會留下半殘狀態。

sub-agent 不繼承對話脈絡，派工時要把該 task 的完整內容貼給它。

---

## 進度

### Phase 0：地基
- [x] 0.1 測試執行器 — Sonnet（`afc8d54..4382c5c`）
- [ ] 0.2 PWA 外殼與設計 token — Sonnet

### Phase 1：資料
> **執行順序已調整為 1.1 → 1.3 → 1.2 → 1.4**（見下方裁決 B）

- [ ] 1.1 資料驗證測試 — Sonnet
- [ ] 1.3 118 個元素資料 — **Haiku**
- [ ] 1.2 八族口訣資料 — Sonnet
- [ ] 1.4 關卡資料 — Sonnet

### Phase 2：核心邏輯
- [ ] 2.1 狀態儲存與 schema 遷移 — Sonnet
- [ ] 2.2 Leitner 複習排程 — Sonnet
- [ ] 2.3 出題來源與抽題權重 — Sonnet
- [ ] 2.4 干擾選項 — Sonnet
- [ ] 2.5 題目生成與判分 — Sonnet
- [ ] 2.6 進度與關卡解鎖 — Sonnet

### Phase 3：最小可用介面
- [ ] 3.1 互動式週期表元件 — Sonnet
- [ ] 3.2 週期表查詢畫面 — Sonnet
- [ ] 3.3 記憶法教學畫面 — Sonnet
- [ ] 3.4 測驗畫面 — Sonnet
- [ ] 3.5 首頁、複習入口與導覽 — Sonnet

### Phase 4：上線
- [ ] 4.1 階段 1 的個別元素圖像掛鉤 — **Opus（主 session 親自寫）**
- [ ] 4.2 部署與說明文件 — Sonnet

---

## 下一步

**Task 0.2：PWA 外殼與設計 token**

## 執行期裁決（計畫的修正，覆寫計畫原文）

執行前的衝突掃描與各 task 的 review 過程中做出的決定。完整記錄在
`.superpowers/sdd/2026-08-23-periodic-quest-core/progress.md`（該目錄已 gitignore）。

- **裁決 A**：`tests/make-data-fixture.py` 改由 Task 1.3 建立（計畫原本列在 1.2）。
- **裁決 B**：Phase 1 執行順序改為 **1.1 → 1.3 → 1.2 → 1.4**。計畫原順序要求
  Task 1.2 的 `validateGroups(GROUPS, ELEMENTS)` 在 `elements.json` 尚不存在時
  就通過，Step 3 同時寫著「這是預期的失敗」與「Expected: 0 failed」，自相矛盾。
  依賴方向是單向的：elements 不需要 groups 即可驗證，反之不成立。
  **實作者不得為了讓測試變綠而弱化 `validateGroups` 的斷言。**
- **裁決 C**：Task 3.5 的檔案清單補上 `Create: js/ui/quiz-runner.js` 與
  `Modify: js/ui/screen-quiz.js`。
- **裁決 D**：新增 `js/data/load.js`，匯出 `async loadData()` →
  `{ elements, groups, stages }`，含模組層級快取。歸入 Task 3.2。計畫原本
  沒有任何 task 定義瀏覽器端如何載入 JSON。
- **Task 0.1 裁決**：計畫提供的 `run.py` 範例程式碼有實質 bug——JXA 的
  `console.log` 寫到 stderr 而非 stdout，原程式碼會讓測試結果訊息完全不顯示。
  已修正並實測六種情境。**計畫文件 Task 0.1 Step 2 的程式碼已過時，
  以 `tests/run.py` 的實際內容為準。**

## 已知的待處理小問題

- `tests/run.py` 的 `build_bundle()` 讀不到來源檔時會噴 Python traceback
  而非乾淨錯誤訊息。不影響正確性，留給最終 review 分流。
- `tests/index.html` 未經真實瀏覽器實測（環境無瀏覽器）。它是人工備援管道，
  主要驗收管道 `run.py` 已充分實測。待 Task 0.2 起有 http.server 時順帶確認。

---

## 待決事項

- 個別元素的圖像掛鉤風格，等 Task 4.1 的 1A 七組給學生試用後再決定要不要調整。
  確認風格後才派 Haiku 依關卡分批補其餘六關（屬於 Plan 2）。
- GitHub repo 尚未建立，remote 未設定。Task 4.2 時需要使用者提供網址。
- 配色主題目前是中性預設值。設計文件 §8.2 刻意不硬寫「官方應援色」，
  實際色值等設定畫面（Plan 2）做好後由學生自己挑。

---

## Plan 2 範圍（尚未撰寫）

遊戲層（連段、應援值、賽末點、SVG 視覺）、其餘六關的圖像掛鉤內容、
設定畫面與自訂圖片、圖鑑收藏。
