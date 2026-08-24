# Periodic Quest 進度

**最後更新：** 2026-08-24
**目前位置：** 分支 `main`。**Phase 3 全部完成，17/19。**
只剩 Phase 4 的兩個：4.1（1A 七個元素的圖像掛鉤，Opus 親自寫）與
4.2 的說明文件部分（部署已提前完成）。

（先前寫「/18」是原始計數少算一個，Phase 0–4 合計是 19 個 task。）

**部署已提前：** GitHub repo 為 `mcdull419-tw/periodic-quest`，Task 4.2 的
GitHub Pages 部分提前到 Phase 3 進行中做，因為使用者不在家時需要能看畫面
驗收（本機 `localhost:8000` 只有 Mac 上開得起來，區網位址出了家門就沒用）。

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
- [x] 0.2 PWA 外殼與設計 token — Sonnet（`deacd53..110a8d3`）

### Phase 1：資料
> **執行順序已調整為 1.1 → 1.3 → 1.2 → 1.4**（見下方裁決 B）

- [x] 1.1 資料驗證測試 — Sonnet（`9b8755a..801ccf4`，13 tests）
- [x] 1.3 118 個元素資料 — Haiku 起草、Sonnet 修正（`62595cc..fc17fec`，23 tests）
- [x] 1.2 八族口訣資料 — Sonnet（`c62c29c..37fba4f`，6 tests；44 主族交叉比對通過）
- [x] 1.4 關卡資料 — Sonnet（`fb9ced3..bb59411`，5 tests）

### Phase 2：核心邏輯
- [x] 2.1 狀態儲存與 schema 遷移 — Sonnet（`2b82a7f..c84329e`，12 tests）
- [x] 2.2 Leitner 複習排程 — Sonnet（`4070dbd..120ce63`，17 tests）
- [x] 2.3 出題來源與抽題權重 — Sonnet（`8c957f2..1dba854`，7 tests）
- [x] 2.4 干擾選項 — Sonnet（`687a93c..8363c61`，6 tests）
- [x] 2.5 題目生成與判分 — Sonnet 實作、Opus 複審修正（`691a8ab`..`302d53d`，16 tests）
- [x] 2.6 進度與關卡解鎖 — Opus（`d572a88`，16 tests；串真實 fixture 時 18）

### Phase 3：最小可用介面
- [x] 3.1 互動式週期表元件 — Opus（`944bc90`，瀏覽器內 19 項檢查）
- [x] 3.2 週期表查詢畫面 — Opus（`acd7969`..`e63d575`）
- [+] 3.2b 118 個元素的注音 — Opus（`acd7969`、`3f0674f` 改直寫）
- [x] 3.3 記憶法教學畫面 — Opus（`3ded090`）
- [x] 3.4 測驗畫面 — Opus（`78d981b`）
- [x] 3.5 首頁、複習入口與導覽 — Opus

**Phase 3 全部由主 session 自己做，沒有派 sub-agent。** 原因是這個
session 的設定為「未經使用者要求不主動派 agent」。使用者知道後的指示是：
**之後以 token 使用量為優先判準決定派工**——脈絡淺、格式固定、彼此獨立
的工作（例如 Plan 2 的圖像掛鉤文案）派給 sub-agent；依賴大量當前對話
才有的約定的工作自己做。

### Phase 4：上線
- [ ] 4.1 階段 1 的個別元素圖像掛鉤 — **Opus（主 session 親自寫）**
- [ ] 4.2 部署與說明文件 — Sonnet

---

## 下一步

**Task 4.1：階段 1 的個別元素圖像掛鉤**（計畫指定由 Opus 主 session 親自寫）

1A 的七個元素（氫 1、鋰 3、鈉 11、鉀 19、銣 37、銫 55、鍅 87），
spec §11.4「先驗證再量產」——這七組是之後派給 sub-agent 批次生產其餘
六關的範本，風格必須立住。寫完要讓學生實際試用再決定要不要調整
（見〈待決事項〉）。

之後是 Task 4.2 的說明文件部分（部署已完成）。

### Phase 3 的實機驗收踩過的坑（Phase 4 與 Plan 2 都會再遇到）

- **`--safe-bottom` 只在 iPhone 上現形。** `#app` 的下方留白一度漏算
  安全區域，最後一列被底部導覽列蓋掉；Mac 上 `--safe-bottom` 是 0，
  完全看不出來。**版面問題不能只在桌機驗。**
- **快取有兩層，只修一層沒用。** 先是 SW 的 cache-first 讓使用者看到舊版，
  改成 network-first；但問題沒解決——`fetch()` 預設會吃**瀏覽器自己的
  HTTP 快取**，而 GitHub Pages 送 `max-age=600`，SW 以為去了網路，拿回來
  的還是十分鐘內的舊檔。最後在 SW 用 `cache: "no-cache"` 重建請求強制
  向伺服器驗證才真正解決。
  **診斷方法**（下次再遇到直接用）：在頁面主控台比對兩種抓法——
  `fetch(url, {cache:'no-store'})` 與一般 `fetch(url)`，內容不同就是
  HTTP 快取在作祟，跟 SW 無關。清 CacheStorage 和 unregister 都救不了。
- **驗收前務必確認瀏覽器跑的是哪一版。** 我曾對著舊模組驗證新修正，
  得出「修了沒用」的錯誤結論。最快的乾淨環境是本機
  `python3 -m http.server 8080 --bind 127.0.0.1`——不送 max-age，
  也沒有 SW 註冊。
- **重畫會把捲動位置歸零。** 週期表任何狀態改變都整張重建，捲動容器
  一起被砍掉。現在會保留捲動比例（不是像素——切注音會改變內容寬度）。
- **往外畫的 outline 會被容器裁掉。** 選取光環改成往內畫。

### 瀏覽器自動化（2026-08-24 起可用）

`claude-in-chrome` 擴充功能已連線，Claude 可以自己開頁面、點按鈕、
執行頁面內 JavaScript、讀 console。驗收方式因此改變：

- **能自動驗的都自動驗。** 用 `javascript_tool` 寫驅動腳本連續作答，
  一次跑 6～8 題（CDP 的 `Runtime.evaluate` 上限 45 秒，跑太多會逾時），
  分批呼叫。
- **派 Haiku sub-agent 跑機械掃描很划算**：大量截圖與 DOM 輸出留在它的
  context，不佔主 session。但**它的回報要當觀察不是診斷**——實測它正確
  發現「連續 16 題考同一元素」，卻把成因歸給「題庫生成邏輯缺陷」，
  真正的原因是 Leitner 的到期規則在單輪內的副作用。
- **判斷性的問題還是要人看**：版面順序、字級、對國中生好不好懂。

### Phase 3 的驗收怎麼做（已與使用者確認）

`js/ui/` 不寫自動化測試，改為使用者自己在瀏覽器看。這台機器沒有可操作的
瀏覽器（`claude-in-chrome` 未連線），Claude 不能自己驗收，**不得把未經
人眼確認的東西寫成「已驗收」**。

能自動驗的部分要盡量自動驗：`tests/preview-table.html` 的做法是在頁面裡
放一組跑在真實瀏覽器 DOM 上的檢查（格數、座標、尺寸、捲動、互動、
class 狀態），列出 PASS/FAIL，剩下顏色與美感才交給人眼。新畫面照這個
模式做。

**本機伺服器踩過的坑：** 使用者的 Mac 上 `localhost:8000` 開不起來
（curl 從 IPv4／IPv6 都通、無 proxy，所以是瀏覽器端問題，推測是 https
自動升級或舊的 Service Worker），`127.0.0.1:8080` 是繞過用的乾淨來源。
最終解法是走 GitHub Pages，見下。

### Phase 2 留給 Phase 3 的約束

1. 呼叫 `buildDistractors` 時傳入的 `allElements` **必須限縮到已解鎖關卡**，
   否則氦的干擾項會抽到 Og（118 號超重元素）。用
   `availableElements(stages, unlockedStages)` 取範圍。
2. `buildPools` 的三個池**聯集不等於** `availableZ`——已學過、不到期、
   弱項排名在 `weakLimit` 之外的卡三池都不會出現。不可假設等於全部。
3. `buildDistractors` 對 `target` 為 `null` **沒有防呆**，呼叫端要保證合法。
4. `makeQuestion` 回傳 `null` 是正常的控制流，不是錯誤：過渡金屬沒有口訣
   （chant-blank）、沒有主族（group-id），只解鎖一個族時 group-id 也沒有
   干擾項可用。UI 一律走 `nextQuestion`（它會自動換題型重試），不要自己
   挑題型呼叫 `makeQuestion` 然後假設一定拿得到題目。
5. 首頁的「再讓 N 個元素進入第 3 盒」直接用 `summarize` 的
   `byStage[i].required - byStage[i].mastered`，不要自己重算 ceil 公式。
6. `unlockedStages` 有兩個來源：`state.unlockedStages`（存起來的）與
   `computeUnlockedStages(cards, stages)`（算出來的）。以算出來的為準，
   存的那份只當快取——兩者不一致時（例如改過 stages 資料）要以計算結果
   覆寫並存回。這件事還沒有人做，Task 3.5 接手時要處理。

### 部署（Task 4.2 的一部分，提前做）

- Repo：`https://github.com/mcdull419-tw/periodic-quest`（public）
- Pages 網址：`https://mcdull419-tw.github.io/periodic-quest/`
- `manifest.json` 的 `start_url` 與 `scope` 都是 `./`，`index.html`、
  `sw.js`、`js/data/load.js` 也全用相對路徑，所以部署在子目錄不必改。
- `sw.js` **一律走 network-first**（逾時 3 秒退回快取）。原本是 cache-first、
  只在 localhost 例外，結果實際踩坑：部署上去後使用者的瀏覽器照樣顯示舊版，
  因為 `css/components.css` 在預先快取清單裡，早就被凍住了。當時 PROGRESS
  寫著「每次改 CORE_ASSETS 都要把 CACHE_VERSION 加一」——第一次就忘了。
  **靠人記住的規則不算機制**，所以改成策略本身就不會過期。離線仍可用
  （退回快取），代價只是連線時多一趟往返，整個 App 一百多 KB，划算。
- 這台機器沒有 gh CLI、沒有 Homebrew、沒有 SSH 金鑰。使用者已經手動推過
  一次，PAT 存進了 osxkeychain，**之後 Claude 可以直接 `git push`**
  （已實測成功），不必再請使用者複製貼上。若哪天 token 過期會出現
  認證失敗，那時才需要請使用者重新產一組。
- 工作區固定留在 `main`。之前在 `feat/plan-1-core` 與 `main` 之間切換，
  結果請使用者跑不帶參數的 `git push` 時推到沒有上游的分支而失敗。
  分支留著當歷史，但日常工作與部署都在 main。

### 測試指令有變

`js/core/quiz.js` 已拆成 `quiz.js`（池與權重）+ `question.js`（題目生成與判分），
所以測試要多帶一個來源檔：

```
python3 tests/run.py js/core/scheduler.js js/core/quiz.js js/core/question.js tests/quiz-question.test.js
```

Phase 1 已全部完成，資料層就緒。`data/` 底下三個檔（elements、mnemonics-groups、
stages）皆通過驗證，且三層守護機制都經「故意改錯」實驗確認會失敗：
118 筆中文名對照表、中文名重複檢查、44 筆口訣交叉比對。

目前測試總數：`data` 25、`groups` 6、`stages` 5、`store` 12、`scheduler` 17、
`quiz-pool` 7、`quiz-distractor` 6、`quiz-question` 20、`progress` 18、
`zhuyin` 6。合計 **122**（帶 fixture 全串起來跑的數字）。
另有 `tests/preview-table.html` 的 19 項瀏覽器內檢查，不在這個數字裡。

一次跑完全部（`js/core/*.js` 串在一起不會撞名，已驗證）：

```bash
python3 tests/make-data-fixture.py
for t in tests/*.test.js; do printf "%-32s " "$t"; python3 tests/run.py js/core/*.js js/components/*.js tests/.data.js "$t" | tail -1; done
```

`js/components/*.js` 也要串進去：`zhuyin.js` 的 `splitZhuyin` 有測試。
那個目錄的檔案可以碰 DOM，但都只在函式內碰，頂層純粹是宣告，所以
在 JXA 下串接不會爆。

`progress.test.js` 末尾兩條測試會偵測 `STAGES` 是否存在：帶 fixture 跑
（上面這個迴圈）是 18 條，照計畫的單獨指令跑是 16 條。

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
- **Task 2.5 複審裁決**：`makeGroupId` 在干擾項掛零時回傳 `null`。門檻取
  「至少一個干擾項」（兩個選項）而非湊滿三個——後者會讓 group-id 直到
  解鎖四個族才出得來。
- **Task 2.6 裁決**：計畫的介面清單外多匯出 `unlockRequirement(stage)`；
  `isStageUnlocked` 檢查「前面每一關」而非只看前一關；`unlockRatio`
  缺漏或非法時退回 0.8。理由見 `d572a88` 的 commit 訊息。
- **Task 3.1 裁決**：計畫的檔案清單外，另外動了 `css/tokens.css`（新增十個
  分類色 token，brief 要求「色值全部取自 tokens.css」但那些 token 原本不存在）、
  `index.html`／`sw.js`（掛上新 CSS），並新增 `tests/preview-table.html`
  ——Task 3.1 只產出元件，App 裡還沒有畫面掛載它，沒有這頁就沒有東西可驗收。
- **Task 3.2 裁決**：新增 `css/screens.css` 供 Phase 3 五個畫面共用；
  `sw.js` 在 localhost／私有網段改走 network-first；週期表元件的
  「整族高亮」與「選取單一格」拆成兩種視覺（is-highlight／is-selected）。
- **計畫外追加：注音**（使用者要求）。資料來源與判讀方式見下方〈資料正確性
  的守護機制〉。UI 上詳細面板必顯示，格子則由「顯示注音」開關控制，
  狀態存在 `settings.showZhuyin`。
- **Task 3.3 裁決**：週期表畫面的口訣區加「學這一族」按鈕。brief 沒要求，
  但沒有它就只能手打 `#learn?group=1A`，手機上驗收很痛苦。
- **Task 3.4 裁決**：`js/ui/quiz-runner.js` 提前到 3.4 建立（計畫排在 3.5）。
  測驗與複習的作答體驗完全相同，先在 screen-quiz.js 寫一份再搬過去
  等於白做。
- **Task 3.5 裁決**：`question.js` 拆出 `questionForZ` 與 `scopeToUnlocked`。
  複習畫面要「只從到期卡出題」——它自己決定考哪個 z，但限縮範圍與
  換題型重試的規則必須與測驗完全一致。留在 `nextQuestion` 裡的話，
  UI 層得自己重寫一份，兩邊遲早走鐘。
- **Task 0.2 裁決**：`js/main.js` 的路由除了 brief 要求的 `#name` 形式，
  額外支援 `#name?key=value` 查詢參數解析（`navigate(name, params)` /
  `registerScreen(name, (container, params) => void)`）。這是 Task 3.3
  教學畫面會需要的能力（例如 `#learn?group=1A`），brief 沒提但先做起來，
  之後 Task 3.3 不必回頭改路由介面。

## 資料正確性的守護機制（動 data/elements.json 前必讀）

`tests/data.test.js` 有一份 **118 筆的中文名對照表**，鎖定了經參考圖檔逐字
核對過的狀態。任何改動元素中文名的行為都會被它擋下。若確實需要修正某個字，
請連同對照表一起更新，並在 commit 訊息說明依據。

`validateElements` 另有**中文名重複檢查**——這條不需要知道正確答案就能抓出
一整類抄錯（例如兩個原子序被填成同一個字）。

**原本的爭議已結案：** z=61 Pm 是否為「鉕」的疑問，由 `reference/` 那本
《中學生眼中的化學元素週期表》第 76 頁的 PDF 文字層直接證實——該頁寫著
「鉕」、注音 ㄆㄛˇ，機器可讀，不是放大猜的。維持「鉕」。

### 注音的來源與可信度（動 zhuyin 欄位前必讀）

`tests/data.test.js` 另有一份 **118 筆的注音對照表**，同樣鎖定現狀。
資料來源與中文名是同一本書，但取得方式分兩種，對照表裡逐筆註明：

- **65 筆**由 PDF 文字層直接帶出音節與聲調，可信度最高。
- **53 筆**的聲調符號完全不在文字層裡（字型子集沒有 ToUnicode 對照，
  整頁掃不到任何 ˊˇˋ˙），是把該頁算繪成 PNG 後用眼睛判讀的。判讀前先用
  六個文字層已知聲調的元素校準符號長相（ˊ 右上撇、ˋ 右下點、ˇ 打勾）。
- 上述 53 筆裡有 **5 筆**讀音與一般認知不同，另外拿使用者提供的一張
  注音週期表交叉比對，兩來源一致才寫入：
  **氬 ㄧㄚˇ、鈷 ㄍㄨ、鎝 ㄊㄚˇ、鈀 ㄅㄚ、鏑 ㄉㄧ**
  （直覺會以為是 ㄧㄚˋ／ㄍㄨˇ／ㄊㄚˋ／ㄅㄚˇ／ㄉㄧˊ）。
  兩本台灣出版品都這樣印，以來源為準。**若學生的課本印法不同，
  這五格是最該優先覆核的。**

一聲不標符號，是台灣標準寫法，不是漏標。`validateElements` 另有
「必須是單一注音音節」的格式檢查（元素中文名都是單字，兩個音節必定是抄錯）。

## 已知的待處理小問題

- `apple-touch-icon` 只提供 SVG 沒有 PNG 備援。iOS 17 之前的 Safari 不支援
  SVG 作為主畫面圖示，會退回用頁面截圖。現今裝置多已 iOS 17+，影響機率低。
- `validateStages` 不檢查 `unlockRatio` 的型別與範圍，也不檢查 `groups` 是否
  為合法族碼。有人手改 `data/stages.json` 填入負數或亂寫族碼不會被擋。
  （`progress.js` 已自保：非法 `unlockRatio` 退回 0.8，不會讓學生卡關。
  但族碼亂寫仍然沒人擋。）
- `store.js` 的 `migrate` 對「`cards` 是陣列而非物件」不修正也不報錯，
  `getCard` 會安靜回傳 `null`。只可能來自手動竄改 localStorage。
- `scheduler.js` 的 `weakCards(cards, limit)` 當 `limit` 為負數時，`slice(0, limit)`
  會從尾端砍掉 `|limit|` 張而非回傳空陣列，安靜地回傳「幾乎全部」。
- `tests/index.html` 與 `index.html`（PWA 外殼）都**只驗證到「用
  `python3 -m http.server` 開，所有檔案都能以正確 HTTP 200／Content-Type
  回應」**，尚未在真實瀏覽器裡實際渲染過（環境無可操作的瀏覽器——機器上有
  Safari／Chrome，但 `claude-in-chrome` 擴充功能未連線）。Service Worker
  的 `activated` 狀態、底部導覽點擊、`tests/index.html` 跑出 PASS/FAIL 綠字，
  都只是依規格推論應該正確，沒有人眼見過。詳細驗證分級見
  `.superpowers/sdd/2026-08-23-periodic-quest-core/task-0.2-report.md`。
  下一次有瀏覽器可用時，應優先補做這兩個檔案的真人驗證。

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
