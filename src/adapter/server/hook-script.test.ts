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

interface HookResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

function runHook(payload: string): Promise<HookResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [HOOK], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
    child.stdin.end(payload, "utf8");
  });
}

// 擋下＝stdout 是一份 permissionDecision: deny 的 JSON。
// ⚠️ 不看結束碼：Windows 上 hook 經過 shell，node 回的碼會被改寫成別的非零值，
// 而 Claude Code 只認「剛好等於 2」——訊息到了、指令照跑（#38 實測）。
function denial(result: HookResult): { decision: string; reason: string } | null {
  try {
    const parsed = JSON.parse(result.stdout.trim()) as {
      hookSpecificOutput?: {
        hookEventName?: string;
        permissionDecision?: string;
        permissionDecisionReason?: string;
      };
    };
    const out = parsed.hookSpecificOutput;

    return out?.hookEventName === "PreToolUse"
      ? {
          decision: out.permissionDecision ?? "",
          reason: out.permissionDecisionReason ?? "",
        }
      : null;
  } catch {
    return null;
  }
}

const CHAINED = JSON.stringify({
  tool_name: "Bash",
  tool_input: { command: "echo a && echo b" },
});

test("串接指令會被拒絕，而且理由裡有判定要找的那句話", async () => {
  const result = await runHook(CHAINED);
  const verdict = denial(result);

  assert.equal(verdict?.decision, "deny");
  assert.match(verdict?.reason ?? "", /一次只跑一個指令/);
});

// ⚠️ #30 的正本：Windows 上有東西會在 UTF-8 前面加 BOM，而 JSON.parse 看到它就丟例外
// → hook 走 fail-open → 學生看到「裝好了就是不擋」。
test("payload 前面多一個 BOM 時照樣擋得下來，不會靜默放行", async () => {
  assert.equal(denial(await runHook(`﻿${CHAINED}`))?.decision, "deny");
});

// 工具名在不同平台上叫什麼我們沒有驗過，scope 由 settings.json 的 matcher 決定；
// 這支腳本只問「這次呼叫帶不帶指令字串」。
test("工具名不是 Bash 但帶著指令時照樣看指令內容", async () => {
  const result = await runHook(
    JSON.stringify({ tool_name: "PowerShell", tool_input: { command: "echo a; echo b" } }),
  );

  assert.equal(denial(result)?.decision, "deny");
});

test("沒有指令字串的呼叫直接放行——stdout 不能有任何東西", async () => {
  const result = await runHook(
    JSON.stringify({ tool_name: "Write", tool_input: { file_path: "a.txt" } }),
  );

  assert.equal(result.stdout, "");
});

test("單一 pipe 是一條資料流，不算串接", async () => {
  const result = await runHook(
    JSON.stringify({ tool_name: "Bash", tool_input: { command: "grep foo bar.txt | head" } }),
  );

  assert.equal(result.stdout, "");
});

test("引號裡的分號不算串接", async () => {
  const result = await runHook(
    JSON.stringify({ tool_name: "Bash", tool_input: { command: 'echo "a;b"' } }),
  );

  assert.equal(result.stdout, "");
});
