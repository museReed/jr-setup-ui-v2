import { spawn } from "node:child_process";
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { FULLSCREEN_PROOF } from "../../domain/cards/claude-code.ts";
import type { TerminalOpener } from "../../usecase/ports.ts";
import type { FakeEnv } from "./fake-env.ts";
import { spawnEnv } from "./spawn-env.ts";

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

export const FULLSCREEN_PROMPT =
  `請原樣印出這一行，不要加任何說明：${FULLSCREEN_PROOF}`;

type VerifyCli = "claude" | "codex";

// verify 要等一個結論；這兩顆只是幫學生把工作視窗開起來。沿用 verify 的等待會讓
// 學生留在視窗裡操作時，網頁上每顆按鈕灰掉三分鐘。
export async function openWindow(action: string): Promise<void> {
  if (action !== "fullscreen-open" && action !== "fullscreen-proof") {
    throw new Error(`不認得的開窗動作：${action}`);
  }

  const stamp = `${process.pid}-${counter()}`;
  const launcher = writeFullscreenLauncher(action, stamp);
  await openDetached(launcher);
}

export function createTerminalOpener(fake: FakeEnv | null): TerminalOpener {
  return {
    async open(action, signal) {
      // 已經取消了就別開視窗。取消與按下之間只有幾百毫秒，但那幾百毫秒開出去的
      // 視窗會活下來——學生取消了卻多一個視窗跳出來，比沒取消還糟。
      if (signal?.aborted === true) {
        return { completed: false };
      }

      if (action === "verify-claude" || action === "verify-codex") {
        return openCliVerify(
          action === "verify-claude" ? "claude" : "codex",
          fake,
          signal,
        );
      }

      if (action === "verify-allowlist") {
        return openArtifactVerify(ALLOWLIST_CASE, signal);
      }

      if (action === "verify-hook") {
        return openArtifactVerify(HOOK_CASE, signal);
      }

      throw new Error(`不認得的終端動作：${action}`);
    },
  };
}

async function openCliVerify(
  cli: VerifyCli,
  fake: FakeEnv | null,
  signal?: AbortSignal,
): Promise<{ completed: boolean }> {
  const stamp = `${process.pid}-${counter()}`;
  const marker = path.join(tmpdir(), `jr-verify-${stamp}.done`);
  const launcher = writeLauncher(cli, stamp, marker);

  await openDetached(launcher);

  const completed = await waitUntil(() => existsSync(marker), MARKER_TIMEOUT_MS, signal);

  // 假環境下沒有真的 CLI 可跑，但畫面要能走完整條路：學生確實把視窗走完了，
  // 就把這張卡的兩格推到 ok，讓重新探測拿得到新狀態。
  if (completed && fake !== null) {
    fake.set(cli, "ok");
    fake.set(`${cli}-auth`, "ok");
  }

  removeQuietly(launcher);
  removeQuietly(marker);

  return { completed };
}

// 一道「叫真的 claude 做一件事，看它留下什麼」的驗證題。
//
// 兩張卡的兩格共用同一個形狀：開一個真的 claude session、給它一道題、等副產物檔
// 裡出現預期的字。差別只在題目與要找的字。
interface ArtifactCase {
  // 檔名前綴，也是這一題的名字。
  readonly id: string;
  readonly title: string;
  // 學生在那個視窗裡該看什麼。他不用動手，但要知道自己在看什麼。
  readonly watchFor: string;
  readonly prompt: (resultFile: string) => string;
  // 副產物裡出現這個字才算過。
  readonly keyword: string;
  readonly timeoutMs: number;
}

// 每一題都要附這句。
//
// 少了它模型會防禦性地先跑一次「建立那個資料夾」——而那一步在 Windows 上撞權限牆
//（New-Item 不在白名單裡，那 39 條全是 Bash(...) 的名字），跳出「要不要允許」。學生
// 按了拒絕，整條驗證就斷在那裡，結果檔永遠不會出現（舊版 Windows VM 實測）。
const RESULT_DIR_NOTE = "（那個檔案的資料夾已經存在，直接寫檔就好，不要先建立目錄。）";

// 攔截器那一列：危險的指令一定要被擋下來。
//
// ⚠️ 這一題不能用「我們自己跑那支 hook 腳本、讀 exit code」代替。那只證明得了腳本
// 會擋，而腳本本身幾乎永遠是好的；真正會壞的是 Claude Code 到底有沒有載入它
//（settings.json 路徑寫錯、裝完沒重開），那只有在真的 claude 裡才看得見。
//
// 判定看的是**副產物裡有沒有 hook 的原文**，不是「AI 有沒有把指令拆成兩次跑」——
// 模型可能因為自己的規則就拆開，那樣看起來也像有效果，但 hook 其實沒動。
const HOOK_CASE: ArtifactCase = {
  id: "hook",
  title: "驗證「一次只跑一個指令」的攔截器",
  watchFor: "看它跑那條串接指令，你不需要輸入任何東西。畫面上應該跳出中文的攔截訊息。",
  prompt: (resultFile) =>
    "請執行這條指令：echo a && echo b。" +
    `不管成功或被擋，都把你收到的完整訊息一字不改寫進 ${resultFile}。` +
    RESULT_DIR_NOTE,
  keyword: "一次只跑一個指令",
  timeoutMs: 180_000,
};

// 白名單那一列。它跟攔截器是同一張卡的兩半，方向相反：
//
//   攔截器    危險的指令一定要被擋下來
//   白名單    安全的指令一定不能再問
//
// 題目不是「把 39 條都跑一遍」。規則字串對不對是結構問題（checkAllowlist 已經逐條
// 比對過了）；這裡要證明的是「它真的讀了那個檔並照著做」，而那是一個開關。該覆蓋的
// 是幾種**形狀不同**的規則，那些才可能各自壞掉：單字前綴（echo）、完全精確沒有萬用
// 字元（pwd）、兩字前綴（git status）、非 Bash 工具帶 specifier（WebFetch）。
//
// WebSearch 那條刻意不驗（舊版 Reed 指定）：它在部分地區用不了，驗它等於在那些地區
// 製造一個永遠紅的燈。會改東西的（mkdir / git commit）與機器上不一定有的（jq / tree）
// 也不跑——它們失敗的原因跟白名單無關，而學生只會看到一個紅燈。
//
// 兩個設計上的關鍵，改題目時不要順手拿掉：
//
// 一、「跳了提示就不要按允許」。少了它這題會變成假驗證：學生按了允許 → 指令照樣跑
//     → 檔案裡照樣有 token → 通過，而白名單其實沒生效。
// 二、token 是「全部都沒被問」的結論，不是「echo 跑過了」的副產物。寫成後者的話只
//     驗得到第一條，後面幾種形狀壞掉也一樣綠。
const ALLOWLIST_CASE: ArtifactCase = {
  id: "allowlist",
  title: "驗證常用指令白名單",
  watchFor: "看它跑那四件事，你不需要輸入任何東西。任何一步跳出「要不要允許」都不要按允許。",
  prompt: (resultFile) =>
    "請依序做這四件事，一件都不要跳過：" +
    `1) 執行 echo ${ALLOWLIST_TOKEN}　2) 執行 pwd　3) 執行 git status　` +
    "4) 用 WebFetch 讀 https://raw.githubusercontent.com/museReed/jr-setup-ui/main/README.md。" +
    "第 3 步跑出「不是 git 儲存庫」之類的錯誤也算跑過——這一題看的是有沒有被擋，不是成不成功。" +
    "如果其中任何一步跳出要你允許的提示，不要按允許，" +
    `把那一步的編號與提示原文寫進 ${resultFile} 就停下來。` +
    `四步全部都沒有跳提示的話，把 ${ALLOWLIST_TOKEN} 寫進 ${resultFile}。` +
    RESULT_DIR_NOTE,
  keyword: ALLOWLIST_TOKEN,
  timeoutMs: 240_000,
};

async function openArtifactVerify(
  spec: ArtifactCase,
  signal?: AbortSignal,
): Promise<{ completed: boolean }> {
  const stamp = `${process.pid}-${counter()}`;
  // 落在 tmpdir 是刻意的：那個目錄一定存在（見 RESULT_DIR_NOTE）。
  const resultFile = path.join(tmpdir(), `jr-verify-${spec.id}-${stamp}.txt`);
  const launcher = writeAskClaudeLauncher(spec, stamp, resultFile);

  await openDetached(launcher);

  // 「跑完」的定義是副產物裡出現預期的字，不是視窗被關掉。
  const completed = await waitUntil(
    () => readIfExists(resultFile).includes(spec.keyword),
    spec.timeoutMs,
    signal,
  );

  removeQuietly(launcher);
  removeQuietly(resultFile);

  return { completed };
}

// ⚠️ 不要把指令直接塞進 open / wt.exe 的參數：那一串會經過兩三層 shell，引號規則
// 各不相同，中文一過去就散了。寫成檔案之後只剩「執行這個檔」一件事。
export function writeLauncher(
  cli: VerifyCli,
  stamp: string,
  marker: string,
  platform: NodeJS.Platform = process.platform,
): string {
  const title = cli === "claude" ? "Claude Code" : "Codex CLI";
  const body = [
    `echo "===== 驗證 ${title} ====="`,
    'echo ""',
    // ⚠️ 這裡**不要**加 `command`。這一格問的是「在你自己的終端機裡打得動嗎」，
    // 而 shell 設定檔裡一個同名包裝函式就能把裝好的執行檔整個蓋掉——`command`
    // 剛好會繞過它，把這一格唯一抓得到的失敗變成看不見。
    // （writeAskClaudeLauncher 那邊要 `command` 是另一回事：那裡怕的是包裝函式
    // 把我們加的旗標吃掉。）
    `${cli} --version`,
    'echo ""',
    'echo "看到版本號就表示 CLI 真的跑得起來。"',
    'echo "確認完按 Enter 關掉這個視窗，網頁上那一格會跟著變綠。"',
    "read -r _",
  ];

  if (platform === "win32") {
    const file = path.join(tmpdir(), `jr-verify-${stamp}.ps1`);
    const ps = [
      `Write-Host "===== 驗證 ${title} ====="`,
      `${cli} --version`,
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

// 把提問交給 claude 的那種視窗：人只要看著。
//
// ⚠️ 提問裡不要出現單引號——它會被包在 '...' 裡送給 shell，一個單引號就把整句剖開。
function writeAskClaudeLauncher(
  spec: ArtifactCase,
  stamp: string,
  resultFile: string,
): string {
  const prompt = spec.prompt(resultFile);
  const watch = spec.watchFor;

  if (process.platform === "win32") {
    const file = path.join(tmpdir(), `jr-verify-${spec.id}-${stamp}.ps1`);
    const ps = [
      `Write-Host "===== ${spec.title} ====="`,
      `Write-Host "${watch}"`,
      `claude ${CLAUDE_ACCEPT_EDITS} '${prompt}'`,
    ].join("\n");
    // PowerShell 5.1 沒有 BOM 就當系統 ANSI 讀，中文變亂碼——而亂碼字元可能剛好
    // 破壞字串引號，整支腳本連 parse 都過不了。
    writeFileSync(file, `﻿${ps}\n`, "utf8");
    return file;
  }

  const file = path.join(tmpdir(), `jr-verify-${spec.id}-${stamp}.command`);
  const body = [
    `echo "===== ${spec.title} ====="`,
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

function writeFullscreenLauncher(
  action: "fullscreen-open" | "fullscreen-proof",
  stamp: string,
): string {
  const prompt = action === "fullscreen-proof" ? ` '${FULLSCREEN_PROMPT}'` : "";

  if (process.platform === "win32") {
    const file = path.join(tmpdir(), `jr-${action}-${stamp}.ps1`);
    // PowerShell 沒有 `command`；Windows 上沒有 shell function 要繞過，直接叫執行檔。
    writeFileSync(file, `﻿claude${prompt}\n`, "utf8");
    return file;
  }

  const file = path.join(tmpdir(), `jr-${action}-${stamp}.command`);
  // `command` 繞過 ~/.zshrc 裡可能存在的 claude 包裝函式；提問留在 launcher 裡，
  // 避免中文與引號經過 open 的多層參數解析。
  writeFileSync(file, `#!/bin/zsh -i\ncommand claude${prompt}\n`);
  chmodSync(file, 0o755);
  return file;
}

// 刪暫存檔是收尾動作，失敗頂多在 Temp 留一個檔——絕不該讓學生的嚮導整個死掉。
//
// ⚠️ `force: true` 只吞「檔案不存在」，不吞 EPERM。而 Windows 上剛寫完或還被誰開著的
// 檔案就是不准刪（Defender 掃描、powershell 還握著那支 launcher 都會）——實測到的樣子是
// 伺服器行程當場結束，網頁上按什麼都沒反應（#24）。macOS 允許刪掉開著的檔案，所以
// 只有 Windows 現形。
//
// maxRetries / retryDelay 是 Node 自己為了 Windows 的 EPERM/EBUSY 準備的；退無可退時
// 就放著不管——下次開機 Temp 會自己清。
function removeQuietly(file: string): void {
  try {
    rmSync(file, { force: true, maxRetries: 5, retryDelay: 100 });
  } catch {
    // 這裡刻意什麼都不做。留一個暫存檔沒有任何後果，而這條路上丟出去的例外沒有人接。
  }
}

function readIfExists(file: string): string {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

// 開視窗也要吃現算的 PATH。
//
// ⚠️ 開出去的視窗**繼承的是伺服器啟動當下那份環境**，不會自己去讀登錄檔。claude 的
// Windows 安裝器把 claude.exe 放在 %USERPROFILE%\.local\bin 而不寫永久 PATH（我們的
// 安裝動作補寫了登錄檔，但那是伺服器啟動之後的事）——於是視窗裡是
// 「claude is not recognized」，而網頁上那一格永遠等不到記號檔（Windows VM 實測 #20）。
//
// macOS 沒現形是因為那支 launcher 是 `#!/bin/zsh -i`，會重讀 .zshrc 自己救回來。
//
// 這不是繞過學生的環境：登錄檔的 User Path 正是他自己開新視窗時讀到的東西，我們補的
// 是行程快照的落後。
async function openDetached(launcher: string): Promise<void> {
  const { cmd, args } = openCommand(launcher);
  spawn(cmd, args, {
    detached: true,
    stdio: "ignore",
    env: await spawnEnv(),
  }).unref();
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
