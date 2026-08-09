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

// 每一格在畫面上叫什麼。放 domain 是因為它是卡片定義的一部分，不是呈現細節——
// 後端的檢查結果與前端的清單要叫同一個名字。
export const CLAUDE_CHECK_LABELS: Readonly<Record<string, string>> = {
  claude: "Claude Code CLI",
  "claude-auth": "Claude Code 登入狀態",
};
