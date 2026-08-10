import { readFile } from "node:fs/promises";
import path from "node:path";

import type { CheckStatus } from "../../domain/check.ts";
import { hookPath, settingsPath } from "./paths.ts";

// 設定檔類的檢查。
//
// ⚠️ 「檔案在不在」不夠，要「內容跟這一版一樣」而且「真的註冊上去了」。
// 前一代的四個斷點全都發生在檔案存在、註冊存在的情況下——壞掉的是它被怎麼叫。
// 這一層只回答結構那一問，行為那一問留給開終端的驗證。
export interface ConfigMaterials {
  readonly root: string;
}

export async function checkHook(materials: ConfigMaterials): Promise<CheckStatus> {
  const wanted = await readText(
    path.join(materials.root, "claude-code", "hooks", "block-chained-bash.js"),
  );
  const installed = await readText(hookPath());

  if (installed === null) {
    return "missing";
  }

  // 內容不同代表裝的是上一輪工作坊的舊版。它跑得起來，只是行為不是這一版的——
  // 那正是「綠燈但不生效」最常見的來源，所以算 missing 而不是 ok。
  if (wanted !== null && installed.trim() !== wanted.trim()) {
    return "missing";
  }

  return (await hookRegistered()) ? "ok" : "missing";
}

export async function checkAllowlist(
  materials: ConfigMaterials,
): Promise<CheckStatus> {
  const starter = await readJson(
    path.join(materials.root, "claude-code", "starter-allowlist.json"),
  );
  const settings = await readJson(settingsPath());

  if (starter === null || settings === null) {
    return "missing";
  }

  const wanted = rules(starter);
  const have = new Set(rules(settings));

  // 少一條就算沒裝完。逐條比對而不是「有沒有 permissions 這個欄位」——學生機器上
  // 本來就可能有自己的規則，我們要問的是「我們發的那幾條在不在」。
  return wanted.length > 0 && wanted.every((rule) => have.has(rule)) ? "ok" : "missing";
}

// 白名單規則同時可能寫在兩種形狀裡（頂層 permissions，或 settings.permissions）。
// 兩邊都看——前一代實測遇過裝在不同版本的 Claude Code 上落點不同。
function rules(doc: Record<string, unknown>): string[] {
  const permissions = doc["permissions"];

  if (typeof permissions !== "object" || permissions === null) {
    return [];
  }

  const allow = (permissions as Record<string, unknown>)["allow"];
  return Array.isArray(allow) ? allow.filter((rule): rule is string => typeof rule === "string") : [];
}

async function hookRegistered(): Promise<boolean> {
  const settings = await readJson(settingsPath());

  if (settings === null) {
    return false;
  }

  // 只問「有沒有一條 PreToolUse 指到我們那支腳本」。註冊的形狀在不同版本之間變過，
  // 逐層拆結構會很脆——轉成字串找路徑反而穩。
  return JSON.stringify(settings["hooks"] ?? {}).includes("block-chained-bash.js");
}

async function readText(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

async function readJson(file: string): Promise<Record<string, unknown> | null> {
  const text = await readText(file);

  if (text === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    // 設定檔壞掉不能當成「沒裝」靜靜過去——但這一層只能回狀態，所以回 missing，
    // 安裝那一步會重寫它並且把原檔備份。
    return null;
  }
}
