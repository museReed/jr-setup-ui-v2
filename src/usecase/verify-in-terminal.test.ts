import assert from "node:assert/strict";
import test from "node:test";

import { claudeCodeCard } from "../domain/catalog.ts";
import type { CheckStatus } from "../domain/check.ts";
import type { EnvProbe, TerminalOpener } from "./ports.ts";
import { verifyInTerminal } from "./verify-in-terminal.ts";

test("結果來自開完視窗之後的探測，不是之前那一份", async () => {
  const { opener, probe, openCalls } = fakes(true);

  const result = await verifyInTerminal(
    "verify-claude",
    claudeCodeCard,
    opener,
    probe,
  );

  assert.deepEqual(openCalls, ["verify-claude"]);
  assert.deepEqual(
    result.checks.map((check) => check.status),
    ["ok", "failed"],
  );
  assert.equal(result.completed, true);
});

// 這一條擋的是最容易發生的假綠燈：學生把視窗關掉什麼都沒做，而重新探測看到的
// 結構本來就好好的，於是那一格變綠——「裝好」被當成「生效」。
test("學生沒走完視窗時 completed 是 false，即使探測看起來是好的", async () => {
  const { opener, probe } = fakes(false);

  const result = await verifyInTerminal(
    "verify-claude",
    claudeCodeCard,
    opener,
    probe,
  );

  assert.equal(result.completed, false);
  assert.equal(result.checks[0]?.status, "ok");
});

function fakes(completed: boolean): {
  opener: TerminalOpener;
  probe: EnvProbe;
  openCalls: string[];
} {
  let opened = false;
  const openCalls: string[] = [];
  const before = new Map<string, CheckStatus>([
    ["claude", "missing"],
    ["claude-auth", "missing"],
  ]);
  const after = new Map<string, CheckStatus>([
    ["claude", "ok"],
    ["claude-auth", "failed"],
  ]);

  return {
    openCalls,
    opener: {
      async open(action) {
        openCalls.push(action);
        opened = true;
        return { completed };
      },
    },
    probe: {
      async probe(checkId) {
        return (opened ? after : before).get(checkId) ?? "missing";
      },
    },
  };
}
