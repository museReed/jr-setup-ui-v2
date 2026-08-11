import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { installHook } from "./config-install.ts";
import { verifyHookBehavior } from "./verify-hook.ts";

const MATERIALS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../materials",
);

function sandbox(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "jr-claude-"));
  process.env.JR_CLAUDE_DIR = dir;
  return dir;
}

async function drain(events: AsyncGenerator<unknown>): Promise<void> {
  for await (const _ of events) {
    // 只是把它跑完
  }
}

test("裝好之後：串接被擋、單一指令放行", async () => {
  sandbox();
  await drain(installHook(MATERIALS));

  const verdict = await verifyHookBehavior();

  assert.equal(verdict.passed, true, verdict.lines.join("\n"));
  assert.match(verdict.lines.join("\n"), /擋下了/);
  assert.match(verdict.lines.join("\n"), /放行/);
});

test("沒註冊時說得出是沒註冊，不是靜靜地過", async () => {
  sandbox();

  const verdict = await verifyHookBehavior();

  assert.equal(verdict.passed, false);
  assert.match(verdict.lines.join("\n"), /找不到/);
});

// ⚠️ 這一條是整套設計的核心：驗證要跑**實際註冊的那條指令**。
// 註冊被改壞（指到不存在的檔）時腳本本身還是好的——自己拼路徑去跑就會永遠綠。
test("註冊指到不存在的檔時算沒過", async () => {
  const dir = sandbox();
  await drain(installHook(MATERIALS));

  const settings = JSON.parse(readFileSync(path.join(dir, "settings.json"), "utf8")) as {
    hooks: { PreToolUse: { hooks: { command: string }[] }[] };
  };
  settings.hooks.PreToolUse[0]!.hooks[0]!.command = 'node "/nope/block-chained-bash.js"';
  writeFileSync(path.join(dir, "settings.json"), JSON.stringify(settings));

  const verdict = await verifyHookBehavior();

  // 找不到檔案的話 node 什麼決定都印不出來——沒有 deny 就是沒擋，不能算過。
  // （Claude Code 那邊同樣是放行：hook 自己壞掉不會攔住任何東西。）
  assert.equal(verdict.passed, false, verdict.lines.join("\n"));
});
