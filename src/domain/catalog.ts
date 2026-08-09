import type { Card } from "./card.ts";

export const claudeCodeCard: Card = {
  id: "claude",
  sectionId: "env",
  label: "Claude Code",
  checkIds: ["claude", "claude-auth"],
  capabilities: [
    { kind: "install", action: "install-claude" },
    { kind: "login", action: "login-claude" },
    { kind: "verify", via: "terminal", action: "verify-claude" },
    {
      kind: "eye-check",
      id: "eye-claude-fullscreen",
      prompt:
        "第一次跑起來時，畫面問你要用哪種顯示模式——選好了就勾這格",
    },
    { kind: "recheck" },
  ],
};
