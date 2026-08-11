# 舊版 task card 盤點

本文件盤點 `/Users/reed/Projects/jr-setup-ui` 目前實際會畫出的卡與 checklist 格。清單取兩種工具都選取、`darwin` 與 `win32` 取聯集；平台或工具條件另在 §2 說明。

## 1. 段 → 卡 → 格總表

「有安裝動作」只計真正的 install action，不把登入、修復、合併或「開終端驗證」算成安裝。「有驗證題」包含 `verify-behavior` 與 `verify-in-terminal` 的題目；「有教學」以 `content/walkthroughs/<格 id>.json` 是否存在為準。

| 段 | 卡 | 格 id | 顯示文字 | 誰判定 | 判定實作在哪 | 有安裝動作 | 有驗證題 | 有教學 |
|---|---|---|---|---|---|:---:|:---:|:---:|
| env | 換上課堂用的終端機 | `system-ghostty` | Ghostty 終端機 | 結構探測 | `src/env-check.js:354-365` | ✅ |  |  |
| env | Windows 先準備好 | `system-execution-policy` | PowerShell 執行原則 | 結構探測 | `src/env-check.js:324-352` |  |  |  |
| env | Windows 先準備好 | `system-windows-terminal` | 終端機是 Windows Terminal | 結構探測 | `src/env-check.js:367-390` | ✅ |  |  |
| env | Windows 先準備好 | `system-powershell-version` | PowerShell 版本 | 結構探測 | `src/env-check.js:392-426` |  |  |  |
| env | Windows 先準備好 | `system-powershell-encoding` | PowerShell 中文編碼 | 結構探測 | `src/env-check.js:428-470` |  |  |  |
| env | Claude Code | `system-claude` | 程式檢查：Claude Code CLI | 結構探測 | `src/env-check.js:472-505,690-694` | ✅ |  |  |
| env | Claude Code | `system-claude-auth` | 程式檢查：Claude Code 登入狀態 | 結構探測 | `src/env-check.js:568-604` |  |  |  |
| env | Claude Code | `fullscreen-yes` | 跳出方框時按 1. Yes, try it | 人眼勾選 | `public/model.js:84-90`；`CASES.fullscreen-open` |  | ✅ | ✅ |
| env | Claude Code | `fullscreen-mouse` | 打一句話，用滑鼠點那句話中間 | 人眼勾選 | `public/model.js:91-97`；`CASES.fullscreen-open` |  | ✅ | ✅ |
| env | Claude Code | `fullscreen-copy` | 圈選代碼那一行，貼進下面的欄位 | 副產物比對 | `public/model.js:59-66,98-103`；`CASES.fullscreen-proof` |  | ✅ | ✅ |
| env | Codex CLI | `system-codex` | Codex CLI | 結構探測 | `src/env-check.js:472-505,697-700` | ✅ |  |  |
| env | Codex CLI | `system-codex-auth` | Codex 登入狀態 | 結構探測 | `src/env-check.js:606-641` |  |  |  |
| env | 版本控制與 GitHub | `system-git` | Git | 結構探測 | `src/env-check.js:472-505,684-685` | ✅ |  |  |
| env | 版本控制與 GitHub | `system-gh` | GitHub CLI | 結構探測 | `src/env-check.js:472-505,685` | ✅ |  |  |
| env | 版本控制與 GitHub | `system-gh-auth` | GitHub 登入狀態 | 結構探測 | `src/env-check.js:643-677` |  |  |  |
| env | Python 與 Node.js | `system-node` | Node.js | 結構探測 | `src/env-check.js:472-505,686` |  |  |  |
| env | Python 與 Node.js | `system-python` | Python 3 | 結構探測 | `src/env-check.js:519-539` | ✅ |  |  |
| env | 終端機裡的 claude / codex 是活的 | `system-shell-wrapper` | 終端機裡的 claude / codex 是活的 | 結構探測 | `src/env-check.js:543-566` |  |  |  |
| rules | 分頁自己報上名字 | `install-tab-sync` | 安裝：分頁自己報上名字 | 結構探測 | `src/config-check.js:711-750` | ✅ |  |  |
| rules | 分頁自己報上名字 | `system-tab-sync` | 驗證：分頁自己報上名字 | 行為驗證 | `CASES.title` |  | ✅ |  |
| rules | 分頁自己報上名字 | `eye-tab-sync` | 你要看的：那個視窗的分頁標題變成「🔍 標題同步測試」 | 人眼勾選 | `src/config-check.js:355-359`；`CASES.title` |  | ✅ | ✅ |
| rules | Claude Code CLI 做事的規矩與回話風格 | `system-claude-md` | Claude Code CLI 做事的規矩 | 結構探測 | `src/config-check.js:187-225` | ✅ |  |  |
| rules | Claude Code CLI 做事的規矩與回話風格 | `install-output-style` | 安裝：回話短、結論先講 | 結構探測 | `src/config-check.js:544-568` | ✅ |  |  |
| rules | Claude Code CLI 做事的規矩與回話風格 | `system-output-style` | 驗證：回話短、結論先講 | 行為驗證 | `scripts/verify-behavior.mjs:37-99,177-242` |  | ✅ |  |
| rules | 它什麼時候該停下來問你 | `install-hook` | 安裝：一次只跑一個指令 | 結構探測 | `src/config-check.js:570-657` | ✅ |  |  |
| rules | 它什麼時候該停下來問你 | `system-hook` | 驗證：一次只跑一個指令 | 副產物比對 | `CASES.chained` |  | ✅ |  |
| rules | 它什麼時候該停下來問你 | `install-allowlist` | 安裝：常用指令不用每次問你 | 結構探測 | `src/config-check.js:659-709` | ✅ |  |  |
| rules | 它什麼時候該停下來問你 | `system-allowlist` | 驗證：常用指令不用每次問你 | 副產物比對 | `CASES.allowlist` |  | ✅ |  |
| rules | 輸入框下面那條狀態列 | `install-claude-hud` | 安裝：輸入框下面那條狀態列 | 結構探測 | `src/config-check.js:922-966` | ✅ |  |  |
| rules | 輸入框下面那條狀態列 | `system-claude-hud` | 驗證：輸入框下面那條狀態列 | 行為驗證 | `CASES.statusline` |  | ✅ |  |
| rules | 輸入框下面那條狀態列 | `eye-claude-hud` | 你要看的：輸入框下面多出一行，裡面有模型名、一條進度條、專案名 | 人眼勾選 | `src/config-check.js:349-354`；`CASES.statusline` |  | ✅ | ✅ |
| rules | 對話自己取名字 | `install-claude-namer` | 安裝：對話自己取名字 | 結構探測 | `src/config-check.js:752-813` | ✅ |  |  |
| rules | 對話自己取名字 | `system-claude-namer` | 驗證：對話自己取名字 | 副產物比對 | `CASES.naming`（Claude） |  | ✅ |  |
| rules | 對話自己取名字 | `eye-claude-namer` | 你要看的：那個視窗的分頁標題變成「{emoji} 中文敘述」 | 人眼勾選 | `src/config-check.js:360-367`；`CASES.naming` |  | ✅ | ✅ |
| rules | 快記不住前面時提醒你 | `install-claude-monitor` | 安裝：快記不住前面時提醒你 | 結構探測 | `src/config-check.js:752-813` | ✅ |  |  |
| rules | 快記不住前面時提醒你 | `system-claude-monitor` | 驗證：快記不住前面時提醒你 | 副產物比對 | `CASES.context`（Claude） |  | ✅ |  |
| rules | Codex CLI 做事的規矩與回話風格 | `system-codex-agents` | 程式檢查：Codex CLI 做事的規矩 | 結構探測 | `src/config-check.js:187-225` | ✅ |  |  |
| rules | Codex CLI 做事的規矩與回話風格 | `install-codex-config` | 安裝：Codex CLI 的規矩與回話風格 | 結構探測 | `src/config-check.js:187-225` | ✅ |  |  |
| rules | Codex CLI 做事的規矩與回話風格 | `system-codex-config` | 驗證：Codex CLI 的規矩與回話風格 | 行為驗證 | `scripts/verify-behavior.mjs:37-99,177-242` |  | ✅ |  |
| rules | Codex CLI 做事的規矩與回話風格 | `eye-codex-config` | 你要看的：Codex 視窗最下面那一條有四段：用掉多少、哪個模型、哪個資料夾、這週還剩多少 | 人眼勾選 | `src/config-check.js:297-303`；`CASES.statusline` |  | ✅ | ✅ |
| rules | Codex 對話自己取名字 | `install-codex-namer` | 安裝：Codex 對話自己取名字 | 結構探測 | `src/config-check.js:752-813` | ✅ |  |  |
| rules | Codex 對話自己取名字 | `system-codex-namer` | 驗證：Codex 對話自己取名字 | 行為驗證 | `CASES.naming`（Codex；`expect: null`） |  | ✅ |  |
| rules | Codex 對話自己取名字 | `eye-codex-namer` | 你要看的：那個視窗的分頁標題變成命名（第一次會問你要不要信任 hook，要接受） | 人眼勾選 | `src/config-check.js:369-372`；`CASES.naming` |  | ✅ | ✅ |
| rules | Codex 快記不住前面時提醒你 | `install-codex-monitor` | 安裝：Codex 快記不住前面時提醒你 | 結構探測 | `src/config-check.js:752-813` | ✅ |  |  |
| rules | Codex 快記不住前面時提醒你 | `system-codex-monitor` | 驗證：Codex 快記不住前面時提醒你 | 副產物比對 | `CASES.context`（Codex） |  | ✅ |  |
| skills | auto-rename（Claude） | `install-skill-claude-auto-rename` | 安裝：auto-rename（Claude） | 結構探測 | `src/config-check.js:818-863` | ✅ |  |  |
| skills | auto-rename（Claude） | `system-skill-claude-auto-rename` | 驗證：auto-rename（Claude） | 副產物比對 | `CASES.skill-rename`（Claude） |  | ✅ |  |
| skills | auto-rename（Claude） | `eye-skill-claude-auto-rename` | 你要看的：那個視窗的分頁標題變成「{emoji} 中文敘述」 | 人眼勾選 | `src/config-check.js:393-397`；`CASES.skill-rename` |  | ✅ | ✅ |
| skills | handoff（Claude） | `install-skill-claude-handoff` | 安裝：handoff（Claude） | 結構探測 | `src/config-check.js:818-863` | ✅ |  |  |
| skills | handoff（Claude） | `system-skill-claude-handoff` | 驗證：handoff（Claude） | 副產物比對 | `CASES.skill-handoff`（Claude） |  | ✅ |  |
| skills | handoff（Claude） | `eye-skill-claude-handoff` | 你要看的：那個視窗的分頁標題最後變成「📦 ...」 | 人眼勾選 | `src/config-check.js:402-407`；`CASES.skill-handoff` |  | ✅ | ✅ |
| skills | structured-questions（Claude） | `install-skill-claude-structured-questions` | 安裝：structured-questions（Claude） | 結構探測 | `src/config-check.js:818-863` | ✅ |  |  |
| skills | structured-questions（Claude） | `system-skill-claude-structured-questions` | 驗證：structured-questions（Claude） | 行為驗證 | `CASES.skill-questions`（Claude；`expect: null`） |  | ✅ |  |
| skills | structured-questions（Claude） | `eye-skill-claude-structured-questions` | 你要看的：那個視窗裡跳出一組選項讓你選（不是用文字把選項寫出來） | 人眼勾選 | `src/config-check.js:427-430`；`CASES.skill-questions` |  | ✅ | ✅ |
| skills | frontend-design（Claude） | `system-ext-frontend-design-claude` | frontend-design（Claude） | 結構探測 | `src/config-check.js:866-887` | ✅ |  |  |
| skills | skill-creator（Claude） | `system-ext-skill-creator-claude` | skill-creator（Claude） | 結構探測 | `src/config-check.js:866-887` | ✅ |  |  |
| skills | playwright（Claude） | `install-ext-playwright-claude` | 安裝：playwright（Claude） | 結構探測 | `src/config-check.js:866-887` | ✅ |  |  |
| skills | playwright（Claude） | `system-ext-playwright-claude` | 驗證：playwright（Claude） | 副產物比對 | `CASES.mcp-playwright`（Claude） |  | ✅ |  |
| skills | auto-rename（Codex） | `install-skill-codex-auto-rename` | 安裝：auto-rename（Codex） | 結構探測 | `src/config-check.js:818-863` | ✅ |  |  |
| skills | auto-rename（Codex） | `system-skill-codex-auto-rename` | 驗證：auto-rename（Codex） | 行為驗證 | `CASES.skill-rename`（Codex；`expect: null`） |  | ✅ |  |
| skills | auto-rename（Codex） | `eye-skill-codex-auto-rename` | 你要看的：那個視窗的分頁標題變成「{emoji} 中文敘述」 | 人眼勾選 | `src/config-check.js:398-401`；`CASES.skill-rename` |  | ✅ | ✅ |
| skills | handoff（Codex） | `install-skill-codex-handoff` | 安裝：handoff（Codex） | 結構探測 | `src/config-check.js:818-863` | ✅ |  |  |
| skills | handoff（Codex） | `system-skill-codex-handoff` | 驗證：handoff（Codex） | 副產物比對 | `CASES.skill-handoff`（Codex） |  | ✅ |  |
| skills | handoff（Codex） | `eye-skill-codex-handoff` | 你要看的：那個視窗的分頁標題最後變成「📦 ...」 | 人眼勾選 | `src/config-check.js:408-411`；`CASES.skill-handoff` |  | ✅ | ✅ |
| skills | structured-questions（Codex） | `install-skill-codex-structured-questions` | 安裝：structured-questions（Codex） | 結構探測 | `src/config-check.js:818-863` | ✅ |  |  |
| skills | structured-questions（Codex） | `system-skill-codex-structured-questions` | 驗證：structured-questions（Codex） | 行為驗證 | `CASES.skill-questions`（Codex；`expect: null`） |  | ✅ |  |
| skills | structured-questions（Codex） | `eye-skill-codex-structured-questions` | 你要看的：那個視窗裡跳出一組選項讓你選（不是用文字把選項寫出來） | 人眼勾選 | `src/config-check.js:431-434`；`CASES.skill-questions` |  | ✅ | ✅ |
| skills | frontend-design（Codex） | `system-ext-frontend-design-codex` | frontend-design（Codex） | 結構探測 | `src/config-check.js:866-887` | ✅ |  |  |
| skills | playwright（Codex） | `install-ext-playwright-codex` | 安裝：playwright（Codex） | 結構探測 | `src/config-check.js:866-887` | ✅ |  |  |
| skills | playwright（Codex） | `system-ext-playwright-codex` | 驗證：playwright（Codex） | 副產物比對 | `CASES.mcp-playwright`（Codex） |  | ✅ |  |
| demo | 把前面學的串起來跑一次（Claude） | `install-demo-claude` | 安裝：把前面學的串起來跑一次（Claude） | 結構探測 | `src/config-check.js:1092-1100` |  |  |  |
| demo | 把前面學的串起來跑一次（Claude） | `system-demo-claude` | 驗證：把前面學的串起來跑一次（Claude） | 副產物比對 | `CASES.demo`（Claude） |  | ✅ |  |
| demo | 把前面學的串起來跑一次（Claude） | `eye-demo-claude` | 你要看的：左邊逐字打 code、右邊即時長出你剛才選的那個網頁 | 人眼勾選 | `src/config-check.js:419-422`；`CASES.demo` |  | ✅ | ✅ |
| demo | 把前面學的串起來跑一次（Codex） | `install-demo-codex` | 安裝：把前面學的串起來跑一次（Codex） | 結構探測 | `src/config-check.js:1092-1100` |  |  |  |
| demo | 把前面學的串起來跑一次（Codex） | `system-demo-codex` | 驗證：把前面學的串起來跑一次（Codex） | 副產物比對 | `CASES.demo`（Codex） |  | ✅ |  |
| demo | 把前面學的串起來跑一次（Codex） | `eye-demo-codex` | 你要看的：左邊逐字打 code、右邊即時長出你剛才選的那個網頁 | 人眼勾選 | `src/config-check.js:423-426`；`CASES.demo` |  | ✅ | ✅ |
| notes | Obsidian | `system-obsidian` | Obsidian | 結構探測 | `src/config-check.js:1007-1016` | ✅ |  |  |
| notes | vault-sync（Claude） | `system-skill-claude-vault-sync` | vault-sync（Claude） | 結構探測 | `src/config-check.js:818-863` | ✅ |  |  |
| notes | vault-sync（Codex） | `system-skill-codex-vault-sync` | vault-sync（Codex） | 結構探測 | `src/config-check.js:818-863` | ✅ |  |  |
| notes | 接到 GitHub 的筆記庫 | `install-obsidian-vault` | 安裝：接到 GitHub 的筆記庫 | 結構探測 | `src/config-check.js:1024-1087` | ✅ |  |  |
| notes | 接到 GitHub 的筆記庫 | `system-obsidian-vault` | 驗證：接到 GitHub 的筆記庫 | 行為驗證 | `CASES.open-vault`（`expect: null`） |  | ✅ |  |
| notes | 接到 GitHub 的筆記庫 | `eye-obsidian-vault` | 你要看的：Obsidian 左邊最下面多一個分岔圖示，右下角有一個打勾 | 人眼勾選 | `src/config-check.js:343-348`；`CASES.open-vault` |  | ✅ | ✅ |
| notes | 叫 AI 寫一篇進去（Claude） | `install-vault-agent-claude` | 安裝：叫 AI 寫一篇進去（Claude） | 結構探測 | `src/config-check.js:970-978` |  |  |  |
| notes | 叫 AI 寫一篇進去（Claude） | `system-vault-agent-claude` | 驗證：叫 AI 寫一篇進去（Claude） | 行為驗證 | `CASES.vault-note`（Claude；`expect: null`） |  | ✅ |  |
| notes | 叫 AI 寫一篇進去（Claude） | `eye-vault-agent-claude` | 你要看的：GitHub 的改動歷史上，最上面那一行是你剛才選的那句話 | 人眼勾選 | `src/config-check.js:333-338`；`CASES.vault-note` |  | ✅ | ✅ |
| notes | 叫 AI 寫一篇進去（Codex） | `install-vault-agent-codex` | 安裝：叫 AI 寫一篇進去（Codex） | 結構探測 | `src/config-check.js:970-978` |  |  |  |
| notes | 叫 AI 寫一篇進去（Codex） | `system-vault-agent-codex` | 驗證：叫 AI 寫一篇進去（Codex） | 行為驗證 | `CASES.vault-note`（Codex；`expect: null`） |  | ✅ |  |
| notes | 叫 AI 寫一篇進去（Codex） | `eye-vault-agent-codex` | 你要看的：GitHub 的改動歷史上，最上面那一行是你剛才選的那句話 | 人眼勾選 | `src/config-check.js:339-342`；`CASES.vault-note` |  | ✅ | ✅ |

### 卡片分組推斷依據

`flattenCheckCards` 先把 `ENV_CARD_META.checkIds` 合成環境卡，再把 `groupChecks` 依 `CARD_DEFINITIONS` 分組的設定項交給 `mergeCardChecks`；因此同一個 `checkIds` 或 `MERGE_ORDER` 陣列裡的 checks，就是畫在同一張卡上的格（`public/model.js:380-456,524-600,731-806,829-900`）。`renderWizard` 每次只取 `cardSection.cards[currentIndex]`，再把該卡 `checks`、`eyeCheck` 與 `sectionManualItems` 一起交給 `checklistGroups` 畫成格，確認上述資料分組就是畫面卡片邊界（`public/app.js:332-869`；`public/viewmodel.js:552-614,852-981`）。

`env-config`（「選工具 + 選語言」）確實是 `flattenCheckCards` 固定插入的第一張卡，但 `checks: []` 且 `showChecklist: false`，所以它計入卡數、不虛構 checklist 格，也不計入總表列數（`public/model.js:854-869`；`public/app.js:652`）。

### 呈現補充

- `fullscreen-copy` 是唯一有貼回輸入框的格，貼文須精確比對 `fullscreen-copy-ok-7f3a91`（`public/view.js:549-574`；`public/app.js:722-735`）。
- 19 個有教學的格，正好對應 `content/walkthroughs/` 下 19 個同名 JSON；它們都是 `eye-*` 或 `fullscreen-*` 格。
- `system-ext-playwright-claude` 與 `system-ext-playwright-codex` 驗證成功後會在卡片層顯示截圖；這是 `PLAYWRIGHT_SHOT_AGENTS` 與 `verifyShot`，不是 walkthrough（`public/model.js:106-111`；`public/app.js:610-618`）。
- Claude、Codex 與 GitHub 登入列會另外顯示登入控制與授權連結；那是 row action，不是新增 checklist 格（`public/view.js:831-887`；`public/viewmodel.js:1002-1035`）。

## 2. 平台差異

### 只在單一平台出現的格

| 平台 | 卡 | 格 |
|---|---|---|
| `darwin` | 換上課堂用的終端機 | `system-ghostty` |
| `win32` | Windows 先準備好 | `system-execution-policy`、`system-windows-terminal`、`system-powershell-version`、`system-powershell-encoding` |

來源是 `checksForPlatform`（`src/env-check.js:60-88`）。兩個平台其餘環境格相同；工具選擇仍會把未選工具的 `claude` / `claude-auth` 或 `codex` / `codex-auth` 整組移除（`src/env-check.js:38-55`）。

### 同一格但實作不同

| 格／功能 | `darwin` | `win32` | 出處 |
|---|---|---|---|
| `system-claude` 安裝 | `bash -c`：`curl -fsSL https://claude.ai/install.sh \| bash`，再把 `~/.local/bin` 補進 `.zshrc` | `powershell.exe -NoProfile -Command`：`irm https://claude.ai/install.ps1 \| iex`，再把 `%USERPROFILE%\.local\bin` 寫進使用者 PATH | `src/installers.js:13-26,38-75,103-113` |
| `system-codex` 安裝 | `bash -c`：`curl -fsSL https://chatgpt.com/codex/install.sh \| sh`，安裝器自己寫 `~/.zprofile`；另設 `CODEX_NON_INTERACTIVE=1` | `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command`：`irm https://chatgpt.com/codex/install.ps1 \| iex`；安裝器自己寫 User PATH；另設同一環境變數 | `src/installers.js:13-15,28-31,38-46,114-142` |
| `system-python` 安裝／探測 | `brew install python`；探測 `python3 --version` | `winget install --id Python.Python.3.13 ... --silent`；依序探測 `py -3 --version`、`python --version` | `src/installers.js:144-174`；`src/env-check.js:507-539` |
| `system-git` 安裝 | `brew install git`，`NONINTERACTIVE=1` | `winget install --id Git.Git ... --silent` | `src/installers.js:175-198` |
| `system-gh` 安裝 | `brew install gh`，`NONINTERACTIVE=1` | `winget install --id GitHub.cli ... --silent` | `src/installers.js:199-220` |
| `install-tab-sync` | `ai-tab-sync.sh` 放 `~/.local/bin`，block 寫進 `.zshrc` | `ai-tab-sync.ps1` 放 `~/.jr-setup/bin`，block 寫進 PowerShell profile | `src/config-install.js:308-436,818-836` |
| `install-claude-namer`、`install-claude-monitor`、`install-codex-namer`、`install-codex-monitor` | hook 腳本副檔名 `.sh` | hook 腳本副檔名 `.ps1`；Claude naming 另有 Windows 包裝層 | `src/config-install.js:308-310,478-530` |
| `install-claude-hud` | statusline command template 是 `statusline.sh.template`，不另裝 script target | command template 是 `statusline.mjs.template`，另寫 `statusline.mjs` | `src/config-install.js:756-792` |
| `system-obsidian` 安裝 | 有 Homebrew 時用 cask；否則下載官方 DMG | 用 `winget`；執行檔會在多個 Squirrel / Program Files 候選根目錄搜尋 | `src/config-install.js:683-716`；`scripts/install-configs.mjs:508-589` |
| `install-obsidian-vault` | vault registry：`~/Library/Application Support/obsidian/obsidian.json` | vault registry：`~/AppData/Roaming/Obsidian/obsidian.json` | `src/config-install.js:732-753` |
| `system-demo-*` 題目 | 自走版用 `python3 .../self_play.py` | 自走版用 `py -3 .../self_play.py` | `scripts/verify-in-terminal.mjs:294-313` |
| 所有 `verify-in-terminal` 題 | 寫 `.command`，以 `#!/bin/zsh -i` 載入 wrapper，再用 `open` 開啟 | 寫 `.ps1`，以 Windows Terminal + PowerShell `-ExecutionPolicy Bypass` 開啟 | `scripts/verify-in-terminal.mjs:491-553` |
| `CASES.title` | watcher 接收 `tty`，靠 OSC 改分頁標題 | watcher 接收 PowerShell PID，以 `[Console]::Title` 改標題 | `scripts/verify-in-terminal.mjs:460-489` |
| `CASES.open-vault` | `open 'obsidian://open?vault=jr-workshop-vault'` | 優先直接啟動找到的 `Obsidian.exe`；找不到才退回 protocol URL | `scripts/verify-in-terminal.mjs:432-458` |

`ghostty` 沒有 `win32` installer；`windows-terminal` 沒有 `darwin` installer（`src/installers.js:221-244`）。`execution-policy`、PowerShell 版本與編碼不是可安裝套件：前者只有修復 action，後兩者只有探測與指引。

## 3. `verify-in-terminal` 驗證題全文附錄

來源：`scripts/verify-in-terminal.mjs:52-359`。表中的預設 timeout 是 `TIMEOUT_MS = 240_000`（4 分鐘）。`<resultFile>`、`<demoDir>` 與 `<verifyShotPath(agent)>` 是原始碼執行時才展開的絕對路徑；除此之外，下方 prompt 保留實際串接後的全文。凡 prompt 含 `<resultFile>`，`buildPrompt` 都會再逐字接上：`（那個檔案的資料夾已經存在，直接寫檔就好，不要先建立目錄。）`（`scripts/verify-in-terminal.mjs:607-622`）。

| case | label | expect 種類／關鍵字 | watchFor | 特殊 env | timeoutMs |
|---|---|---|---|---|---:|
| `naming` | 自動命名 | Claude：`session-name`；Codex：`null` | 分頁標題變成「{emoji} 中文敘述」，emoji 是規定的那 8 個之一 | `{}` | 240000 |
| `title` | 終端機標題同步 | `null` | 分頁標題變成「🔍 標題同步測試」，五秒後自己還原 | `{}` | 240000 |
| `vault-note` | 叫 AI 寫一篇筆記 | `null` | 它寫出一篇「測試筆記」，然後自己 commit 並推上去 | `{}` | 240000 |
| `open-vault` | 筆記庫 | `null` | Obsidian 打開你的筆記庫，左邊那排多一個同步圖示 | `{}` | 240000 |
| `statusline` | 底部狀態列 | `null` | 視窗最下面（輸入框下面）多出一條：模型、一條進度條、專案名，Codex 那邊還有額度 | `{}` | 240000 |
| `fullscreen-open` | 全螢幕模式 | `null` | 跳出「Try the new fullscreen renderer?」，按 1. Yes, try it | `{}` | 240000 |
| `fullscreen-proof` | 全螢幕模式 | `null` | 印出代碼那一行，用滑鼠圈選它，再貼回嚮導的欄位 | `{}` | 240000 |
| `allowlist` | 常用指令不用每次問你 | `artifact`；`allowlist-ok-9d4b71` | 三條指令與那次 WebFetch 都直接跑掉，沒有跳出任何「要不要允許」的詢問 | `{}` | 240000 |
| `chained` | Shell 不串接 | `artifact`；`一次只跑一個指令` | 畫面出現「一次只跑一個指令」的中文訊息，指令被擋下來 | `{}` | 240000 |
| `context` | Context 監控 | `artifact`；Claude：`Context 已用`；Codex：`[context-monitor]` | 畫面上出現 context 用量警告（標著「（測試模式）」） | Claude：`CONTEXT_MONITOR_TEST_WINDOW=30000`；Codex：`CODEX_TEST_MAX_CONTEXT_WINDOW=5000` | 240000 |
| `skill-rename` | Skill：自動命名 | Claude：`session-name`；Codex：`null` | 模型說它用了 auto-rename skill，分頁標題跟著變成「{emoji} 中文敘述」 | `{}` | 240000 |
| `skill-handoff` | Skill：交接文件 | `artifact`；`必讀檔案` | 模型產出一份有「狀態摘要 / 必讀檔案 / 下一步」的文件，收尾把分頁標題改成「📦 ...」 | `{}` | 240000 |
| `demo` | 一條龍 demo | `file`；`~/demo-page.html`（須為本輪新寫） | 跳出選項讓你選（網頁類型 / 主色調 / 風格 / 字體），回答完會生成網頁，最後逐字打 code 現場長出來 | `{}`；另有 `needsAnswer: true` | 1800000 |
| `mcp-playwright` | 第三方：Playwright | `file`；`verifyShotPath(agent)`（須為本輪新寫） | 跳出一個瀏覽器視窗、自己連到 Pinterest，畫面長出一整片圖 | `{}` | 900000 |
| `skill-questions` | Skill：結構化提問 | `null` | 畫面跳出一組可以上下選的選項（不是把選項寫成文字要你打字回答） | `{}` | 240000 |

### `naming`

Claude prompt：

```text
請照 hook 的指示把這個 session 命名，執行它給你的那條指令，然後用一句話告訴我你命名成什麼。
```

Codex prompt：

```text
請照 hook 的指示把這個 session 命名，執行它給你的那條指令。命名完之後，再列出目前資料夾裡的檔案——這一步是必要的，讓 hook 有機會把名字套用上去。最後把你取的名字寫進 <resultFile>。（那個檔案的資料夾已經存在，直接寫檔就好，不要先建立目錄。）
```

### `title`

Claude、Codex prompt 都是空字串；此 case 不啟動 agent，而是直接執行 `titleScript()`。

```text

```

### `vault-note`

Claude、Codex prompt 相同：

```text
請在我的筆記庫新增一篇叫「測試筆記」的筆記，內容隨便寫兩三句話，然後幫我把筆記存起來。存完告訴我你寫了什麼、commit 訊息是什麼。
```

### `open-vault`

Claude、Codex prompt 都是空字串；此 case 不啟動 agent，而是直接執行 `vaultScript()`。

```text

```

### `statusline`

Claude prompt：

```text
請用一句話跟我打招呼就好，不要做別的事
```

Codex prompt 是空字串；launcher 只執行 `codex`，不傳空 prompt。

```text

```

### `fullscreen-open`

Claude、Codex prompt 都是空字串；launcher 只啟動所選 agent。

```text

```

### `fullscreen-proof`

Claude、Codex prompt 相同：

```text
請原樣印出這一行，不要加任何說明：fullscreen-copy-ok-7f3a91
```

### `allowlist`

Claude、Codex prompt 相同：

```text
請依序做這四件事，一件都不要跳過：1) 執行 echo allowlist-ok-9d4b71　2) 執行 pwd　3) 執行 git status　4) 用 WebFetch 讀 https://raw.githubusercontent.com/museReed/jr-setup-ui/main/README.md。第 3 步跑出「不是 git 儲存庫」之類的錯誤也算跑過——這一題看的是有沒有被擋，不是成不成功。如果其中任何一步跳出要你允許的提示，不要按允許，把那一步的編號與提示原文寫進 <resultFile> 就停下來。四步全部都沒有跳提示的話，把 allowlist-ok-9d4b71 寫進 <resultFile>。（那個檔案的資料夾已經存在，直接寫檔就好，不要先建立目錄。）
```

### `chained`

Claude、Codex prompt 相同：

```text
請執行這條指令：echo a && echo b。不管成功或被擋，都把你收到的完整訊息一字不改寫進 <resultFile>。（那個檔案的資料夾已經存在，直接寫檔就好，不要先建立目錄。）
```

### `context`

Claude、Codex prompt 相同；只有 env 與 expect keyword 不同：

```text
請依序執行這三件事，每件之間簡短說一句話：列出目前資料夾、印出今天日期、印出目前路徑。如果過程中有 hook 提醒你 context 快用完、或要你寫交接文件，不要照做——把那段提醒的原文一字不改寫進 <resultFile> 就好。（那個檔案的資料夾已經存在，直接寫檔就好，不要先建立目錄。）
```

### `skill-rename`

Claude prompt：

```text
請使用 auto-rename skill 幫這個 session 命名，照它 SKILL.md 裡寫的指令執行。
```

Codex prompt：

```text
$auto-rename 請照這個 skill 的 SKILL.md 步驟幫這個 session 命名。命名完之後再列出目前資料夾裡的檔案——這一步是必要的，讓 hook 有機會把名字套用上去。最後把你取的名字寫進 <resultFile>。（那個檔案的資料夾已經存在，直接寫檔就好，不要先建立目錄。）
```

### `skill-handoff`

Claude prompt：

```text
請使用 handoff skill 產出這個 session 的交接文件。這一輪有兩件事要做完：（1）不要 commit、不要寫進 docs/，把整份文件內容寫進 <resultFile>，章節標題照 skill 規定的寫；（2）照 skill 最後一步把這個 session 改名，執行它給你的那條改名指令，不要跳過。（那個檔案的資料夾已經存在，直接寫檔就好，不要先建立目錄。）
```

Codex prompt：

```text
$handoff 請照這個 skill 產出這個 session 的交接文件。這一輪有兩件事要做完：（1）不要 commit、不要寫進 docs/，把整份文件內容寫進 <resultFile>，章節標題照 skill 規定的寫；（2）照 skill 最後一步把這個 session 改名，執行它給你的那條改名指令，不要跳過。改名完之後，再列出目前資料夾裡的檔案——這一步是必要的，讓 hook 有機會把名字套用上去。（那個檔案的資料夾已經存在，直接寫檔就好，不要先建立目錄。）
```

### `demo`

Claude / `darwin` prompt：

```text
請讀 <demoDir>/demo-prompt-claude.md，照裡面的步驟執行這條一條龍 demo。第 3 步不要用 prompt 裡寫的那支腳本（那是另一個 repo 的路徑，這台機器上沒有），改用這支自走版：python3 <demoDir>/live-preview-self/self_play.py ~/demo-page.html，它只用標準函式庫、不需要安裝任何東西，跑完把產出的檔案用瀏覽器打開就會自己演。第 1、2 步不要開瀏覽器、也不要用 Playwright 預覽或截圖——只有第 3 步最後那次才開，那一次是要給人看的。先執行第 1 步。
```

Claude / `win32` prompt：

```text
請讀 <demoDir>/demo-prompt-claude.md，照裡面的步驟執行這條一條龍 demo。第 3 步不要用 prompt 裡寫的那支腳本（那是另一個 repo 的路徑，這台機器上沒有），改用這支自走版：py -3 <demoDir>/live-preview-self/self_play.py ~/demo-page.html，它只用標準函式庫、不需要安裝任何東西，跑完把產出的檔案用瀏覽器打開就會自己演。第 1、2 步不要開瀏覽器、也不要用 Playwright 預覽或截圖——只有第 3 步最後那次才開，那一次是要給人看的。先執行第 1 步。
```

Codex / `darwin` prompt：

```text
$structured-questions 請讀 <demoDir>/demo-prompt-codex.md，照裡面的步驟執行這條一條龍 demo。第 3 步不要用 prompt 裡寫的那支腳本（那是另一個 repo 的路徑，這台機器上沒有），改用這支自走版：python3 <demoDir>/live-preview-self/self_play.py ~/demo-page.html，它只用標準函式庫、不需要安裝任何東西，跑完把產出的檔案用瀏覽器打開就會自己演。第 1、2 步不要開瀏覽器、也不要用 Playwright 預覽或截圖——只有第 3 步最後那次才開，那一次是要給人看的。先執行第 1 步。
```

Codex / `win32` prompt：

```text
$structured-questions 請讀 <demoDir>/demo-prompt-codex.md，照裡面的步驟執行這條一條龍 demo。第 3 步不要用 prompt 裡寫的那支腳本（那是另一個 repo 的路徑，這台機器上沒有），改用這支自走版：py -3 <demoDir>/live-preview-self/self_play.py ~/demo-page.html，它只用標準函式庫、不需要安裝任何東西，跑完把產出的檔案用瀏覽器打開就會自己演。第 1、2 步不要開瀏覽器、也不要用 Playwright 預覽或截圖——只有第 3 步最後那次才開，那一次是要給人看的。先執行第 1 步。
```

### `mcp-playwright`

Claude prompt：

```text
請用 Playwright MCP 開啟 https://www.pinterest.com ，等頁面圖片載入完成後（可以多等幾秒）把整頁截圖存成 <verifyShotPath(claude)>。只做這件事，不要問我問題，存好就結束。
```

Codex prompt：

```text
請用 playwright skill 開啟 https://www.pinterest.com ，等頁面圖片載入完成後（可以多等幾秒）把整頁截圖存成 <verifyShotPath(codex)>。只做這件事，不要問我問題，存好就結束。
```

### `skill-questions`

Claude prompt：

```text
我想幫這台電腦選一個終端機工具，但我不知道要選哪個。請使用 structured-questions skill 問我，讓我用選的。
```

Codex prompt：

```text
$structured-questions 我想幫這台電腦選一個終端機工具，但我不知道要選哪個。請使用 structured-questions skill 問我，讓我用選的。
```

## 4. 查無／有疑問

1. `env-config` 是畫面第一張卡，但沒有 check、沒有 checklist，也沒有可套用四種判定方式的格；本文件把它計入卡數、不計入格數，沒有猜造 `格 id`（`public/model.js:854-869`）。
2. `demo-claude`、`demo-codex`、`vault-agent-claude`、`vault-agent-codex` 都宣告 `noInstall: true`，但 `checklistGroups` 仍因它們有 `verifyAction` 畫出 `install-*` 格，文字也仍是「安裝：…」；總表照實列出，安裝動作欄留空（`src/config-check.js:970-978,1092-1100`；`public/viewmodel.js:878-920`）。
3. `title`、`statusline`、Codex 的 `naming`、`vault-note`、`open-vault`、Codex 的 `skill-rename`、`skill-questions` 都是 `expect: null`。對應 `system-*` 格會在終端 launcher 成功後記成已嘗試，真正畫面證據則由另一個 `eye-*` 格判定；因此總表把 system 格歸「行為驗證」，但它們沒有獨立的自動 pass 證據（`scripts/verify-in-terminal.mjs:645-653`）。
4. `ENV_CARD_META` 定義了 `terminal` 卡，但 `checksForPlatform` 在 `darwin`、`win32` 都不會產生 `terminal` check；runtime 只會走 `ghostty` 或 `windows-terminal`，所以沒有把 `terminal` 算成第 37 張卡（`public/model.js:588-600`；`src/env-check.js:60-88`）。
5. `VERIFICATION` 上方註解仍把 allowlist 舉成「兩者都沒有，結構對就綠」的例子，但同一物件稍後明確替 `allowlist` 指到 `CASES.allowlist`；總表依執行中的物件與 case，列為有驗證題（`src/config-check.js:274-277,318-320`）。

## 5. 統計

| 項目 | 數量 |
|---|---:|
| 段 | 5 |
| 卡 | 36 |
| 格（即總表資料列） | 88 |

卡數包含沒有 checklist 格的 `env-config`，並把 `darwin` 的 Ghostty 卡與 `win32` 的 Windows 準備卡各算一張。若按單一平台、單一工具實際走訪，卡與格會因條件過濾而少於這個聯集。

| 判定方式 | 格數 |
|---|---:|
| 結構探測 | 46 |
| 行為驗證 | 11 |
| 副產物比對 | 13 |
| 人眼勾選 | 18 |
| 合計 | 88 |
