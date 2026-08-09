import assert from "node:assert/strict";
import test from "node:test";

import { claudeCodeCard } from "../domain/catalog.ts";
import type { CheckStatus } from "../domain/check.ts";
import type { EnvProbe, TerminalOpener } from "./ports.ts";
import { verifyInTerminal } from "./verify-in-terminal.ts";

test("verifyInTerminal reports statuses probed after opening terminal", async () => {
  let opened = false;
  const openCalls: string[] = [];
  const beforeOpen = new Map<string, CheckStatus>([
    ["claude", "missing"],
    ["claude-auth", "missing"],
  ]);
  const afterOpen = new Map<string, CheckStatus>([
    ["claude", "ok"],
    ["claude-auth", "failed"],
  ]);
  const terminalOpener: TerminalOpener = {
    async open(action) {
      openCalls.push(action);
      opened = true;
    },
  };
  const envProbe: EnvProbe = {
    async probe(checkId) {
      return (opened ? afterOpen : beforeOpen).get(checkId) ?? "missing";
    },
  };

  const checks = await verifyInTerminal(
    "verify-claude",
    claudeCodeCard,
    terminalOpener,
    envProbe,
  );

  assert.deepEqual(openCalls, ["verify-claude"]);
  assert.deepEqual(checks.map((check) => check.status), ["ok", "failed"]);
});
