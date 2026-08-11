import { readFile } from "node:fs/promises";
import path from "node:path";

import type { CheckStatus } from "../../domain/check.ts";
import { hookRegistration, starterRules } from "./config-install.ts";
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
  const settings = await readJson(settingsPath());

  if (settings === null) {
    return "missing";
  }

  // 要哪幾條由平台決定（Windows 多一份 PowerShell 的）——問的必須跟裝的是同一份，
  // 不然 Windows 上會裝了 PowerShell 那批卻不檢查它們。
  const wanted = await starterRules(materials.root, process.platform);
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

  // ⚠️ 不能只問「有沒有一條指到那支腳本」。Windows VM 上就有一台指到了、卻是少了
  // 正斜線轉換的舊指令——hook 一跑就 exit 1，而 PreToolUse 把 exit 1 當「出錯，放行」
  // （#26）。那種註冊在畫面上是綠的，實際什麼都沒擋。
  //
  // 所以認的是**現在這一版會寫出來的那一整條註冊**（含 matcher）：對不上就算沒裝，
  // 學生按重新安裝就修好。matcher 也要比——它從 `Bash` 改成 `*` 過一次，而舊的那個
  // 值在 Windows 上等於整條不觸發（#34）。
  //
  // 註冊的形狀在不同版本之間變過，逐層拆結構很脆——兩邊都由同一個函式序列化，
  // 比字串反而穩。
  const wanted = JSON.stringify(hookRegistration(hookPath()));
  return JSON.stringify(settings["hooks"] ?? {}).includes(wanted);
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
