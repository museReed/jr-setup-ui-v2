import { spawn } from "node:child_process";
import { chmodSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { TerminalOpener } from "../../usecase/ports.ts";
import type { FakeEnv } from "./fake-env.ts";

// 開真的終端視窗，等它跑完才 resolve。
//
// 「等它跑完」不是等 spawn 回來——`open` 與 `cmd start` 把視窗交出去就立刻結束了，
// 那時學生連畫面都還沒看到。所以腳本跑完會寫一個記號檔，這裡等那個檔出現。
const MARKER_TIMEOUT_MS = 180_000;

export function createTerminalOpener(fake: FakeEnv | null): TerminalOpener {
  return {
    async open(action) {
      if (action !== "verify-claude") {
        throw new Error(`不認得的終端動作：${action}`);
      }

      const stamp = `${process.pid}-${counter()}`;
      const marker = path.join(tmpdir(), `jr-verify-${stamp}.done`);
      const launcher = writeLauncher(stamp, marker);

      const { cmd, args } = openCommand(launcher);
      spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();

      const finished = await waitForMarker(marker);

      // 假環境下沒有真的 claude 可跑，但畫面要能走完整條路：視窗確實開了、學生
      // 確實看完關掉了，就把那兩格推到 ok，讓重新探測拿得到新狀態。
      if (finished && fake !== null) {
        fake.set("claude", "ok");
        fake.set("claude-auth", "ok");
      }

      rmSync(launcher, { force: true });
      rmSync(marker, { force: true });
    },
  };
}

// ⚠️ 不要把指令直接塞進 open / wt.exe 的參數：那一串會經過兩三層 shell，引號規則
// 各不相同，中文一過去就散了。寫成檔案之後只剩「執行這個檔」一件事。
function writeLauncher(stamp: string, marker: string): string {
  const body = [
    'echo "===== 驗證 Claude Code ====="',
    'echo ""',
    "claude --version",
    'echo ""',
    'echo "看到版本號就表示 CLI 真的跑得起來。"',
    'echo "確認完按 Enter 關掉這個視窗，網頁上那一格會跟著變綠。"',
    "read -r _",
  ];

  if (process.platform === "win32") {
    const file = path.join(tmpdir(), `jr-verify-${stamp}.ps1`);
    const ps = [
      'Write-Host "===== 驗證 Claude Code ====="',
      "claude --version",
      'Write-Host "確認完按 Enter 關掉這個視窗，網頁上那一格會跟著變綠。"',
      "Read-Host",
      `Set-Content -LiteralPath '${marker}' -Value 'done'`,
    ].join("\n");
    // PowerShell 5.1 沒有 BOM 就當系統 ANSI 讀，中文變亂碼——而亂碼字元可能剛好
    // 破壞字串引號，整支腳本連 parse 都過不了。BOM 用逃脫寫法，不放字元本身。
    writeFileSync(file, `﻿${ps}\n`, "utf8");
    return file;
  }

  const file = path.join(tmpdir(), `jr-verify-${stamp}.command`);
  // -i 讓 zsh 讀 ~/.zshrc，學生在這個視窗看到的行為才跟他平常的終端一樣。
  writeFileSync(
    file,
    `#!/bin/zsh -i\n${body.join("\n")}\necho done > '${marker}'\n`,
  );
  chmodSync(file, 0o755);
  return file;
}

function openCommand(launcher: string): { cmd: string; args: string[] } {
  if (process.platform === "win32") {
    return {
      cmd: "cmd.exe",
      args: [
        "/c",
        "start",
        "",
        "wt.exe",
        "powershell.exe",
        "-NoExit",
        // Windows 預設執行原則是 Restricted，新視窗會直接紅字 "running scripts is
        // disabled"，而這邊看到的 exit code 還是 0（cmd start 一開完就回來了）。
        // Bypass 只影響這一個行程，不動機器設定。
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        launcher,
      ],
    };
  }

  return { cmd: "open", args: [launcher] };
}

async function waitForMarker(marker: string): Promise<boolean> {
  const deadline = Date.now() + MARKER_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (existsSync(marker)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  return false;
}

let seq = 0;

function counter(): number {
  seq += 1;
  return seq;
}
