import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { checkAllowlist, checkHook } from "./config-check.ts";
import {
  hookCommand,
  hookRegistration,
  installAllowlist,
  installHook,
} from "./config-install.ts";

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

// ⚠️ 這一題是 #26 的正本：Windows 路徑留著反斜線的話，那串會被 bash 當跳脫序列吃掉
// （`C:\Users\Reed` → `C:UsersReed`），node 找不到檔案 → exit 1 → PreToolUse 把 exit 1
// 當「hook 出錯，放行」。畫面上一路綠燈，實際什麼都沒擋。
test("Windows 形狀的路徑會被換成正斜線，不留任何反斜線給 bash 吃掉", () => {
  assert.equal(
    hookCommand("C:\\Users\\Reed\\.claude\\hooks\\block-chained-bash.js"),
    'node "C:/Users/Reed/.claude/hooks/block-chained-bash.js"',
  );
});

// 已經裝過一輪的機器要能自己修好——「有就跳過」的話，壞掉的註冊會一直留著。
test("既有的壞註冊會被換掉，不是被當成已經裝好而跳過", async () => {
  const dir = sandbox();
  mkdirSync(dir, { recursive: true });
  const broken = `node "${path.join(dir, "hooks", "block-chained-bash.js")}"`;
  writeFileSync(
    path.join(dir, "settings.json"),
    JSON.stringify({
      hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: broken }] }] },
    }),
  );

  await drain(installHook(MATERIALS));
  const settings = readFileSync(path.join(dir, "settings.json"), "utf8");

  assert.equal(settings.split("block-chained-bash.js").length - 1, 1, "舊的沒被換掉或疊了兩份");
  assert.ok(
    settings.includes(JSON.stringify(hookCommand(path.join(dir, "hooks", "block-chained-bash.js"))).slice(1, -1)),
    "寫進去的不是這一版的指令",
  );
});

// 指到那支腳本還不夠：指令本身也要是這一版寫得出來的那一個，否則綠燈但不擋。
test("註冊指的是舊指令時算沒裝，學生按重新安裝就修好", async () => {
  const dir = sandbox();
  await drain(installHook(MATERIALS));

  const settingsFile = path.join(dir, "settings.json");
  const settings = JSON.parse(readFileSync(settingsFile, "utf8")) as Record<string, unknown>;
  const hooks = settings["hooks"] as { PreToolUse: { hooks: { command: string }[] }[] };
  // 退回舊版那種留著反斜線的寫法。
  hooks.PreToolUse[0]!.hooks[0]!.command = `node "${path.join(dir, "hooks", "block-chained-bash.js").replaceAll("/", "\\")}"`;
  writeFileSync(settingsFile, JSON.stringify(settings));

  assert.equal(await checkHook({ root: MATERIALS }), "missing");

  await drain(installHook(MATERIALS));
  assert.equal(await checkHook({ root: MATERIALS }), "ok");
});

// ⚠️ #34：matcher 賭的是「那個工具叫什麼名字」，而對不上時整條 hook 不觸發、
// 沒有任何訊息（Windows VM 上 /hooks 顯示裝好了，指令卻從來沒被擋）。範圍改由腳本
// 自己判斷「這次呼叫帶不帶指令字串」。
test("matcher 是 *，不是賭工具叫什麼名字", () => {
  assert.equal(hookRegistration("/tmp/hook.js")["matcher"], "*");
});

test("停在舊 matcher 的機器算沒裝，按重新安裝就會被換掉", async () => {
  const dir = sandbox();
  mkdirSync(dir, { recursive: true });
  const target = path.join(dir, "hooks", "block-chained-bash.js");
  writeFileSync(
    path.join(dir, "settings.json"),
    JSON.stringify({
      hooks: {
        PreToolUse: [
          // 指令是對的，只有 matcher 是舊的——這種註冊在畫面上最像「已經裝好」。
          { matcher: "Bash", hooks: [{ type: "command", command: hookCommand(target) }] },
        ],
      },
    }),
  );

  assert.equal(await checkHook({ root: MATERIALS }), "missing");

  await drain(installHook(MATERIALS));
  assert.equal(await checkHook({ root: MATERIALS }), "ok");
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
