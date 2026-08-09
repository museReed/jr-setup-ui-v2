import assert from "node:assert/strict";
import test from "node:test";

import { claudeCodeCard } from "../domain/catalog.ts";
import { checkEnvironment } from "./check-environment.ts";
import type { EnvProbe } from "./ports.ts";

test("逐格探測，標籤直接來自卡片定義", async () => {
  const probed: string[] = [];
  const envProbe: EnvProbe = {
    async probe(checkId) {
      probed.push(checkId);
      return checkId === "claude" ? "ok" : "missing";
    },
  };

  const checks = await checkEnvironment(claudeCodeCard, envProbe);

  assert.deepEqual(probed, ["claude", "claude-auth"]);
  assert.deepEqual(checks, [
    { id: "claude", label: "Claude Code CLI", status: "ok" },
    { id: "claude-auth", label: "Claude Code 登入狀態", status: "missing" },
  ]);
});
