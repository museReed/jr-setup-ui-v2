import type { Card } from "./card.ts";

export const claudeCodeCard: Card = {
  id: "claude",
  sectionId: "env",
  label: "Claude Code",
  checks: [
    {
      id: "claude",
      label: "Claude Code CLI",
      capabilities: [
        { kind: "install", action: "install-claude" },
        // 開真的終端跑一次才算數。探測只看得到「檔案在不在」，看不到「跑起來會怎樣」。
        { kind: "verify", via: "terminal", action: "verify-claude" },
      ],
    },
    {
      id: "claude-auth",
      label: "Claude Code 登入狀態",
      // 登入沒有另外的行為驗證：`claude auth status` 問的就是行為本身。
      capabilities: [{ kind: "login", action: "login-claude" }],
    },
  ],
  capabilities: [
    {
      kind: "eye-check",
      id: "eye-claude-fullscreen",
      prompt: "第一次跑起來時，畫面問你要用哪種顯示模式——選好了就勾這格",
      walkthrough: "fullscreen-copy",
    },
    { kind: "recheck" },
  ],
};
