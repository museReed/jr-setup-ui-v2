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
        // 行為驗證：開一個真的 claude session 叫它跑串接指令，看它被不被擋。
        //
        // ⚠️ via 是 terminal 不是 auto，這個差別就是整張卡的重點。
        //
        // 我們自己去跑那支 hook 腳本、讀 exit code，只證明得了「腳本會擋」——而
        // 腳本本身幾乎永遠是好的。真正會壞的是「Claude Code 到底有沒有載入它」：
        // settings.json 路徑寫錯、裝完沒重開 Claude Code，自動驗證照樣全綠。
        // 那正是學生最常見的失敗，而它只有在真的 claude 裡才看得見。
        { kind: "verify", via: "terminal", action: "verify-hook" },
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
