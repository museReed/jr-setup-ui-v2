import { exec } from "node:child_process";
import { readFile } from "node:fs/promises";

import { settingsPath } from "./paths.ts";

// hook 的行為驗證：餵一條串接指令，看它擋不擋。
//
// ⚠️ 跑的是 settings.json 裡**實際註冊的那條指令**，不是我們自己拼一次路徑去叫
// 腳本。腳本本身幾乎永遠是好的——壞掉的是它被怎麼叫（路徑沒加引號、跳脫被吃掉、
// 註冊寫錯地方）。自己拼路徑等於繞過所有真正會出錯的地方，這一格於是永遠綠。
//
// 兩題都要對才算過：該擋的擋、不該擋的不擋。只驗前者的話，一個「什麼都擋」的
// 壞 hook 也會拿到綠燈。
export interface HookVerdict {
  readonly passed: boolean;
  readonly lines: readonly string[];
}

const CHAINED = "echo a && echo b";
const SAFE = "echo a";

export async function verifyHookBehavior(): Promise<HookVerdict> {
  const command = await registeredCommand();

  if (command === null) {
    return {
      passed: false,
      lines: ["settings.json 裡找不到 block-chained-bash 的註冊，先按安裝。"],
    };
  }

  const lines = [`跑註冊的那條指令：${command}`];

  const blocked = await runHook(command, CHAINED);
  lines.push(`餵「${CHAINED}」→ exit ${blocked.code}${blocked.code === 2 ? "（擋下了）" : "（沒擋）"}`);

  const allowed = await runHook(command, SAFE);
  lines.push(`餵「${SAFE}」→ exit ${allowed.code}${allowed.code === 0 ? "（放行）" : "（被擋了）"}`);

  // exit 2 才是「擋下」。exit 1 是腳本自己出錯——而 PreToolUse 把非 2 的失敗
  // 當成「hook 壞了，放行」，所以那等於沒擋。前一代整個斷點就在這裡。
  const passed = blocked.code === 2 && allowed.code === 0;
  lines.push(passed ? "兩題都對，攔截器確實生效。" : "沒有生效——照上面的 exit code 看是哪一題錯了。");

  return { passed, lines };
}

async function registeredCommand(): Promise<string | null> {
  try {
    const settings: unknown = JSON.parse(await readFile(settingsPath(), "utf8"));
    return commands(settings).find((value) => value.includes("block-chained-bash")) ?? null;
  } catch {
    return null;
  }
}

// 走整棵結構撿出所有 command 欄位。
//
// 註冊的巢狀形狀在不同版本的 Claude Code 之間變過——寫死路徑去拆會脆，而拿
// 字串正則去掃會被跳脫字元絆倒（實際踩到：Windows 路徑的引號讓正則對不上）。
function commands(node: unknown): string[] {
  if (Array.isArray(node)) {
    return node.flatMap(commands);
  }

  if (typeof node !== "object" || node === null) {
    return [];
  }

  return Object.entries(node).flatMap(([key, value]) =>
    key === "command" && typeof value === "string" ? [value] : commands(value),
  );
}

// 用 shell 跑那條字串，跟 Claude Code 叫它的方式一樣——引號與跳脫的問題只有
// 這樣才驗得到。
function runHook(command: string, bashCommand: string): Promise<{ code: number }> {
  const payload = JSON.stringify({
    tool_name: "Bash",
    tool_input: { command: bashCommand },
  });

  return new Promise((resolve) => {
    const child = exec(command, { timeout: 10_000 }, (error) => {
      resolve({ code: error === null ? 0 : (error.code ?? 1) });
    });

    child.stdin?.end(payload);
  });
}
