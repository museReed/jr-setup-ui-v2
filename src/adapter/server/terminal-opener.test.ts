import assert from "node:assert/strict";
import { test } from "node:test";

import { createTerminalOpener } from "./terminal-opener.ts";

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
