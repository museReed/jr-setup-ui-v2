import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { K } from "../domain/copy-keys.ts";
import { FULLSCREEN_PROOF } from "../domain/cards/claude-code.ts";
import { FULLSCREEN_PROMPT } from "../adapter/server/terminal-opener.ts";
import { en } from "./en.ts";
import { zhCN } from "./zh-CN.ts";
import { zhTW } from "./zh-TW.ts";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 漏翻會被型別擋下（Record<MessageKey, string> 不是 Partial），多翻也會被擋
// （物件字面值的多餘屬性是錯誤）。但**孤兒代號**兩者都擋不到：定義了、翻譯了、
// 就是沒有人用。那種東西會一直躺在翻譯檔裡，每加一個語言就要多翻一次。
test("每個代號都真的被用到（沒有孤兒）", () => {
  const source = sourceFiles(SRC)
    .filter((file) => !file.endsWith("copy-keys.ts"))
    .filter((file) => !file.includes(`${path.sep}copy${path.sep}`))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

  const unused = keyPaths(K).filter((usage) => !source.includes(usage));

  assert.deepEqual(
    unused,
    [],
    `這些代號定義了但沒有人用，刪掉它們或把它們接上：\n${unused.join("\n")}`,
  );
});

// 型別已經守住這件事，這條測試是second opinion：有人把型別放寬成 Partial 或加了
// 索引簽章時，這裡會先紅。
test("三個語言的代號集合完全一樣", () => {
  const tw = Object.keys(zhTW).sort();

  assert.deepEqual(Object.keys(zhCN).sort(), tw);
  assert.deepEqual(Object.keys(en).sort(), tw);
});

test("送進終端的提示詞由 expected 常數組成", () => {
  assert.equal(
    FULLSCREEN_PROMPT,
    `請原樣印出這一行，不要加任何說明：${FULLSCREEN_PROOF}`,
  );
});

// 把 K 走成 ["K.card.claude", "K.check.claude", …]——比對的是**程式碼裡怎麼寫**，
// 不是代號的值。寫 K.card.claude 才算用到，直接寫字串 "card.claude" 不算（那正是
// 我們不想要的用法）。
function keyPaths(node: unknown, prefix = "K"): string[] {
  if (typeof node === "string") {
    return [prefix];
  }

  return Object.entries(node as Record<string, unknown>).flatMap(([name, child]) =>
    keyPaths(child, `${prefix}.${name}`),
  );
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);

    if (statSync(full).isDirectory()) {
      return entry === "vendor" ? [] : sourceFiles(full);
    }

    return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });
}
