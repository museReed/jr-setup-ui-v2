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

  // 路徑一定要有引號：Windows 上 `C:\\Users\\Reed` 的 \\U \\R 會被 bash 當跳脫吃掉，
  // node 找不到檔案 → exit 1 → PreToolUse 把 exit 1 當「hook 出錯，放行」。
  // 前一代就是這樣「裝好了、綠燈、就是不擋」。
  const command = `node "${target}"`;
  const already = JSON.stringify(preToolUse).includes("block-chained-bash.js");

  if (!already) {
    preToolUse.push({
      matcher: "Bash",
      hooks: [{ type: "command", command }],
    });
  }

  hooks["PreToolUse"] = preToolUse;
  settings["hooks"] = hooks;
  await saveSettings(settings);
  yield line(already ? "註冊已存在，沒有重複加入" : `註冊到 ${settingsPath()}`);
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
