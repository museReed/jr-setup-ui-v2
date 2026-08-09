import assert from "node:assert/strict";
import test from "node:test";

import { claudeCodeCard } from "../domain/catalog.ts";
import { checkEnvironment } from "./check-environment.ts";
import type { EnvProbe } from "./ports.ts";

// 只回 id 與狀態：標籤是呈現的事，伺服器不必知道畫面上那一格叫什麼。
test("逐格探測，只回 id 與狀態", async () => {
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
    { id: "claude", status: "ok" },
    { id: "claude-auth", status: "missing" },
  ]);
});
