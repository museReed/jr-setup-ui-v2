---
type: design
status: current
issue: 1
---

# ADR 0001 — Clean Architecture 骨架，前端 MVVM、後端 MVC

## 脈絡

前一代前端已經是 MVVM（`model` / `viewmodel` / `view` 三層，且有測試守箭頭方向），那一層是有效的。壞掉的是接線層：`app.js` 2525 行同時擔任狀態容器、ViewModel 組裝、時序協調與副作用發動者。

同時，後端 `server.js` 的 route handler 直接夾雜檢查邏輯，前後端各自實作一次「什麼叫做這一步完成了」——這正是 7 條不一致能長出來的土壤。

## 決策

### 1. 三層骨架，前後端共用同一個 domain

```
                    ┌─────────────────────────────┐
                    │          domain             │  純規則，零 I/O，零框架
                    │  Card / Check / Capability  │  誰都不依賴
                    │  isComplete / canAdvance    │
                    └──────────────▲──────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │          usecase            │  編排：檢查環境、安裝、驗證
                    │  只依賴 domain + port 介面   │
                    └──────────────▲──────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              │                 adapter                 │
              │  BE: Controller / FS / spawn / probe    │
              │  FE: Preact View / HTTP client / store  │
              └─────────────────────────────────────────┘
```

**依賴只能往內。** domain 不知道 HTTP、不知道 DOM、不知道檔案系統。

domain 是**一份程式碼，前後端都 import**。後端用它判定 check 結果，前端用它判定畫面狀態——同一個 `isComplete()`，不會有兩種答案。這是解決 7 條不一致的結構性手段，不是紀律問題。

### 2. 卡片的行為用能力宣告表達

```ts
type Capability =
  | { kind: "install"; action: string }
  | { kind: "verify"; via: "auto" | "terminal"; action: string }
  | { kind: "merge"; action: string }
  | { kind: "eye-check"; prompt: string }
  | { kind: "recheck" };
```

UI 讀能力決定畫什麼，**不得**出現「這張卡是什麼種類」的比較。前一代 17 處 `card.kind ===` 因此歸零。

### 3. 完成判定收斂成一個函式

```ts
function isComplete(card: Card, state: ProgressState): boolean
function canAdvance(card: Card, state: ProgressState): boolean
```

`isComplete` 是唯一真理，徽章／清單／里程碑／分頁解鎖／段落狀態全部經過它。`canAdvance` 獨立存在，只回答「能不能翻下一張」。

進度條的三態（未到過 / 去過但未完成 / 已完成）由這兩個函式加上「去過」的紀錄推導，不再有第三條判定路徑。

### 4. 前端 MVVM：單一 store，畫面完全推導

```
  store（唯一可變狀態）
    │  dispatch(event)
    ▼
  reducer（純函式，在 domain 之上）
    │
    ▼
  ViewModel（純函式：state → 畫面該長什麼樣）
    │
    ▼
  View（Preact 元件，只吃 props）
```

**沒有手動 render 呼叫。** 前一代有一條寫在註解與 regex 測試裡的時序契約——「改 state 的排在重畫前，寫 log 的排在重畫後」——那一類 bug 在本架構下不存在：畫面是 state 的推導結果，不是一連串按順序執行的指令。

副作用（發請求、開終端、寫 log）走 effect，由 state 變化觸發，不由呼叫順序保證。

### 5. 後端 MVC：Controller 只做 HTTP 轉接

```
  node:http  →  Router  →  Controller  →  UseCase  →  domain
                                            │
                                            ▼
                                        Port 介面
                                            │
                              ┌─────────────┴─────────────┐
                              │  FS / spawn / 平台探測     │
                              └───────────────────────────┘
```

Controller 的職責上限：解析請求、呼叫一個 use case、把結果轉成 HTTP 回應。**不得**包含檢查邏輯、不得直接碰檔案系統。

不引入 HTTP 框架。這是要在學生乾淨機器上跑的套件，每個 transitive dependency 都是一個會在別人機器上壞掉的地方。

### 6. 依賴規則用 import graph 檢查，不用 regex 掃原始碼

前一代 `test/frontend-layers.mjs` 用 regex 掃原始碼守分層。它有效，但把架構凍住了——任何重構都會撞爛幾十條斷言。

本代改用**真正的 import graph 分析**（`dependency-cruiser` 或等價的自寫檢查）：宣告「`domain` 不得 import 任何層」「`view` 不得 import `api`」等規則，由工具驗證。重構不會誤傷，規則本身也讀得懂。

⚠️ **但迴歸知識不能跟著丟。** 前一代那 1338 行裡有大量 VM 實測換來的行為約束（動畫幀號、CSS 定位、時序陷阱）。它們必須逐條分流：能升級成純函式單測的升級，只能守原始碼的（CSS、lottie 幀號）留在原始碼層。這是本次重寫**風險最高的一項工作**，見施工圖的 Phase 0。

## 被否決的方案

| 方案 | 為什麼否決 | 重開條件 |
|---|---|---|
| **前後端各自一份 domain**（用型別定義對齊，不共用程式碼） | 那正是現況——前後端各自實作「完成」的判定，7 條不一致就是這麼來的。型別對齊不保證邏輯對齊。 | 若共用 domain 導致 bundle 顯著變大或後端啟動變慢，改成共用邏輯、分別打包。 |
| **前端用 Redux / Zustand 等現成 store** | 需求是「單一 state + 純推導」，自寫 reducer 約 100 行就夠；引入狀態庫換不到對應價值，卻多一個學生端依賴。 | 若 state 分片、時間旅行除錯等需求真的出現，重新評估。 |
| **保留 `kind` + 每種 kind 一個 policy 模組** | 現在 4 種 config 卡只差一兩個行為，policy 模組會大量重複。 | 若 capabilities 表達不了差異（宣告項膨脹超過 8 種仍要 if），改回 policy 模組。 |
| **後端引入 Express / Fastify** | 學生端多裝 transitive deps；SSE 與 spawn 終端的既有實作要重接。 | 若自寫 Controller 基礎設施超過 300 行。 |
| **繼續用 regex 掃原始碼守分層** | 凍結架構，重構誤傷率高。 | 不重開。但 regex 仍保留給「只能從原始碼守」的那類約束（CSS、動畫幀號）。 |
| **domain 用 class 建模（DDD entity）** | 這些規則是純計算，沒有識別碼與生命週期需求。class 只會增加序列化與跨層傳遞的摩擦。 | 若卡片開始需要自己的持久化生命週期。 |

## 後果

**得到**：
- 「完成」只有一個答案，前後端一致，靜態檢查守得住
- 新增一種卡片＝加一筆能力宣告，不用回頭改任何 orchestrator
- 時序 bug 整類消失（畫面是推導結果，不是執行順序）
- 分層規則從 regex 升級成 import graph，重構不再誤傷

**付出**：
- TypeScript + Vite 的 build step——學生端多一份 bundle，發佈流程要改
- 1338 行迴歸知識的人工搬移，漏搬＝重踩實測踩過的坑
- domain 共用要求前後端同一個 TS 專案，工具鏈耦合度上升
- 進度條可能出現跳躍式亮點（D2 的已知代價）
