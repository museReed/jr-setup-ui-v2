import { spawn } from "node:child_process";
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { TerminalOpener } from "../../usecase/ports.ts";
import type { FakeEnv } from "./fake-env.ts";

// 開真的終端視窗，等它跑完才 resolve。
//
// 「等它跑完」不是等 spawn 回來——`open` 與 `cmd start` 把視窗交出去就立刻結束了，
// 那時學生連畫面都還沒看到。所以腳本跑完會寫一個記號檔，這裡等那個檔出現。
const MARKER_TIMEOUT_MS = 180_000;

// 白名單那題要等的是 AI 跑完四條指令，比「看一眼版本號按 Enter」久得多。
const ALLOWLIST_TIMEOUT_MS = 240_000;

// 白名單那題要 AI 寫進副產物的字串。
//
// 固定值就夠——這一格要抓的是「白名單有沒有生效」，不是防作弊。而它要夠特別，
// 不能是模型憑印象也寫得出來的字。
const ALLOWLIST_TOKEN = "allowlist-ok-9d4b71";

export function createTerminalOpener(fake: FakeEnv | null): TerminalOpener {
  return {
    async open(action, signal) {
      // 已經取消了就別開視窗。取消與按下之間只有幾百毫秒，但那幾百毫秒開出去的
      // 視窗會活下來——學生取消了卻多一個視窗跳出來，比沒取消還糟。
      if (signal?.aborted === true) {
        return { completed: false };
      }

      if (action === "verify-claude") {
        return openClaudeVerify(fake, signal);
      }

      if (action === "verify-allowlist") {
        return openAllowlistVerify(signal);
      }

      throw new Error(`不認得的終端動作：${action}`);
    },
  };
}

async function openClaudeVerify(
  fake: FakeEnv | null,
  signal?: AbortSignal,
): Promise<{ completed: boolean }> {
  const stamp = `${process.pid}-${counter()}`;
  const marker = path.join(tmpdir(), `jr-verify-${stamp}.done`);
  const launcher = writeLauncher(stamp, marker);

  const { cmd, args } = openCommand(launcher);
  spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();

  const completed = await waitUntil(() => existsSync(marker), MARKER_TIMEOUT_MS, signal);

  // 假環境下沒有真的 claude 可跑，但畫面要能走完整條路：學生確實把視窗走完了，
  // 就把那兩格推到 ok，讓重新探測拿得到新狀態。
  if (completed && fake !== null) {
    fake.set("claude", "ok");
    fake.set("claude-auth", "ok");
  }

  rmSync(launcher, { force: true });
  rmSync(marker, { force: true });

  return { completed };
}

// 白名單那一列的行為驗證。它跟攔截器是同一張卡的兩半，方向相反：
//
//   攔截器    危險的指令一定要被擋下來
//   白名單    安全的指令一定不能再問
//
// 結構檢查只數得出「settings.json 裡有 39 條規則」——那證明得了檔案寫對，證明不了
// Claude Code 真的照著做。所以這裡開一個真的 claude session 叫它跑幾條指令。
//
// 題目不是「把 39 條都跑一遍」。規則字串對不對是結構問題（checkAllowlist 已經逐條
// 比對過了）；這裡要證明的是「它真的讀了那個檔並照著做」，而那是一個開關。該覆蓋的
// 是幾種**形狀不同**的規則，那些才可能各自壞掉：單字前綴（echo）、完全精確沒有萬用
// 字元（pwd）、兩字前綴（git status）、非 Bash 工具帶 specifier（WebFetch）。
//
// WebSearch 那條刻意不驗（舊版 Reed 指定）：它在部分地區用不了，驗它等於在那些地區
// 製造一個永遠紅的燈。會改東西的（mkdir / git commit）與機器上不一定有的（jq / tree）
// 也不跑——它們失敗的原因跟白名單無關，而學生只會看到一個紅燈。
async function openAllowlistVerify(signal?: AbortSignal): Promise<{ completed: boolean }> {
  const stamp = `${process.pid}-${counter()}`;
  // 落在 tmpdir 是刻意的：那個目錄一定存在。要模型自己去建目錄的話，Windows 上
  // New-Item 不在白名單裡（那 39 條全是 Bash(...)），第一步就跳提示卡死。
  const resultFile = path.join(tmpdir(), `jr-verify-allowlist-${stamp}.txt`);
  const launcher = writeAllowlistLauncher(stamp, resultFile);

  const { cmd, args } = openCommand(launcher);
  spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();

  // 「跑完」的定義是副產物裡出現那個 token，不是視窗關掉。
  //
  // ⚠️ token 代表的是「四步全部都沒被問」這個結論，不是「echo 跑過了」的副產物
  // ——寫成後者的話只驗得到第一條，後面幾種形狀壞掉也一樣綠。
  const completed = await waitUntil(
    () => readIfExists(resultFile).includes(ALLOWLIST_TOKEN),
    ALLOWLIST_TIMEOUT_MS,
    signal,
  );

  rmSync(launcher, { force: true });
  rmSync(resultFile, { force: true });

  return { completed };
}

// 兩個設計上的關鍵，改題目時不要順手拿掉：
//
// 一、「跳了提示就不要按允許」。少了它這題會變成假驗證：學生按了允許 → 指令照樣跑
//     → 檔案裡照樣有 token → 通過，而白名單其實沒生效。
// 二、第 3 步跑出錯誤也算跑過。這一題看的是有沒有被擋，不是指令成不成功。
function allowlistPrompt(resultFile: string): string {
  return (
    "請依序做這四件事，一件都不要跳過：" +
    `1) 執行 echo ${ALLOWLIST_TOKEN}　2) 執行 pwd　3) 執行 git status　` +
    "4) 用 WebFetch 讀 https://raw.githubusercontent.com/museReed/jr-setup-ui/main/README.md。" +
    "第 3 步跑出「不是 git 儲存庫」之類的錯誤也算跑過——這一題看的是有沒有被擋，不是成不成功。" +
    "如果其中任何一步跳出要你允許的提示，不要按允許，" +
    `把那一步的編號與提示原文寫進 ${resultFile} 就停下來。` +
    `四步全部都沒有跳提示的話，把 ${ALLOWLIST_TOKEN} 寫進 ${resultFile}。` +
    "（那個檔案的資料夾已經存在，直接寫檔就好，不要先建立目錄。）"
  );
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

// 開出去的 claude 一律指定 acceptEdits，不吃學生機器上的預設模式。
//
// ⚠️ 這不是繞過驗證，而是這一題成立的前提：最後一步要 AI 把 token 寫進副產物檔，
// 那是一次 Write。預設模式會為它跳提示（而題目叫學生不要按允許），「不要問我」那種
// 模式更糟——它直接拒絕，於是副產物永遠不會出現、每次都判成沒過。
//
// acceptEdits 只自動放行「改檔案」，Bash 與 WebFetch 該不該問仍然由 settings.json
// 的白名單決定——也就是這一題真正要量的那件事，沒有被這個旗標蓋掉。
const CLAUDE_ACCEPT_EDITS = "--permission-mode acceptEdits";

// 白名單那題的視窗：把提問交給 claude，人只要看著。
//
// ⚠️ 提問裡不要出現單引號——它會被包在 '...' 裡送給 shell，一個單引號就把整句剖開。
function writeAllowlistLauncher(stamp: string, resultFile: string): string {
  const prompt = allowlistPrompt(resultFile);
  const watch = "看它跑那四件事，你不需要輸入任何東西。任何一步跳出「要不要允許」都不要按允許。";

  if (process.platform === "win32") {
    const file = path.join(tmpdir(), `jr-verify-allowlist-${stamp}.ps1`);
    const ps = [
      'Write-Host "===== 驗證常用指令白名單 ====="',
      `Write-Host "${watch}"`,
      `claude ${CLAUDE_ACCEPT_EDITS} '${prompt}'`,
    ].join("\n");
    // PowerShell 5.1 沒有 BOM 就當系統 ANSI 讀，中文變亂碼——而亂碼字元可能剛好
    // 破壞字串引號，整支腳本連 parse 都過不了。
    writeFileSync(file, `﻿${ps}\n`, "utf8");
    return file;
  }

  const file = path.join(tmpdir(), `jr-verify-allowlist-${stamp}.command`);
  const body = [
    'echo "===== 驗證常用指令白名單 ====="',
    'echo ""',
    `echo "${watch}"`,
    'echo ""',
    // ⚠️ `command` 不能省。-i 會讀學生的 ~/.zshrc，而那裡很可能有一個叫 claude 的
    // 包裝函式（我們自己的 tab-sync 就會裝一個，Reed 機器上是 myclaude）——包裝
    // 函式會把我們加的旗標吃掉，實測到的樣子是行程參數裡完全沒有
    // --permission-mode。-i 得留著（claude 裝在 ~/.local/bin，PATH 靠 .zshrc 補），
    // 所以只能在這一次呼叫上繞過包裝。
    `command claude ${CLAUDE_ACCEPT_EDITS} '${prompt}'`,
  ];
  writeFileSync(file, `#!/bin/zsh -i\n${body.join("\n")}\n`);
  chmodSync(file, 0o755);
  return file;
}

function readIfExists(file: string): string {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
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

async function waitUntil(
  done: () => boolean,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (done()) {
      return true;
    }

    // 取消跟逾時的結論一樣（沒走完），差別只在學生等多久才拿回按鈕。
    if (signal?.aborted === true) {
      return false;
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
