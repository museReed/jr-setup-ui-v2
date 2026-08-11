import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { RunEvent } from "../../usecase/ports.ts";
import { claudeDir, hookPath, settingsPath } from "./paths.ts";

// 設定檔類的安裝。跟 process-runner 那條不一樣：它們不是「跑一條指令」，是改檔案。
//
// ⚠️ 這裡寫的是使用者真正的 Claude Code 設定。三條規矩：
//   1. 動 settings.json 之前先備份（.bak.時間戳）——它可能有學生自己的內容
//   2. 只加我們那幾條，不整份覆蓋
//   3. 每一步都吐一行出來，學生看得到我們動了哪個檔
export const HOOK_FILE = "block-chained-bash.js";

// PreToolUse 的指令是**丟給 bash 跑的**，Windows 路徑不處理就會被吃掉：`C:\Users\Reed`
// 裡的 `\U` `\R` 是 bash 的跳脫序列，路徑變成 `C:UsersReed`，node 找不到檔案而以 exit 1
// 結束——而 PreToolUse 只認 exit 2 是「擋下」，**exit 1 是「hook 出錯，放行」**。於是
// hook 看起來裝好了、實際上什麼都沒擋（舊版 VM 實測 `echo a && echo b` 直接通過；v2 只
// 抄了引號那一半，Windows VM 又重演一次，#26）。
//
// 兩件都要做：反斜線換正斜線（Windows 吃正斜線），引號則讓路徑帶空白時不會斷成兩段。
export function hookCommand(target: string): string {
  return `node "${target.replaceAll("\\", "/")}"`;
}

// ⚠️ matcher 是 `*`，不是 `Bash`。
//
// 賭工具叫什麼名字就是賭一個我們沒驗過的字串：對不上的話整條 hook 不觸發，而且
// **沒有任何訊息**——Windows VM 上 `/hooks` 顯示「1 hook configured」，指令卻從來
// 沒被擋（#34）。那台的指令是被 PowerShell 包起來跑的，名字不能從 macOS 類推。
//
// 範圍改由腳本自己決定：它只在 `tool_input.command` 是字串時才動作，其他工具一律
// 放行（#30）。代價是每次工具呼叫多一支毫秒級的 node 行程，換掉一個靜默失效的單點。
export function hookRegistration(target: string): Record<string, unknown> {
  return {
    matcher: "*",
    hooks: [{ type: "command", command: hookCommand(target) }],
  };
}

export async function* installHook(
  materialsRoot: string,
): AsyncGenerator<RunEvent> {
  const source = path.join(materialsRoot, "claude-code", "hooks", "block-chained-bash.js");
  const target = hookPath();

  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
  yield line(`寫入 ${target}`);

  const settings = await loadSettings();
  const hooks = asRecord(settings["hooks"]);
  const preToolUse = Array.isArray(hooks["PreToolUse"]) ? hooks["PreToolUse"] : [];

  // ⚠️ 先把指到那支腳本的舊 hook 全部濾掉，再加新的——不是「已經有就跳過」。
  //
  // 跳過的話，一個**壞掉的**註冊會被當成好的：Windows VM 上就有一台卡在少了正斜線
  // 轉換的舊指令，改好程式碼之後它仍然是壞的，而學生按重新安裝也修不好（#26）。
  const kept = preToolUse.filter(
    (group) => !JSON.stringify(group).includes(HOOK_FILE),
  );
  kept.push(hookRegistration(target));

  hooks["PreToolUse"] = kept;
  settings["hooks"] = hooks;
  await saveSettings(settings);
  yield line(`註冊到 ${settingsPath()}`);
  yield done();
}

export async function* installAllowlist(
  materialsRoot: string,
): AsyncGenerator<RunEvent> {
  const starterPath = path.join(materialsRoot, "claude-code", "starter-allowlist.json");
  const starter = JSON.parse(await readFile(starterPath, "utf8")) as Record<string, unknown>;
  const wanted = allowRules(starter);

  const settings = await loadSettings();
  const permissions = asRecord(settings["permissions"]);
  const allow = Array.isArray(permissions["allow"])
    ? (permissions["allow"] as unknown[]).filter((r): r is string => typeof r === "string")
    : [];

  // 只加沒有的那幾條——學生機器上本來就可能有自己的規則，整份換掉會把它們洗掉。
  const added = wanted.filter((rule) => !allow.includes(rule));
  permissions["allow"] = [...allow, ...added];
  settings["permissions"] = permissions;
  await saveSettings(settings);

  yield line(`寫入 ${settingsPath()}`);
  yield line(`新增 ${added.length} 條規則，原有 ${allow.length} 條保留`);
  yield done();
}

function allowRules(doc: Record<string, unknown>): string[] {
  const permissions = asRecord(doc["permissions"]);
  const allow = permissions["allow"];
  return Array.isArray(allow) ? allow.filter((r): r is string => typeof r === "string") : [];
}

async function loadSettings(): Promise<Record<string, unknown>> {
  try {
    const text = await readFile(settingsPath(), "utf8");
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function saveSettings(settings: Record<string, unknown>): Promise<void> {
  await mkdir(claudeDir(), { recursive: true });

  // 備份放在寫入之前。學生的 settings.json 可能有他自己的東西，而我們沒有辦法
  // 事先知道那是什麼。
  try {
    const existing = await readFile(settingsPath(), "utf8");
    await writeFile(`${settingsPath()}.bak`, existing);
  } catch {
    // 本來就沒有檔案，沒有東西要備份
  }

  await writeFile(settingsPath(), `${JSON.stringify(settings, null, 2)}\n`);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function line(text: string): RunEvent {
  return { kind: "line", text, at: 0 };
}

function done(): RunEvent {
  return { kind: "exit", text: "", at: 0, exitCode: 0 };
}
