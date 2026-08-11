import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// 回應送出去之後才繼續跑的那些工作（開視窗、等驗證、跑安裝）都是 fire-and-forget。
// 它們丟出來的例外沒有人接就是 unhandled rejection，而 Node 會直接把伺服器結束掉——
// 學生看到的是「按了沒反應，之後每顆按鈕都沒用」，網頁卻還在（Windows VM 實測 #24）。
//
// 守的是整類：下次有人再加一條 `void 某個非同步工作()` 忘了接，這題就紅。
test("controller 裡每一個 fire-and-forget 都自己接住例外", () => {
  const dir = fileURLToPath(new URL(".", import.meta.url));
  const offenders: string[] = [];

  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".ts") || entry.endsWith(".test.ts")) {
      continue;
    }

    const source = readFileSync(path.join(dir, entry), "utf8");

    for (const statement of fireAndForgetStatements(source)) {
      if (!statement.includes(".catch(")) {
        offenders.push(`${entry}: ${statement.split("\n")[0]}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `這些 fire-and-forget 沒有 .catch，例外會把伺服器帶走：\n${offenders.join("\n")}`,
  );
});

// 只認**行首**的 `void `（`: Promise<void> {` 那種型別註記不算），再靠括號配對找到整段
// 敘述的結尾——用「到下一個分號為止」會在箭頭函式的第一個分號就切斷，而 .catch 在後面。
function fireAndForgetStatements(source: string): string[] {
  const statements: string[] = [];

  for (const match of source.matchAll(/^[ \t]*void /gm)) {
    const start = match.index;
    let depth = 0;

    for (let i = start; i < source.length; i += 1) {
      const char = source[i];

      if (char === "(" || char === "{" || char === "[") {
        depth += 1;
      } else if (char === ")" || char === "}" || char === "]") {
        depth -= 1;
      } else if (char === ";" && depth === 0) {
        statements.push(source.slice(start, i + 1));
        break;
      }
    }
  }

  return statements;
}
