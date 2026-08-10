#!/usr/bin/env node
// 「它什麼時候該停下來問你」那張卡的手動試跑。
//
// ⚠️ 一律跑在暫存目錄，不碰你真正的 ~/.claude。這支腳本存在的理由就是讓你能
// 親眼看到它寫了什麼，而不用拿自己的設定去賭。
//
//   node scripts/try-guardrails.mjs
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MATERIALS = path.resolve(HERE, "../materials");

const dir = mkdtempSync(path.join(tmpdir(), "jr-try-"));
process.env.JR_CLAUDE_DIR = dir;

const { checkAllowlist, checkHook } = await import("../src/adapter/server/config-check.ts");
const { installAllowlist, installHook } = await import(
  "../src/adapter/server/config-install.ts"
);
const { verifyHookBehavior } = await import("../src/adapter/server/verify-hook.ts");

const materials = { root: MATERIALS };

async function run(events) {
  for await (const event of events) {
    if (event.text !== "") console.log(`   ${event.text}`);
  }
}

console.log(`沙箱：${dir}\n`);

console.log("① 裝之前的狀態");
console.log(`   hook      → ${await checkHook(materials)}`);
console.log(`   allowlist → ${await checkAllowlist(materials)}\n`);

console.log("② 裝 hook");
await run(installHook(MATERIALS));
console.log("");

console.log("③ 裝 allowlist");
await run(installAllowlist(MATERIALS));
console.log("");

console.log("④ 裝完的狀態");
console.log(`   hook      → ${await checkHook(materials)}`);
console.log(`   allowlist → ${await checkAllowlist(materials)}\n`);

console.log("⑤ 行為驗證（跑實際註冊的那條指令）");
const verdict = await verifyHookBehavior();
for (const line of verdict.lines) console.log(`   ${line}`);
console.log(`   → ${verdict.passed ? "通過" : "沒過"}\n`);

console.log("⑥ 它寫出來的 settings.json");
console.log(readFileSync(path.join(dir, "settings.json"), "utf8"));
