---
type: snapshot
status: current
issue: 6
---

# Handoff — 逐張卡的 PRD → 實作循環

## 現在到哪了

v2 的**兩張卡已經完整可用**（Claude Code、它什麼時候該停下來問你），bootstrap 也通了，
學生現在貼一行就能跑：

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/museReed/jr-setup-ui-v2/main/docs/setup.sh)"
```

舊版盤點完成：**5 段 36 卡 88 格**（`docs/prd/cards/INVENTORY.md`）。判定分佈——結構探測 46、
行為驗證 11、副產物比對 13、人眼勾選 18。

36 張卡裡有大量是 **Claude / Codex 雙胞胎**（同一件事做兩遍），所以實際要寫的 PRD 遠少於 36
份：**約 14 份，已完成 2 份，剩 12 份。**

## Reed 的三個裁決（2026-08-11）

1. **`noInstall` 那四張卡不畫「安裝」格。** 舊版 `demo-claude` / `demo-codex` /
   `vault-agent-claude` / `vault-agent-codex` 宣告了 `noInstall` 卻仍畫出安裝格——那是舊版的
   bug（有 `verifyAction` 就順手畫），v2 修掉。⚠️ 之後對照舊版截圖時要記得這是刻意的差異。
2. **七個 `expect: null` 的驗證題先照舊版**（title / statusline / codex 的 naming / vault-note /
   open-vault / codex 的 skill-rename / skill-questions）。PRD 裡把「這題為什麼沒有自動證據」
   寫成明確欄位，實作到那張卡時再逐張評估能不能升級。
3. **照學生走的順序做**：env → rules → skills → demo → notes。理由是任何時間點都有一段完整
   可用的流程可以拿去 VM 真的跑一次。

## 建議的 PRD 切分（14 份）

| 段 | 份數 | 內容 |
|---|---:|---|
| env | 4 | Claude ✅已做 · Codex · 版本控制與 GitHub · 終端機與系統前置（含 Windows 那 4 格） |
| rules | 3 | 護欄 ✅已做 · 規矩與回話風格（claude+codex） · 對話自己取名字（15 格，最大一張） |
| skills | 5 | auto-rename · handoff · structured-questions · playwright · 其他（frontend-design / skill-creator） |
| demo | 1 | claude+codex 同一份 |
| notes | 3 | Obsidian 本體 · 接到 GitHub · 叫 AI 寫一篇（含 vault-sync） |

雙胞胎卡一份 PRD 涵蓋一對，agent 當參數。

## 每張卡的循環

1. 開 issue（標題就是卡名）
2. `git worktree add .worktrees/<name> -b feature/<issue>-<name> origin/main`
3. **寫 PRD**（照 `docs/standards/task-card-prd.md` 的骨架）→ `docs/prd/cards/<name>.md`
4. 寫 codex spec（驗收條件從 PRD §11 抄），**指名要它先讀舊版對應檔案**
5. `~/.claude/skills/codex-agent/run-codex-task.sh <worktree> <spec>`，背景跑
6. Review：只讀 `last-message.txt` + `diff --stat`，**自己重跑驗收指令**
7. commit（orchestrator 做，codex 不 commit）→ PR → merge → `worktree remove` + `branch -D`

## 這一輪學到、下一輪別再犯的

- **spec 的驗收條件要鎖住「這次改動」的範圍，不是環境的絕對狀態。** 我寫了兩次
  「某指令必須完全無輸出」，兩次都掃到與本次無關的既有狀態（註解裡的舊檔名、別人留下的
  worktree），害 codex 正確地停手兩次
- **守衛測試要反向驗一次。** 加一行違規確認它真的會紅——綠燈也可能是因為它什麼都沒測
- **趕時間時最先崩的是分層。** 為了趕 VM 測試，View 被塞進「判斷貼回的碼對不對」與「直接
  呼叫 api」；`layers.test.ts` 現在會擋，但那是事後補的
- **問使用者要完整截圖，不要裁過的。** 有一輪我根據兩張各裁掉一半的截圖判定「輸入列沒渲染」，
  其實它一直都在，白花了三四輪

## 環境備忘

```
JR_PORT=7430            # 預設
JR_FAKE_ENV=missing     # 假探測。⚠️ 只蓋它認得的格，設定檔那幾格仍走真的探測
JR_CLAUDE_DIR=<path>    # 開發時必設，否則寫進真的 ~/.claude
JR_BRANCH=<branch>      # bootstrap 驗分支用
```

⚠️ **VM 才驗得到的三件事**：第一張卡的「未安裝」態、白名單驗證讀的是真的 `~/.claude`、
Windows 那半（`claude.exe` 不寫永久 PATH、PowerShell profile 的包裝函式會不會吃掉旗標——
macOS 已證實會，Windows 沒處理）。

## 已知缺口

- 取消只停掉「我們在等」，**停不掉已經開出去的那個 claude session**
- 開窗用的暫存 launcher 檔沒清掉（其他路徑都有 `rmSync`）
- `sectionId` 有欄位但畫面還沒有分段導覽與進度條
- 舊版 `test/frontend-layers.mjs` 那 1338 行迴歸知識還沒逐條分流到各卡的 PRD §7/§8
- 這個 repo 沒有任何 GitHub Actions，`pr-review-watcher` hook 每次 merge 都會誤報 CI 未通過
