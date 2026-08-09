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
