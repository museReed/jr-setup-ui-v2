---
type: design
status: current
issue: 1
---

# PRD — 嚮導第二代：卡片能力化與完成判準單一真理

> 這是決策紀錄，不是需求清單。驗收條件的正本在 `docs/features/*/bdd/*.feature`，本文不複述散文 AC。

## 一、要解決的問題

學生在嚮導上看到的狀態互相矛盾。

同一張卡，右上徽章寫「未完成」，進度條上那一站卻已經亮了；分頁解鎖了但徽章沒變；卡內清單寫 2/2 卻沒有任何按鈕可按。學生無法從畫面判斷自己現在到底該做什麼——而這正是嚮導唯一的職責。

### 根因

前一代的卡片是個沒有行為的資料袋。行為寫在 `public/app.js`（2525 行）的 `renderWizard()`（568 行）裡，用 `card.kind ===` 分岔 **17 處**，外加 5 張 id-keyed 特例表。`kind` 只有 3 個值，實際行為卻有 6 套。

於是「這張卡完成了嗎」這個問題，在 5 個顯示位置長出 4 種答案：

| 顯示位置 | 實際判法 |
|---|---|
| 右上徽章 | `cardIsComplete()` |
| 進度條里程碑 | `cardIsComplete()` **或** `nextUnlocked` **或**（`verificationAttempted && installedSteps`），再加 `index <= currentIndex` |
| 分頁解鎖 | `incompleteCards() → cardIsComplete()`，無 index 限制 |
| 卡內清單 N/M | 逐列各自算，不呼叫 `cardIsComplete()` |
| 段落狀態文字 | 與里程碑共用 `cardsDone` |

前一代 `docs/audit-card-logic.md` §四 共列出 7 條不一致。它們不是各自獨立的 bug，是同一個結構問題的重複發作。

## 二、成功長什麼樣

| 指標 | 現況 | 目標 | 怎麼量 |
|---|---|---|---|
| 「完成」的判定路徑數 | 4 | **1** | 全 codebase 只有一個函式回答這個問題；靜態測試守住（任何顯示位置都必須經過它） |
| 卡片行為的 `kind` 分岔 | 17 處 | **0** | UI 層不得出現 `kind === ` 比較；靜態測試守住 |
| 一輪全新 VM 驗收的矛盾狀態回報 | 每輪都有（前一代五個斷點全在「每一列都是綠燈」下發生） | **0** | `docs/fresh-vm-acceptance.md` 走完，紀錄矛盾狀態次數 |
| 新增一種卡片所需改動的檔案數 | ≥ 4（`renderWizard` + 特例表 + view + 測試） | **1**（能力宣告） | 用一張新卡實測 |

## 三、決策

### D1 — 卡片宣告能力，UI 只讀能力

每張卡宣告 `capabilities`：`canInstall` / `canVerify` / `canMerge` / `needsEyeCheck` / `canRecheck`。UI 依能力決定畫什麼按鈕，不再問這張卡是什麼種類。

**為什麼**：現在 4 種 config 卡（規則檔／內建 skill／第三方 skill／demo）彼此只差一兩個行為，卻各自在 `renderWizard()` 裡有分支。能力宣告讓差異變成刻意宣告的一行，而不是散在條件式裡的遺漏。

### D2 — `isComplete()` 是唯一真理

徽章、清單、里程碑、分頁解鎖、段落狀態，全部讀同一個 `isComplete(card, state)`。里程碑現有的 `index <= currentIndex` 額外限制拿掉。

**已知代價**：進度條可能出現「跳躍式亮點」——後面的卡先完成時，前面未完成的站不亮，視覺上不再單調遞增。接受這個代價，理由是「畫面說的是真相」優先於「畫面看起來順」。進度百分比改成「已完成卡數 / 總卡數」，不看位置。

### D3 — `canAdvance` 與 `isComplete` 分開

「可以翻下一張」（驗證嘗試過即可，不把學生鎖死）與「這張完成了」（驗證真的過了）是兩個概念，分開命名、分開判定。

進度條因此有**三態**：未到過 / 去過但未完成 / 已完成。

**為什麼不合併**：前一代實測顯示驗證會因環境因素失敗，全靠逆口走的話學生會把逃生口當正常流程；但若完全鎖死，課堂上沒人救得了。分開命名讓兩件事都能誠實表達。

### D4 — 失敗逆口所有卡種一致

任何卡驗證失敗 → 鎖住「下一張」，同時給一顆**不慶祝**的「先跳過這張」。跳過登記在 `skippedCards`，不算完成，徽章與進度條照樣顯示失敗。

**為什麼**：前一代只有 config 卡有逆口，env 卡驗證失敗就死路。學生不該需要知道自己卡在哪一種卡上才知道有沒有救。

**已知風險**：env 卡（CLI 沒裝成、沒登入）跳過之後，後面整段都會倒。逆口的文案必須點名這一點，不能只寫「先跳過」。

### D5 — Clean Architecture 骨架，前端 MVVM、後端 MVC

`domain ← use case ← adapter`，依賴只能往內。前端呈現層 MVVM（View / ViewModel / Model），後端呈現層是 MVC 的 Controller（route handler 只做 HTTP 轉接）。

**為什麼**：前一代的前端已經是 MVVM 且有測試守箭頭方向，那一層是有效的；壞掉的是接線層越權。Clean Architecture 讓「卡片與驗證的規則」成為前後端共用的 domain，而不是各自實作一次。

### D6 — 前端 TypeScript + Vite + Preact

**已知代價**（明確接受）：
- 學生端多一份 bundle，npm 套件變大
- 發佈流程要改（build 產物要進套件）
- 前一代 `test/frontend-layers.mjs` 那 1338 行迴歸知識**必須人工搬移**——那是 VM 實測換來的，漏搬就是把踩過的坑重踩一次

### D7 — 後端維持 `node:http`

不引入 Express / Fastify。Controller 分層自己寫。

**為什麼**：這是要在學生乾淨機器上跑的 npm 套件，每個 transitive dependency 都是一個會在別人機器上壞掉的地方。Clean Architecture 的收益（邏輯與傳輸解耦）不需要框架就拿得到。

### D8 — repo 與發佈

| 項目 | 決定 |
|---|---|
| 主 repo | `jr-setup-ui-v2`，private |
| bootstrap | 另開 public repo，只放 `setup.sh` / `setup.ps1` |
| 程式碼發佈 | public npm 套件 |
| `materials/` | 搬進本 repo，前一代凍結 |

**關鍵限制**：學生機器上還沒有 Node（bootstrap 的第一件事就是裝它），所以 `npx` 不能當入口，第一行指令必須是公開的 `curl | bash`。npm 只取代「下載嚮導程式碼」那一段。

## 四、Non-Goals

- **不重新設計三層驗證（結構／行為／眼睛）**。前一代 `docs/wizard-verification-design.md` 那套是四個實測斷點換來的，沿用不動。
- **不改教材內容**（`materials/` 的 CLAUDE.md、output-style、skill）。只搬家，不改字。
- **不做多人／後台**。仍然是學生本機跑的單人工具。
- **不追求視覺重新設計**。動畫、小人、貓、鎖頭三態沿用前一代已驗證的行為。
- **不在本輪處理前一代 issue #10**（materials 同步腳本蓋回上游修正）——搬進新 repo 後那個跨 repo 同步機制消失，問題自動不存在。

## 五、Counterfactual — 否決了什麼

| 否決的方案 | 證據 | 什麼情況下該重開 |
|---|---|---|
| **只重構 `app.js`，不重寫** | 分層本身是對的（model/viewmodel/view + 測試守箭頭），但 `test/frontend-layers.mjs` 1338 行 regex 掃原始碼的斷言把架構凍住——任何重構都會撞爛幾十條。重構的成本不低於重寫，而且結果仍受舊結構約束。 | 若搬移迴歸知識的實際成本遠超預期（> 全部工作量一半），退回「只重寫前端」。 |
| **只重寫前端，後端保留** | 後端仍是 route handler 夾雜邏輯，domain 概念前後端對不齊——D5 只做得到一半。 | 若 `env-check.js` / `config-check.js`（共 85KB 平台細節）的重寫風險被證實過高，改成「後端只抽 Controller 層，check 邏輯原樣搬」。 |
| **照抄現況行為（parity）** | 把 7 條不一致原封不動搬進新架構，重寫最大的理由就沒了。 | 不重開。若要保守，正確做法是逐條標記「刻意保留」而非整批照抄。 |
| **保留 `kind` + 每種 kind 一個 policy 模組** | 現在 4 種 config 卡只差一兩個行為，policy 模組會大量重複。 | 若 capabilities 的粒度被證實拉不對（宣告項超過 8 個仍表達不了差異），改回 policy 模組。 |
| **後端換 Fastify / Express** | 學生端多裝 transitive deps；SSE 與 spawn 終端那些既有實作要重接。 | 若自寫的 Controller 基礎設施（路由、驗證、錯誤處理）超過 300 行，重新評估。 |
| **前端維持免 build（vanilla ESM + JSDoc）** | 我原本推薦這條（學生端零風險）。Reed 判斷型別保護與宣告式 view 的收益更高。 | 若 bundle 在學生機器上出現實際問題（載入失敗、體積、CSP），退回免 build。 |
| **打包成單一執行檔（Node SEA / pkg）** | 前一代 `go-private-checklist.md` 已否決：程式碼藏不住（`strings` 就看得到），代價是四平台各編一份、50–100MB、沒簽章會被 SmartScreen / Gatekeeper 擋。 | 不重開。 |
| **私有 npm（`--access restricted`）** | 同上文件：要付費 org，每個學生都要 npm 帳號 + `npm login`，開課先花二十分鐘，換來的保護正好是保護不了的那部分。 | 不重開。 |

## 六、開放問題

| # | 問題 | 卡住誰 | 何時要答 |
|---|---|---|---|
| Q1 | 進度百分比在 D2 之後怎麼算才不會讓學生誤解（已完成卡數 / 總卡數，還是別的） | 前端 ViewModel | BDD Analysis 前 |
| Q2 | capabilities 的粒度——5 項夠不夠表達 6 套現有行為，還是需要參數化（如 `canVerify: "terminal" \| "auto"`） | domain 設計 | Tech Design 施工圖階段 |
| Q3 | 迴歸知識搬移的清單怎麼產：1338 行斷言裡哪些升級成純函式單測、哪些必須留在原始碼層（CSS、動畫幀號） | 測試策略 | TDD Design 前 |
| Q4 | bootstrap public repo 叫什麼、npm 套件名是否沿用 `jr-setup-ui` 還是跟 repo 一致 | 發佈流程 | 第一次要給學生跑之前 |
