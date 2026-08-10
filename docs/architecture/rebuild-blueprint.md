---
type: snapshot
status: current
issue: 1
---

# 施工圖 — 嚮導第二代

> Snapshot 文件：出生即史料。這裡寫的是動工當下的計畫，不是現況依據。
> 架構決策見 [ADR 0001](adr/0001-clean-architecture-mvvm-mvc.md)，決策紀錄見 [PRD](../prd/rebuild.md)。

## 一、目錄配置

```
src/
  domain/                純規則，零 I/O。前後端都 import。
    card.ts              Card / Capability / CardId
    check.ts             Check / CheckStatus / VerificationLevel
    progress.ts          ProgressState / isComplete / canAdvance / sectionState
    catalog.ts           哪些 check 組成哪張卡（取代前一代 5 張特例表）

  usecase/               編排。只依賴 domain 與 port 介面。
    check-environment.ts
    check-configs.ts
    install-step.ts
    verify-step.ts
    run-command.ts
    ports.ts             FileSystem / ProcessRunner / PlatformProbe / Clock

  adapter/
    server/              後端
      http.ts            node:http 啟動與路由表
      controllers/       每條路由一支，只做轉接
      fs.ts              FileSystem port 實作
      spawn.ts           ProcessRunner port 實作（含開終端視窗）
      probe/             PlatformProbe 實作（macOS / Windows 分檔）
    web/                 前端
      store.ts           唯一可變狀態 + dispatch
      reducer.ts         純函式，state × event → state
      viewmodel/         純函式：state → 畫面該長什麼樣
      view/              Preact 元件，只吃 props
      effects/           副作用：HTTP、SSE、複製、開視窗
      api.ts             HTTP client

materials/               教材（從前一代搬入，不改內容）
test/
docs/
```

**依賴方向**：`adapter → usecase → domain`。`domain` 誰都不 import。由 import graph 檢查強制。

## 二、Domain 介面草圖

```ts
// card.ts
type Capability =
  | { kind: "install"; action: string }
  | { kind: "verify"; via: "auto" | "terminal"; action: string; options?: RunOptions }
  | { kind: "merge"; action: string }
  | { kind: "eye-check"; id: string; prompt: string }
  | { kind: "recheck" };

interface Card {
  id: CardId;
  sectionId: SectionId;
  label: string;
  agent: "claude" | "codex" | "shared" | "other";
  logo: string;
  checks: Check[];              // 一張卡可含多個 check（前一代的「合併卡」）
  capabilities: Capability[];   // 取代 kind 分岐
}
```

```ts
// check.ts —— 三層驗證沿用前一代 wizard-verification-design.md
type VerificationLevel = "structure" | "behavior" | "eye";

type CheckStatus =
  | "missing"       // 檔案或註冊缺了
  | "unverified"    // 結構齊全，行為未驗 ← 關鍵的第三態
  | "ok"            // 驗過生效
  | "failed";       // 驗過但沒過
```

```ts
// progress.ts —— 唯一真理
interface ProgressState {
  checks: ReadonlyMap<CheckId, CheckStatus>;
  verified: ReadonlySet<CheckId>;        // 程式驗過
  eyeChecked: ReadonlySet<string>;       // 學生勾過
  attempted: ReadonlySet<CheckId>;       // 驗證嘗試過（不論成敗）
  failed: ReadonlySet<CheckId>;
  visited: ReadonlySet<CardId>;          // 去過的卡
  skipped: ReadonlySet<CardId>;          // 用逆口走掉的卡
}

function isComplete(card: Card, state: ProgressState): boolean;
function canAdvance(card: Card, state: ProgressState): boolean;
function cardDisplayState(card: Card, state: ProgressState):
  "untouched" | "visited-incomplete" | "complete" | "failed";
```

⚠️ `isComplete` **不接受任何「位置」參數**。前一代里程碑的 `index <= currentIndex` 就是從這裡漏進來的第二條判定路徑。

## 三、後端 Controller 對照（前一代 11 條路由）

| 路由 | Controller | 呼叫的 use case |
|---|---|---|
| `GET /` | `StaticController` | — |
| `GET /env` | `EnvController.check` | `checkEnvironment` |
| `GET /configs` | `ConfigController.check` | `checkConfigs` |
| `GET /walkthroughs` | `WalkthroughController.list` | `listWalkthroughs` |
| `GET /verify-shot` | `WalkthroughController.shot` | `getVerifyShot` |
| `GET /state` | `StateController.load` | `loadProgress` |
| `POST /state` | `StateController.save` | `saveProgress` |
| `POST /run` | `RunController.start` | `runCommand` |
| `POST /input` | `RunController.input` | `sendInput` |
| `POST /cancel` | `RunController.cancel` | `cancelRun` |
| `GET /stream` | `StreamController` (SSE) | `subscribeRunEvents` |

每支 Controller 的行數上限訂在 **40 行**。超過表示邏輯漏進來了。

## 四、實作階段

每個階段都要能獨立驗證，做完才進下一步。

### Phase 0 — 迴歸知識分流（風險最高，先做）

前一代 `test/frontend-layers.mjs` 的 1338 行斷言逐條分流成三類：

| 類別 | 去哪 | 例 |
|---|---|---|
| 純邏輯 | domain / viewmodel 單元測試 | 「驗證失敗不算跑過，不放行下一張」 |
| 只能守原始碼 | 保留 regex 檢查 | lottie 幀號 `MASCOT_SEGMENTS`、CSS `position: fixed` |
| 已被新架構結構性排除 | 刪除並記錄理由 | 「改 state 排在重畫前」——本代畫面是推導結果 |

**驗證**：分流清單逐條有歸屬，第三類每條都寫明「為什麼新架構下不可能發生」。沒寫明的一律歸第一類。

### Phase 1 — Domain

`card.ts` / `check.ts` / `progress.ts` / `catalog.ts` + 單元測試。零 I/O，可完全離線測。

**驗證**：`isComplete` / `canAdvance` 的測試涵蓋 6 套現有卡片行為；catalog 產出的卡片組合與前一代 `flattenCheckCards` 逐張比對。

### Phase 2 — Use case + Port 介面

Port 用假實作測，不碰真檔案系統。

**驗證**：每個 use case 有一條 happy path 與一條失敗路徑的測試；失敗路徑必須驗「失敗有被記錄」（前一代教訓：失敗不蓋戳會無限重試）。

### Phase 3 — 後端 adapter

Controller + FS + spawn + probe。平台探測邏輯從前一代 `env-check.js` / `config-check.js`（共 85KB）搬移——**這是搬移不是重寫**，那裡面是實測換來的平台細節。

**驗證**：11 條路由的回應與前一代逐條比對（同一台機器、同樣狀態，回應等價）。

### Phase 4 — 前端 store + ViewModel

純函式層先做完，可在 Node 裡完整測試，不需要瀏覽器。

**驗證**：餵一組 state 進去，ViewModel 產出的畫面模型與預期逐欄比對；三態顯示的轉換有測試。

### Phase 5 — 前端 View（Preact）

元件只吃 props。動畫（小人四段、鎖頭三態、進度條上那隻貓、解鎖特效）沿用前一代已驗證的行為與幀號。

**驗證**：Playwright 走完一段完整流程；動畫幀號的 regex 檢查（Phase 0 第二類）通過。

### Phase 6 — 發佈鏈

npm 套件 + public bootstrap repo + GitHub Actions 綁 tag 自動 publish。

**驗證**：全新 VM 從學生會打的那一行走到分頁標題變成命名（沿用前一代 `docs/fresh-vm-acceptance.md`）。

## 五、待解問題（進 BDD Analysis 前要答）

| # | 問題 | 卡住哪個 Phase |
|---|---|---|
| Q1 | 進度百分比怎麼算（已完成卡數 / 總卡數？） | Phase 4 |
| Q2 | capabilities 粒度——5 種夠不夠表達 6 套行為 | Phase 1 |
| Q3 | Phase 0 的分流清單怎麼產（人工逐條？先自動歸類再人工覆核？） | Phase 0 |
| Q4 | bootstrap repo 名稱與 npm 套件名 | Phase 6 |
