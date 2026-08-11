import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { fileURLToPath } from "node:url";

import { chainedCommand, createTerminalOpener, writeLauncher } from "./terminal-opener.ts";

// ⚠️ Windows PowerShell 5.1 不認 `&&`——指令會被它自己的剖析器擋在門口，而副產物裡那段
// 錯誤看起來很像「有被擋」。分不出「hook 生效」與「hook 根本沒被叫」的驗證題等於沒有。
test("Windows 的攔截器題目用 PowerShell 5.1 接受的分號，macOS 維持 &&", () => {
  assert.equal(chainedCommand("win32"), "echo a; echo b");
  assert.equal(chainedCommand("darwin"), "echo a && echo b");
});

// 這一題守的是**整類**錯誤，不是單一個 bug：任何一處 spawn 忘了給 env，開出去的視窗
// 就繼承伺服器啟動當下那份 PATH——Windows 上剛裝好的 claude 在那個視窗裡叫不動，而
// 網頁那一格永遠等不到記號檔（VM 實測 #20）。
// 同樣是守整類：清理暫存檔失敗過一次就把整個伺服器帶走（Windows 的 EPERM，#24），
// 而那條路是 async controller，沒人接就是行程結束、學生按什麼都沒反應。
test("清理暫存檔一律走 best-effort 的 removeQuietly，沒有裸的 rmSync", () => {
  const source = readFileSync(
    fileURLToPath(new URL("./terminal-opener.ts", import.meta.url)),
    "utf8",
  );
  // 定義自己那一行不算。
  const bare = source
    .split("\n")
    .filter((line) => /(?<!function )\brmSync\(/.test(line))
    .filter((line) => !line.includes("maxRetries"));

  assert.deepEqual(bare, [], `這些 rmSync 沒有走 removeQuietly：\n${bare.join("\n")}`);
});

test("開視窗的每一次 spawn 都給了現算的環境變數，沒有人吃繼承的", () => {
  const source = readFileSync(
    fileURLToPath(new URL("./terminal-opener.ts", import.meta.url)),
    "utf8",
  );
  const spawns = source.match(/spawn\((?:[^()]|\([^()]*\))*\)/g) ?? [];

  assert.ok(spawns.length > 0, "找不到任何 spawn，這題的掃描方式失效了");

  for (const call of spawns) {
    assert.match(call, /env:/, `這次 spawn 沒給 env：${call}`);
  }
});

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
