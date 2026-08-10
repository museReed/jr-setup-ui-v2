import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import test from "node:test";

import { writeLine } from "./process-runner.ts";

// 這題在守少一個 \n 時，學生貼了碼畫面完全沒反應，而且沒有任何線索。
test("送進 stdin 的內容會以 UTF-8 寫成完整的一行", async () => {
  const stdin = new PassThrough();

  await writeLine(stdin, "授權碼");

  assert.equal(stdin.read()?.toString("utf8"), "授權碼\n");
});

// 這題在守 stdin 已經壞掉時要說清楚，不能讓學生貼了碼卻只看到畫面沒反應。
test("stdin 已經毀損時會拒絕並說明輸入送不出去", async () => {
  const stdin = new PassThrough();
  stdin.destroy();

  await assert.rejects(() => writeLine(stdin, "授權碼"), /送不出去.*stdin 已毀損/);
});

// 這題在守沒有 stdin 時要留下線索，不能讓學生貼了碼卻完全不知道送去哪裡。
test("stdin 不存在時會拒絕並說明輸入送不出去", async () => {
  await assert.rejects(() => writeLine(null, "授權碼"), /送不出去.*找不到.*stdin/);
  await assert.rejects(() => writeLine(undefined, "授權碼"), /送不出去.*找不到.*stdin/);
});
