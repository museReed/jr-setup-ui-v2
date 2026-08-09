---
type: snapshot
status: current
issue: 1
---

# Handoff — jr-setup-ui-v2 垂直切片（第一、二張卡）

**Branch**：`feature/1-slice-claude-card`（15 commits，未開 PR）
**Worktree**：`.worktrees/slice-claude-card`
**Issue**：[#1](https://github.com/museReed/jr-setup-ui-v2/issues/1)

## 狀態摘要

- PRD + ADR + 施工圖已寫（PR #2 開著未 merge，**等 Reed 審**）
- 兩張卡跑得通：**Claude Code**（檢查/安裝/登入/開終端驗證/人工勾選）、**它什麼時候該停下來問你**（hook + allowlist 合併卡）
- Clean Architecture 四層到位；domain 前後端共用同一份 `isComplete`
- 設計系統、glitch 清單、顏色語彙（青=系統驗／橘=你自己看）、「怎麼做」彈窗（含 mock 示意圖）都接上
- 三語切換（繁/簡/EN）+ 孤兒代號守衛；教學內容分語言目錄
- 36 tests / typecheck clean / bundle JS 40 kB

## 必讀檔案

| 檔案 | 為什麼要讀 |
|---|---|
| `docs/prd/rebuild.md` | 八項決策與 counterfactual。動任何架構前先看否決過什麼 |
| `docs/architecture/adr/0001-clean-architecture-mvvm-mvc.md` | 分層契約與被否決方案 |
| `docs/architecture/rebuild-blueprint.md` | 六階段施工圖與待解問題 |
| `src/domain/progress.ts` | `isComplete` / `canAdvance` / `canSkip` / `canVerifyYet`——所有完成判定的唯一來源 |
| `src/domain/catalog.ts` | 兩張卡的定義。capabilities 掛在**格**上不是卡上 |
| `src/adapter/server/verify-hook.ts` | 行為驗證：跑**實際註冊的那條指令**，不是自己拼路徑 |
| `src/copy/copy-keys.test.ts` | 孤兒代號守衛。它已經抓到我兩次 |

## 下一步

1. **`npm run build` 之後才 `npm start`**——server 服務的是 `src/adapter/web/dist`，忘了 build 會看到舊畫面
2. **驗第二張卡**：`node scripts/try-guardrails.mjs`（跑在暫存目錄，不碰真 `~/.claude`）
3. **接第二張卡的 walkthrough 與逐格 `?`**——`content/walkthroughs/{locale}/` 目前只有 `fullscreen-copy`
4. **段落導覽**：目前只有「下一張」線性走，還沒有分頁（讓 AI 能跑起來／讓它照你的規矩回話…）與進度條
5. **動畫**：小人（`loader-claude.json` 四段幀號 idle[0,8]/work-in[9,15]/work[16,35]/outro[36,42]）、貓、鎖頭三態、解鎖巫師都還沒搬。`Terminal` 元件已留 `chromeExtra` 掛點
6. **PR #2 要不要 merge**（PRD/Tech Design），以及這條 branch 要不要開 PR

## 已知問題

- **`ServerContext` 目前寫死兩張卡**，`catalog.ts` 直接匯出。加第三張卡要同時改 `context.ts`
- **`verify-allowlist` 宣告了但沒有實作**——按下去會走 `AUTO_VERIFIERS` 找不到 → 報「沒走完」。要嘛實作，要嘛從 catalog 拿掉
- **登入那格在真實環境永遠是 `ok`**（`claude auth status` 回 0），中間態驗不到。要驗中間態用 `JR_FAKE_ENV=missing`
- **bootstrap 與 npm 發佈都還沒做**，所以 VM 上只能手動 clone（repo 是 private，要認證）
- **前一代 `test/frontend-layers.mjs` 那 1338 行迴歸知識還沒分流**（施工圖 Phase 0），這是重寫最高風險項

## 環境備忘

```
JR_PORT=7430            # 預設
JR_FAKE_ENV=missing     # 假探測，看得到「未安裝」那一態
JR_CLAUDE_DIR=<path>    # ⚠️ 開發時必設，否則會寫進真正的 ~/.claude
```

舊版對照可跑：`node /Users/reed/Projects/jr-setup-ui/bin/jr-setup-ui.js --no-open --port 7431`
