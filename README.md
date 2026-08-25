# 元素週期表大挑戰（Periodic Quest）

幫台灣國中生背熟化學元素週期表的離線網頁 App。

**線上版：** https://mcdull419-tw.github.io/periodic-quest/

按**族**（直行）記口訣、Leitner 五盒間隔複習、隨機測驗、依學習狀況解鎖關卡。
無帳號、無後端、無追蹤，所有學習進度只存在使用者自己的裝置裡。

## 給使用者

用 iPhone 的 Safari 開上面的網址 → **分享** → **加入主畫面**，
之後從主畫面開啟就是全螢幕的 App，離線也能用。

四個分頁：

| 分頁 | 做什麼 |
|---|---|
| 首頁 | 今天有幾張卡要複習、目前解鎖到第幾關、各關進度 |
| 週期表 | 118 個元素全部可查（不受關卡限制），可切換顯示注音 |
| 測驗 | 依 Leitner 排程出題，**只有這裡會寫入學習進度** |
| 複習 | 只考今天到期的卡 |

從週期表選一個主族 → 「學這一族」可以進入逐字教學，走完會立刻小測一輪；
**教學階段的小測刻意不寫入進度**——剛看完答案就答對，不代表記得住。

## 開發

沒有 node、沒有建置步驟。純 ES modules + 原生 CSS。

```bash
python3 -m http.server 8000      # 本機預覽 http://localhost:8000
```

### 測試

測試跑在 macOS 內建的 `osascript -l JavaScript`（JXA）上，不需要安裝任何東西。
JXA 不支援 ES modules，所以 `tests/run.py` 會先用正規表示式移除 `import` / `export`
再把來源檔與測試檔串接起來執行。

```bash
python3 tests/make-data-fixture.py          # 把 data/*.json 轉成 JXA 讀得到的形式
for t in tests/*.test.js; do
  printf "%-24s " "$(basename $t)"
  python3 tests/run.py js/core/*.js js/components/*.js tests/.data.js "$t" | tail -1
done
```

`js/core/` 與 `js/components/` 的檔案不得在頂層碰 DOM——這是測試能在 JXA 下執行的前提。
`js/ui/` 沒有自動化測試，改為在瀏覽器裡人工驗收；
`tests/preview-table.html` 與 `tests/preview-scenes.html` 是給人看的驗收頁，
前者內含 19 項跑在真實瀏覽器 DOM 上的檢查（格數、座標、捲動、互動、注音直排…）。

### 資料檔

| 檔案 | 內容 | 守門機制 |
|---|---|---|
| `data/elements.json` | 118 個元素的原子序、符號、中文名、注音、週期、族、分類、原子量、常溫狀態 | `tests/data.test.js` 有 118 筆中文名與 118 筆注音的對照表鎖定現狀 |
| `data/mnemonics-groups.json` | 八族口訣、逐字對應的元素、場景與場景串接 | 44 個主族元素與 `elements.json` 交叉比對 |
| `data/mnemonics-elements.json` | 個別元素的圖像掛鉤（目前只有 1A 七個） | `validateElementMnemonics` 檢查 hook 字數、重複、對得上元素 |
| `data/stages.json` | 七個關卡與解鎖門檻 | 元素不得跨關卡重複 |

改動任何一筆中文名或注音都會被守門測試擋下。若確實要修正，請連同對照表一起更新，
並在 commit 訊息說明依據。

## 素材來源與授權

### 口訣

八族口訣文字出自 **@酪梨寶** 的元素表口訣圖。本專案：

- **採用**口訣文字本身與場景概念（佳如、被雷劈的蓋斯、飛機、楊柳溪、鱷魚、乃亞克）。
  短的事實性記憶句，且已由使用者提供採用。
- **未使用**原圖的插畫。`js/components/scene-art.js` 的八張場景圖是本專案依相同場景
  概念自行以 SVG 繪製的。
- `assets/chant-scenes.jpg` 是使用者另行以 AI 生成的手繪風插畫，經使用者確認後採用；
  該圖原本附帶的口訣表格因含有錯字（鈣的符號誤植為 Cs、矽誤植為砂、砷誤植為身）
  已裁除，App 內顯示的所有文字一律來自 `data/mnemonics-groups.json`。

在此向 @酪梨寶 致謝。

### 元素中文名

118 個元素的台灣慣用中文名與注音，核對來源為兩份資料：

- **《中學生眼中的化學元素週期表》**（社團法人中國化學會，2023 年 6 月初版）
- **LiFe 生活化學** 的化學元素週期表（CC BY-NC-ND 3.0）

該授權為「禁止商業使用、禁止修改」。本專案**未嵌入、未裁切、未改作**任何一張原圖，
僅使用其中的客觀事實資料（元素符號、原子序、中文名、注音）進行核對——客觀事實不受
著作權保護。`js/components/periodic-table.js` 的互動式週期表完全以 HTML/CSS Grid
自行實作。

在此向兩份資料的作者致謝。

### 其他

- 不使用任何第三方函式庫、CDN、字型服務或追蹤程式碼。整個 App 不對外連任何一個網域。
- 排球主題僅使用運動的通用術語，不使用任何受版權保護的作品名稱、角色或圖像。

## 隱私

沒有帳號、沒有伺服器、沒有分析工具。學習進度存在瀏覽器的 localStorage，
只留在使用者自己的裝置上，不上傳也不外傳。清除瀏覽器資料就會一併清除。

## 專案文件

- 設計文件：`docs/superpowers/specs/2026-08-23-periodic-quest-design.md`
- 實作計畫：`docs/superpowers/plans/2026-08-23-periodic-quest-core.md`
- 進度與執行期裁決：`docs/PROGRESS.md`（接手前先讀這份）
