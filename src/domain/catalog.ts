import type { Card } from "./card.ts";
import { K } from "./copy-keys.ts";

export const claudeCodeCard: Card = {
  id: "claude",
  sectionId: "env",
  labelKey: K.card.claude,
  checks: [
    {
      id: "claude",
      labelKey: K.check.claude,
      capabilities: [
        { kind: "install", action: "install-claude", startKey: K.run.startInstallClaude },
        // 開真的終端跑一次才算數。探測只看得到「檔案在不在」，看不到「跑起來會怎樣」。
        { kind: "verify", via: "terminal", action: "verify-claude" },
      ],
    },
    {
      id: "claude-auth",
      labelKey: K.check.claudeAuth,
      // 登入沒有另外的行為驗證：`claude auth status` 問的就是行為本身。
      capabilities: [
        { kind: "login", action: "login-claude", startKey: K.run.startLoginClaude },
      ],
    },
  ],
  capabilities: [
    {
      kind: "eye-check",
      id: "eye-claude-fullscreen",
      promptKey: K.eye.claudeFullscreen,
      walkthrough: "fullscreen-copy",
    },
    { kind: "recheck" },
  ],
};

// 第二張卡：hook + allowlist 合併。
//
// 為什麼合併：兩者寫的是同一個檔（~/.claude/settings.json），講的也是同一件事
// ——它什麼時候該停下來問你。分兩張卡的話學生會以為是兩個無關的設定，而白名單
// 的實際效果（連改檔案都不再問）根本不會出現在標題上。
//
// hook 排前面：它是「該擋的擋」，白名單是「不該問的不問」。先看到被攔下來的
// 畫面，再看什麼情況不會攔，順序才講得通。
export const guardrailsCard: Card = {
  id: "guardrails",
  sectionId: "rules",
  labelKey: K.card.guardrails,
  checks: [
    {
      id: "hook",
      labelKey: K.check.hook,
      capabilities: [
        { kind: "install", action: "install-hook", startKey: K.run.startInstallHook },
        // 行為驗證：餵一條串接指令，看它擋不擋。
        //
        // via: "auto" 不是 terminal——這一題程式自己問得到答案（跑註冊的那條指令、
        // 讀 exit code），不需要學生去看。能自動判定的就自動判定，勾選欄位越少，
        // 學生越不會一排全勾。
        //
        // ⚠️ 跑的必須是 settings.json 裡**實際註冊的那條指令**，不是我們自己拼
        // 一次路徑去叫腳本——腳本本身幾乎永遠是好的，壞掉的是它被怎麼叫。
        { kind: "verify", via: "auto", action: "verify-hook" },
      ],
    },
    {
      id: "allowlist",
      labelKey: K.check.allowlist,
      capabilities: [
        {
          kind: "install",
          action: "install-allowlist",
          startKey: K.run.startInstallAllowlist,
        },
        { kind: "verify", via: "terminal", action: "verify-allowlist" },
      ],
    },
  ],
  capabilities: [{ kind: "recheck" }],
};
