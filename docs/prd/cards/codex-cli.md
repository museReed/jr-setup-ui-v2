---
type: design
status: current
issue: 9
---

# Codex CLI 卡

段：env｜卡 id：`codex`｜排在 Claude Code 之後、rules 段之前。

## 1. 命題

這張卡做完之後：學生機器上有一支**自己裝的、不經過 npm 的** `codex`，在他自己的終端機裡打得動，
而且已經登入 ChatGPT 帳號。

## 2. 舊版出處

| 主題 | 出處 |
|---|---|
| 兩格與判定 | `docs/prd/cards/INVENTORY.md` 第 21-22 列（`system-codex`／`system-codex-auth`，兩格都是結構探測） |
| 版本探測 | `src/env-check.js:472-505`（`checkVersion`）、`697-700`（codex 那兩項怎麼掛上去） |
| 登入探測 | `src/env-check.js:606-641`（`checkCodexAuth`）、`177-184`（`parseCodexAuth`） |
| 探測的 Windows 退路 | `src/env-check.js:186-207`（`runProbe`；⚠️ 那段註解明寫登入探測不能開 `emptyFailureMeansMissing`） |
| 安裝指令 | `src/installers.js:28-31`（darwin）、`76`、`114-142`（win32 + 兩個平台的 `CODEX_NON_INTERACTIVE`） |
| 安裝器與 PATH 的分工 | `src/installers.js:13-15`、`38-43`（⚠️ claude 要嚮導補 PATH，codex **不要**插手） |
| 登入指令 | `src/actions.js:375-394`（含「不要再加 `--device-auth`」「BROWSER 擋不掉」兩條實測結論） |
| 登入列的連結文案 | `public/viewmodel.js:983-1000`（`LOGIN_CARD_SERVICES` 的 `codex-auth`：備援用字 + `autoOpens`） |
| 授權網址怎麼撈 | `public/viewmodel.js` 的 hint 抽取；同一份邏輯的副本在 `src/login-hints.js:1-21`（ANSI、代碼長度兩個坑） |
| 卡片 logo | `public/model.js:528-543`（claude → `logo-claude`，codex → `logo-openai`） |

v2 這一側的對照物：`src/domain/cards/claude-code.ts`、`src/adapter/server/{probe,installers,actions,terminal-opener,fake-env}.ts`。

## 3. 逐格清單

| 格 id | 標題 | 細節 | 誰判定 | 判定來源 | 這個判定證明不了什麼 |
|---|---|---|---|---|---|
| `codex` | Codex CLI | 探測 `codex --version` exit 0 | 結構探測 | `src/env-check.js:697-700` | 只證明「這支程式在，而且嚮導叫得動」。學生自己的終端機裡叫不叫得動，探測看不到（PATH 由 `~/.zprofile` 補、shell 設定檔可能有同名包裝函式） |
| `codex` | 同上，第二段 | 開一個真的終端視窗（互動式 zsh，會讀學生自己的設定檔）跑 `codex --version`，學生看到版本號按 Enter | 行為驗證 | **新增**（見下） | 只證明那個視窗裡叫得動。不證明 codex 能連線、能登入、模型跑得動 |
| `codex-auth` | Codex 登入狀態 | 探測 `codex login status` exit 0 | 結構探測 | `src/env-check.js:606-641` | 只證明本機存著一份還沒過期的憑證。不證明額度還有、不證明送得出請求 |

### 「新增」那一格的理由與範圍

舊版這張卡沒有終端驗證題；包裝函式的問題舊版是用另一張卡 `system-shell-wrapper`
（`src/env-check.js:543-566`）統一掃 claude / codex 兩者。v2 的 Claude 卡已經改成每張卡自己開一次真終端
（`src/domain/cards/claude-code.ts:17`），Codex 卡跟進是為了兩張卡的形狀一致，不是新命題。

- 做法完全照 Claude 那一格：同一支 launcher、同一個記號檔等待、同一組逾時（`terminal-opener.ts:200-234`）。
- **這一格排除得了**：PATH 只在安裝當下那個視窗生效、`~/.zprofile` 沒被讀到、shell 設定檔裡有壞掉的 `codex` 包裝函式。
- **排除不了**：登入、網路、額度——那些是 `codex-auth` 與後面幾張卡的事。
- 這一格不叫 AI 做事，所以不花 token、不需要登入。
- Reed 裁決 2026-08-11：跟進。舊版的 `system-shell-wrapper` 卡仍然照原樣留給後面的 PRD，兩者不互相取代。

## 4. 步驟與按鈕

沒有 `manual-step`（那是 Claude 卡的全螢幕那兩步專用）。按鈕全部掛在格上：

| 格 | 按鈕 | 動作 |
|---|---|---|
| `codex` | 安裝／重新安裝 | `install-codex` |
| `codex` | 開終端驗證 | `verify-codex`（terminal） |
| `codex-auth` | 登入／重新登入 | `login-codex` |
| 卡片級 | 再 check 一次 | `recheck` |

`codex-auth` 這一格的「還沒完成」文案用 `K.status.notLoggedIn`，不用預設的「還沒安裝」
（理由同 `claude-code.ts:23-25`：學生剛看著它裝完）。

### 卡片 logo

舊版每張卡自己宣告 logo，codex 那幾張用 `logo-openai`（`public/model.js:528-543`）。v2 目前把
`logoId` 寫死在 `card-model.ts:194`，第二張卡一加上去就會頂著 Claude 的標。所以：logo 改成卡片定義
的欄位（`Card.logoId`），`cardModel` 讀它；`logo-openai` 這個 symbol **從舊版 `public/vendor/logos.svg`
整段抄過來**，不要自己重畫路徑。

登入那條的連結文案兩家不一樣（claude：「打開登入頁面」；codex：「瀏覽器沒開？點這裡開啟 OpenAI 授權頁」），
所以 `login` 能力要能自己帶文案代號（`linkKey`），沒帶就用現有的 `K.action.openLink`。

## 5. 動作規格

### `install-codex`

| 平台 | 指令 | 舊版證據 |
|---|---|---|
| darwin | `bash -c` ← `set -eo pipefail` + `curl -fsSL https://chatgpt.com/codex/install.sh \| sh` | `src/installers.js:28-31,129-131` |
| win32 | `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command` ← `irm https://chatgpt.com/codex/install.ps1 \| iex` | `src/installers.js:76,114-126` |

兩個平台都要 `env: { CODEX_NON_INTERACTIVE: "1" }`（`src/installers.js:127,141`）。

三條不准改的：

1. **不經過 npm。** 理由同 `installers.ts:1-11`（macOS 的 EACCES 是一台乾淨 VM 換來的）。
2. **`set -eo pipefail` 不能省。** curl 失敗時右邊的直譯器讀到空輸入會正常結束，整條 exit 0——沒裝成功卻回報成功（`src/installers.js:10-11`）。
3. **不要幫 codex 補 PATH。** 安裝器自己寫 `~/.zprofile`（darwin）／登錄檔 User Path（win32）。
   claude 那半的 `ensureZshrcPath` 與 `CLAUDE_WIN32_PATH_FIX` 是因為 claude 的安裝器**不寫**，
   照著類推會長出重複的 PATH 行（`src/installers.js:13-15,38-43`）。

`CODEX_NON_INTERACTIVE=1` 是安裝腳本自己提供的開關（腳本第 6 行讀它），少了它安裝器會問
「Start Codex now? [y/N]」，而且問句直接寫 `/dev/tty`——印在學生沒在看的那個終端機，然後永遠等下去。
網頁那格輸入框救不了，它寫的是 stdin（`src/installers.js:132-141`）。

### `login-codex`

```
cmd: "codex"    args: ["login"]    acceptsInput: true    env: {}
```

- **不要加 `--device-auth`。** 那個模式需要每個帳號先去 ChatGPT Security Settings 打開
  device code authorization，沒開的人走到授權頁只會看到一段紅字（VM 實測，`src/actions.js:379-383`）。
- **不要設 `BROWSER`。** codex 用 Rust 的 webbrowser crate，二進位檔裡沒有 `BROWSER` 這個字串；
  claude 那招在這裡無效（`src/actions.js:385-387`）。
- 所以 **codex 一定會自己開瀏覽器**。連結不是主要入口，是備援：文案要寫成
  「瀏覽器沒開？點這裡開啟 OpenAI 授權頁」（`public/viewmodel.js:988-995`）。
- `acceptsInput: true` 照留：輸入框的出現條件是「程序還活著而且吃得下 stdin」，不是「有沒有撈到代碼」
  （`public/viewmodel.js:1025-1033`）。

### 探測

| check | 指令 | 判準 |
|---|---|---|
| `codex` | `codex --version` | exit 0 |
| `codex-auth` | `codex login status` | exit 0 |

⚠️ `codex login status` **未登入時是「非零 + stdout 全空 + 訊息寫在 stderr」**——特徵跟「指令根本不存在」
一模一樣（`src/env-check.js:191-192`）。v2 的 `succeeds()` 只看 exit code，所以結論剛好一致（未登入＝missing＝
畫面上寫「還沒登入」）；但**不准**為了這一格加任何「空輸出就當作沒安裝」的判斷，那會把未登入誤報成未安裝。

### `verify-codex`（terminal）

照 `terminal-opener.ts:200-234` 的 `writeLauncher`，只換 CLI 名字與標題文字：

- darwin：`#!/bin/zsh -i` + `codex --version` + 提示 + `read -r _` + 寫記號檔。
  - `-i` 要留（PATH 靠 `~/.zprofile`／`.zshrc` 補）。
  - ⚠️ **不要加 `command`。** 這一格問的是「在你自己的終端機裡打得動嗎」，而同名包裝函式蓋掉執行檔
    正是它唯一抓得到的失敗；`command` 剛好繞過那個包裝，等於把這一格驗空。
    `writeAskClaudeLauncher` 那邊要 `command` 是另一件事（怕包裝函式吃掉旗標，
    `terminal-opener.ts:276-281`），不要類推過來。
- win32：`.ps1`（**要 BOM**，否則 PowerShell 5.1 當 ANSI 讀、中文變亂碼連 parse 都過不了）+ `codex --version` + `Read-Host` + 寫記號檔。
- 逾時沿用 `MARKER_TIMEOUT_MS = 180_000`。
- 假環境下走完要把 `codex` / `codex-auth` 設成 `ok`（對稱於 `terminal-opener.ts:82-85`）。

實作上把現有的 `openClaudeVerify` / `writeLauncher` 參數化成「哪一支 CLI」，不要複製第二份。

## 6. 驗證題全文

這張卡沒有叫 AI 做事的驗證題（舊版沒有，新增的那一格也不叫 AI）。終端視窗裡印給學生看的字：

```text
===== 驗證 Codex CLI =====

codex --version

看到版本號就表示 CLI 真的跑得起來。
確認完按 Enter 關掉這個視窗，網頁上那一格會跟著變綠。
```

不能改的：`-i`（讀 rc 才有 PATH）、指令**不加** `command`（見 §5）、`.ps1` 的 BOM、`read -r _`／`Read-Host`
（沒有它視窗會一閃就關，學生什麼都沒看到）。

## 7. 失敗長相

| 失敗 | 學生看到什麼 | 我們給的線索 |
|---|---|---|
| 安裝時 curl 掛掉 | 那一格仍是「還沒安裝」，原始輸出區有 curl 的錯誤行 | `pipefail` 保證 exit 非零 → 走 `run.failed` 那條，不會假綠 |
| 安裝器問「Start Codex now?」 | ⚠️ 這是要防的「沒有反應」：畫面停在安裝中直到逾時 | `CODEX_NON_INTERACTIVE=1` 讓它不問。這條沒了就沒有第二道保險 |
| 裝完了但新分頁叫不動 | 探測綠、終端驗證那一格的視窗裡是 `command not found` | 視窗停著不關（`read -r _`），錯誤訊息留在畫面上 |
| shell 設定檔裡有壞掉的 `codex` 包裝函式 | 同上，視窗裡是包裝函式自己的錯誤 | 這正是這一格存在的理由；後面「終端機裡的 claude / codex 是活的」那張卡會指出是哪一個檔案 |
| 登入時瀏覽器沒自動開 | 登入那列停在等待，畫面上有備援連結可點 | 文案就寫「瀏覽器沒開？點這裡」——不假裝連結是主要入口 |
| 授權網址被 ANSI 色碼汙染 | ⚠️ 點了連結開出 404 或整條打不開 | 見 §8 第一條，`findAuthLink` 要先剝 ANSI 再抓 |
| 登入到一半視窗關了／取消 | 那一格回到「還沒登入」，按鈕拿回來 | 取消與逾時同一個結論，差別只在等多久 |

## 8. 已知怪癖

1. **ANSI 色碼會黏在網址尾巴。** 舊版 2026-07-31 用 codex 真實輸出驗出來的
   （`src/login-hints.js:5-6`）。v2 現在的 `findAuthLink`（`card-model.ts:409-419`）直接對原始輸出跑
   `https?:\/\/\S+`，沒剝 ANSI、也沒去尾端標點——Claude 那條沒炸是因為它的輸出乾淨。這張卡要把
   剝 ANSI（`\[[0-9;]*m`）與去尾端 `.,)` 補上，並補一題用**帶色碼的字串**的迴歸鎖。
2. **裝置代碼長度不能寫死。** 舊版註解明寫（`src/login-hints.js:6`）。v2 目前不撈代碼，不主動加。
3. **codex 一定會自己開瀏覽器**，見 §5。那一下會蓋掉嚮導頁面——這是已知且擋不掉的，文案要先講。
4. **winget／brew 的進度條靠 `\r` 重畫**，透過管子接出來是幾百行轉圈符號（`src/installers.js:84-87`）。
   這張卡的安裝走的是官方安裝器不是 winget，但原始輸出區照樣可能很吵，白話進度與原始輸出要分開（現有機制已經分開）。
5. **Windows 上 spawn 找不到裸指令**（npm 裝的是 `.cmd`）。這張卡不經過 npm，但探測層若之後要加退路，
   照 `src/env-check.js:186-207`，且登入探測不准開那個旗標。

## 9. 副作用成本

| 項目 | 有沒有 |
|---|---|
| 開視窗 | 有：終端驗證那一格開一個終端；登入時 codex 自己開瀏覽器 |
| 花 token | 沒有（這張卡不叫 AI 做事） |
| 需要登入 | `codex-auth` 那一格就是登入 |
| 需要網路 | 安裝與登入都要 |
| 會寫學生機器上的什麼 | 安裝器自己寫 `~/.local/bin` 與 `~/.zprofile`／User Path。**嚮導本身不寫任何檔案** |

## 10. Non-Goals

| 不做 | 證據 | 什麼條件下可以重開 |
|---|---|---|
| `codex login --device-auth` | 需要每個帳號自己先開 device code 授權，VM 實測走到授權頁只有紅字（`src/actions.js:379-383`） | OpenAI 改成預設開啟，或課前能統一幫學生開 |
| 用 `BROWSER` 擋掉自動開瀏覽器 | 二進位檔裡沒有這個字串（`src/actions.js:385-387`） | codex 官方支援某個等效環境變數時 |
| 幫 codex 補 PATH | 安裝器自己寫，補了會重複（`src/installers.js:14-15,42-43`） | 官方安裝器改成不寫 |
| 經過 npm 安裝 | macOS EACCES，乾淨 VM 實測（`installers.ts:1-11`） | 不重開 |
| 把 codex 的 AGENTS.md / config.toml 一起裝 | 那是 rules 段「Codex CLI 做事的規矩與回話風格」那張卡的事（INVENTORY 第 47-50 列） | 不重開，分工就是這樣 |
| 幫 codex 做 `--version` 以外的行為驗證 | 舊版沒有；真正的行為驗證在 rules / skills 段各自的卡 | 不重開 |

## 11. 驗收

### 可執行指令

```bash
cd <worktree>
npm run typecheck
npm test
```

新增的迴歸鎖至少要有（測試名稱寫成一句斷言）：

- `installers`：codex 的 darwin 指令含 `set -eo pipefail`；兩個平台的 env 都有 `CODEX_NON_INTERACTIVE=1`；
  codex 的安裝指令裡**沒有**寫 `.zshrc` 的那一段。
- `actions`：`login-codex` 的 args 是 `["login"]`（不含 `--device-auth`）、`acceptsInput` 是 `true`、env 裡沒有 `BROWSER`。
- `probe`：`codex-auth` 用的是 `codex login status`。
- `terminal-opener`：`verify-codex` 寫出來的 launcher 含 `codex --version` 且**不含** `command codex`；Windows 那支開頭有 BOM。
- `card-model`：輸出裡的授權網址被 ANSI 色碼包住時（`ESC[36m…ESC[0m`），抽出來的 href 剛好是那條網址，
  不含任何 escape 序列、也不含尾端的 `.` `,` `)`。（**先寫紅的，確認它真的會紅**）
- `fake-env`：`JR_FAKE_ENV=missing` 會把 `codex` / `codex-auth` 一起設成 missing。
- 三語 copy 沒有孤兒代號（現有守衛測試會自己擋，不用另外寫）。

假環境跑一次，確認兩格真的出現在 state 裡：

```bash
JR_FAKE_ENV=missing JR_PORT=7431 JR_CLAUDE_DIR=/tmp/jr-codex-card npm start &
curl -s localhost:7431/api/state | grep -o '"codex[^"]*"'   # 要看到 codex 與 codex-auth
```

### 真機觀察點

1. 按下安裝時 `ps -ef | grep -c "[c]odex/install.sh"` ≥ 1，而且**整條命令列裡沒有 npm**。
2. 安裝完 `grep -c 'codex' ~/.zprofile` ≥ 1（安裝器自己寫的），而 `~/.zshrc` 不因為這張卡多出 PATH 行。
3. 按下登入時 `ps -o args= -p <codex 的 pid>` 看得到 `codex login`，且**沒有** `--device-auth`。
4. 登入那一列的連結 href 用瀏覽器打得開（不是帶著色碼的壞網址）。
5. 「開終端驗證」開出來的視窗裡印的是版本號，關掉視窗後網頁那一格變綠。
6. VM 才驗得到：乾淨機器上的「未安裝」態、以及 Windows 那半（`.ps1` 的 BOM、PowerShell profile 的包裝函式會不會吃掉旗標）。
