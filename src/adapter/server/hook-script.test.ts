import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// 真的 spawn 那支 hook。它的行為只有在被當成一支獨立行程餵 stdin 時才成立——
// import 進來測等於換一個題目（而 Windows VM 上出事的正是餵進去那一段，#30）。
const HOOK = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../materials/claude-code/hooks/block-chained-bash.js",
);

function runHook(payload: string): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [HOOK], { stdio: ["pipe", "ignore", "pipe"] });
    let stderr = "";

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("close", (code) => resolve({ code: code ?? -1, stderr }));
    child.stdin.end(payload, "utf8");
  });
}

const CHAINED = JSON.stringify({
  tool_name: "Bash",
  tool_input: { command: "echo a && echo b" },
});

test("串接指令會被擋下，exit 2 而且訊息回得去", async () => {
  const { code, stderr } = await runHook(CHAINED);

  assert.equal(code, 2);
  assert.match(stderr, /一次只跑一個指令/);
});

// ⚠️ #30 的正本：Windows 上有東西會在 UTF-8 前面加 BOM，而 JSON.parse 看到它就丟例外
// → hook 走 fail-open → 學生看到「裝好了就是不擋」。
test("payload 前面多一個 BOM 時照樣擋得下來，不會靜默放行", async () => {
  const { code } = await runHook(`﻿${CHAINED}`);

  assert.equal(code, 2);
});

// 工具名在不同平台上叫什麼我們沒有驗過，scope 由 settings.json 的 matcher 決定；
// 這支腳本只問「這次呼叫帶不帶指令字串」。
test("工具名不是 Bash 但帶著指令時照樣看指令內容", async () => {
  const { code } = await runHook(
    JSON.stringify({ tool_name: "Shell", tool_input: { command: "echo a; echo b" } }),
  );

  assert.equal(code, 2);
});

test("沒有指令字串的呼叫直接放行", async () => {
  const { code } = await runHook(
    JSON.stringify({ tool_name: "Write", tool_input: { file_path: "a.txt" } }),
  );

  assert.equal(code, 0);
});

test("單一 pipe 是一條資料流，不算串接", async () => {
  const { code } = await runHook(
    JSON.stringify({ tool_name: "Bash", tool_input: { command: "grep foo bar.txt | head" } }),
  );

  assert.equal(code, 0);
});

test("引號裡的分號不算串接", async () => {
  const { code } = await runHook(
    JSON.stringify({ tool_name: "Bash", tool_input: { command: 'echo "a;b"' } }),
  );

  assert.equal(code, 0);
});
