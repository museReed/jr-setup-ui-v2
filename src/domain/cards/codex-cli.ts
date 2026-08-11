import type { Card } from "../card.ts";
import { K } from "../copy-keys.ts";

export const codexCliCard: Card = {
  id: "codex",
  sectionId: "env",
  labelKey: K.card.codex,
  logoId: "logo-openai",
  checks: [
    {
      id: "codex",
      labelKey: K.check.codex,
      capabilities: [
        {
          kind: "install",
          action: "install-codex",
          startKey: K.run.startInstallCodex,
        },
        { kind: "verify", via: "terminal", action: "verify-codex" },
      ],
    },
    {
      id: "codex-auth",
      labelKey: K.check.codexAuth,
      missingKey: K.status.notLoggedIn,
      capabilities: [
        {
          kind: "login",
          action: "login-codex",
          startKey: K.run.startLoginCodex,
          linkKey: K.action.openCodexLink,
        },
      ],
    },
  ],
  capabilities: [{ kind: "recheck" }],
};
