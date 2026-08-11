import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { createTerminalOpener, writeLauncher } from "./terminal-opener.ts";

test("verify-codex 的 macOS launcher 打的是學生自己會打的 codex，不繞過包裝函式", () => {
  const marker = path.join(tmpdir(), `jr-terminal-test-${process.pid}.done`);
  const launcher = writeLauncher("codex", `test-${process.pid}`, marker, "darwin");

  try {
    const body = readFileSync(launcher, "utf8");
    assert.match(body, /^codex --version$/m);
    // 加了 `command` 就繞過包裝函式，而包裝函式正是這一格唯一抓得到的失敗。
    assert.doesNotMatch(body, /command codex/);
  } finally {
    rmSync(launcher, { force: true });
  }
});

test("verify-codex 的 Windows launcher 第一個字元是 BOM", () => {
  const marker = path.join(tmpdir(), `jr-terminal-test-${process.pid}.done`);
  const launcher = writeLauncher("codex", `test-${process.pid}`, marker, "win32");

  try {
    assert.equal(readFileSync(launcher, "utf8")[0], "\uFEFF");
  } finally {
    rmSync(launcher, { force: true });
  }
});

// 學生把終端視窗關掉時我們不會知道，只能等滿逾時（三到四分鐘）——那段時間畫面上
// 每顆按鈕都是灰的。取消要能立刻把等待結束掉，而結論跟逾時一樣是「沒走完」。
test("已經取消的等待立刻收工，而且不算驗證通過", async () => {
  const opener = createTerminalOpener(null);
  const controller = new AbortController();
  controller.abort();

  const outcome = await opener.open("verify-allowlist", controller.signal);

  assert.equal(outcome.completed, false);
});

test("不認得的動作照樣是錯，不會因為多了 signal 就被吞掉", async () => {
  const opener = createTerminalOpener(null);

  await assert.rejects(() => opener.open("nonesuch"), /不認得的終端動作/);
});
