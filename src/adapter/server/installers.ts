// 每個 CLI 怎麼裝。**不經過 npm**——這是舊版用一台乾淨 VM 換來的結論，不要改回去。
//
// macOS 上 `npm install -g` 會寫 /usr/local/lib/node_modules，而官方 .pkg 裝的 Node
// 把那個目錄留給 root，學生帳號直接 EACCES。npm 給的建議「try running as root」對這
// 兩個 CLI 是錯的：用 sudo 裝出來的東西屬於 root，之後自動更新用學生身分跑，寫不進去
// 且靜默失敗。Windows 一直沒撞到，是因為它的全域目錄在 %APPDATA%，本來就是使用者
// 自己的——同一行指令、兩個平台的擁有者不同。
//
// 所以兩個平台都改用兩家官方各自的原生安裝器：不經過 npm、不需要 sudo，裝進
// ~/.local/bin。附帶好處是 npm 那層轉手本身會壞的地方（全域 prefix 被父行程的
// npm_config_prefix 帶走、optional deps、平台包缺失）就都不存在了。

// claude 的安裝器完全不碰 shell rc，只在輸出裡印一行提醒——所以嚮導得自己補。
//
// 追加前先 grep：重裝、或學生自己照安裝器的提醒加過，都不該長出第二行。
function ensureZshrcPath(binDir: string): string {
  const line = `export PATH="${binDir}:$PATH"`;
  return `LINE='${line}'\ngrep -qF "$LINE" "$HOME/.zshrc" 2>/dev/null || printf '\\n%s\\n' "$LINE" >> "$HOME/.zshrc"`;
}

// ⚠️ pipefail 不能省：curl 失敗時右邊的直譯器讀到空輸入會正常結束，整條管線變成
// exit 0——沒裝成功卻回報成功，還會照樣去寫 .zshrc。
const CLAUDE_DARWIN_SCRIPT = [
  "set -eo pipefail",
  "curl -fsSL https://claude.ai/install.sh | bash",
  ensureZshrcPath("$HOME/.local/bin"),
].join("\n");

// Windows 的 claude.exe 裝完**不寫永久 PATH**（VM 實測：檔案在，登錄檔的 User Path
// 裡沒有那個目錄，只有安裝當下那個視窗看得到）。症狀是安裝那一列全綠，學生開新分頁
// 打 claude 卻說找不到指令。這是 macOS 那半 ensureZshrcPath 的對稱動作。
//
// 比對前先把尾端的反斜線去掉、再不分大小寫比：Windows 的路徑兩者都不算數，直接比
// 字串會在重裝時長出第二筆一模一樣的目錄。
const CLAUDE_WIN32_PATH_FIX = [
  "$bin = Join-Path $env:USERPROFILE '.local\\bin'",
  "$user = [Environment]::GetEnvironmentVariable('Path','User')",
  "$parts = @(); if ($user) { $parts = @($user -split ';' | Where-Object { $_.Trim() }) }",
  "$has = $parts | Where-Object { $_.TrimEnd('\\') -ieq $bin.TrimEnd('\\') }",
  "if ($has) { Write-Host \"$bin 已經在使用者 PATH 裡\" }",
  "else { [Environment]::SetEnvironmentVariable('Path', (($parts + $bin) -join ';'), 'User');" +
    " Write-Host \"已把 $bin 寫進使用者 PATH，新開的視窗才叫得動 claude\" }",
].join("\n");

// $ErrorActionPreference = 'Stop' 是 macOS 那半 `set -eo pipefail` 的對稱：沒有它，
// irm 失敗時 iex 讀到空輸入會正常結束，整條回 exit 0——沒裝成功卻回報成功。
//
// -NoProfile：學生的 PowerShell profile 可能印東西或改 PATH，安裝不該受它影響。
const CLAUDE_WIN32_COMMAND = [
  "$ErrorActionPreference = 'Stop'",
  "irm https://claude.ai/install.ps1 | iex",
  CLAUDE_WIN32_PATH_FIX,
].join("\n");

export interface Installer {
  readonly cmd: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
}

// 只列真的支援的平台。列不出來的平台寧可讓那個動作不存在，也不要給一條裝不起來的
// 指令——失敗在按下去之後才發生，比按不下去難查得多。
const INSTALLERS: Readonly<Record<string, Readonly<Record<string, Installer>>>> = {
  claude: {
    darwin: { cmd: "bash", args: ["-c", CLAUDE_DARWIN_SCRIPT], env: {} },
    win32: {
      cmd: "powershell.exe",
      args: ["-NoProfile", "-Command", CLAUDE_WIN32_COMMAND],
      env: {},
    },
  },
};

export function resolveInstaller(id: string, platform: string): Installer | undefined {
  return Object.hasOwn(INSTALLERS, id) ? INSTALLERS[id]![platform] : undefined;
}
