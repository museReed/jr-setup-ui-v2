import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { checkAllowlist, checkHook } from "./config-check.ts";
import { installAllowlist, installHook } from "./config-install.ts";

const MATERIALS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../materials",
);

// ⚠️ 每條測試都把 JR_CLAUDE_DIR 指到自己的暫存目錄。少了這一步，跑一次測試就會
// 改掉開發者真正的 ~/.claude/settings.json——而那種事出錯時是安靜的。
function sandbox(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "jr-claude-"));
  process.env.JR_CLAUDE_DIR = dir;
  return dir;
}

async function drain(events: AsyncGenerator<{ text: string }>): Promise<string[]> {
  const lines: string[] = [];

  for await (const event of events) {
    lines.push(event.text);
  }

  return lines;
}

test("裝 hook：寫檔＋註冊，裝完檢查才會是 ok", async () => {
  sandbox();

  assert.equal(await checkHook({ root: MATERIALS }), "missing");
  await drain(installHook(MATERIALS));
  assert.equal(await checkHook({ root: MATERIALS }), "ok");
});

// 註冊的指令一定要有引號：Windows 上 C:\Users\Reed 的 \U \R 會被 bash 當跳脫吃掉，
// node 找不到檔案 → exit 1 → PreToolUse 把 exit 1 當「hook 出錯，放行」。
test("hook 的註冊指令有把路徑包引號", async () => {
  const dir = sandbox();

  await drain(installHook(MATERIALS));
  const settings = readFileSync(path.join(dir, "settings.json"), "utf8");

  assert.match(settings, /node \\"[^"]*block-chained-bash\.js\\"/);
});

test("重裝不會重複註冊", async () => {
  const dir = sandbox();

  await drain(installHook(MATERIALS));
  await drain(installHook(MATERIALS));
  const settings = readFileSync(path.join(dir, "settings.json"), "utf8");

  assert.equal(settings.split("block-chained-bash.js").length - 1, 1);
});

// 檔案在、註冊在，但內容是上一輪工作坊的舊版——它跑得起來，只是行為不是這一版的。
// 那正是「綠燈但不生效」最常見的來源。
test("裝的是舊版時算沒裝", async () => {
  const dir = sandbox();

  await drain(installHook(MATERIALS));
  writeFileSync(path.join(dir, "hooks", "block-chained-bash.js"), "// 上一輪的舊版\n");

  assert.equal(await checkHook({ root: MATERIALS }), "missing");
});

test("裝白名單：只加沒有的，學生自己的規則保留", async () => {
  const dir = sandbox();
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "settings.json"),
    JSON.stringify({ permissions: { allow: ["Bash(mine:*)"] } }),
  );

  assert.equal(await checkAllowlist({ root: MATERIALS }), "missing");
  await drain(installAllowlist(MATERIALS));

  const settings = JSON.parse(readFileSync(path.join(dir, "settings.json"), "utf8")) as {
    permissions: { allow: string[] };
  };

  assert.ok(settings.permissions.allow.includes("Bash(mine:*)"), "學生自己的規則被洗掉了");
  assert.equal(await checkAllowlist({ root: MATERIALS }), "ok");
});

test("動 settings.json 之前先備份", async () => {
  const dir = sandbox();
  writeFileSync(path.join(dir, "settings.json"), '{"mine":true}');

  await drain(installAllowlist(MATERIALS));

  assert.match(readFileSync(path.join(dir, "settings.json.bak"), "utf8"), /"mine"/);
});
