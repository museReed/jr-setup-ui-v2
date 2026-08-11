# jr-setup-ui-v2 bootstrap（Windows）
#
#   irm https://raw.githubusercontent.com/museReed/jr-setup-ui-v2/main/docs/setup.ps1 | iex
#
# 驗某條分支時在同一行前面設 $JrBranch：
#
#   $JrBranch="feature/1-slice-claude-card"; irm https://raw.githubusercontent.com/museReed/jr-setup-ui-v2/main/docs/setup.ps1 | iex
#
# ⚠️ 網址用 raw.githubusercontent.com，不要用 GitHub Pages：Pages 把 .ps1 當成
# application/octet-stream 送，irm 對非文字型別會回傳位元組陣列而不是字串，iex 就
# 吃不下。macOS 那半不受影響——curl 不看 content-type。
$ErrorActionPreference = "Stop"

$branch = if ($JrBranch) { $JrBranch } else { "main" }
$port = if ($env:JR_PORT) { $env:JR_PORT } else { "7430" }

$appDir = Join-Path $HOME ".jr-setup-v2\app"
$zipUrl = "https://codeload.github.com/museReed/jr-setup-ui-v2/zip/refs/heads/$branch"
# GitHub 的 zip 解出來會多包一層 {repo}-{branch}，分支名裡的 / 會換成 -。
$extractedName = "jr-setup-ui-v2-" + ($branch -replace "/", "-")

function Say($text) {
  Write-Host ""
  Write-Host "▸ $text" -ForegroundColor Cyan
}

# 剛裝好的東西寫進登錄檔的 PATH，但目前這個 PowerShell 拿的是啟動當下的快照。
# 重讀一次就不用叫同學關掉重開。
function Update-PathFromRegistry {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}

function Install-Node {
  Say "安裝 Node.js LTS"

  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "這台電腦沒有 winget。請到 https://nodejs.org/en/download 下載 Windows Installer (.msi) 手動安裝後再跑一次。"
  }

  # --source winget 不能省：不指定會去撞 msstore 的憑證驗證而整包裝不起來。
  winget install --id OpenJS.NodeJS.LTS -e --source winget `
    --accept-source-agreements --accept-package-agreements

  Update-PathFromRegistry

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node 裝完了但這個視窗還叫不到它。請關掉 PowerShell、重新開一個，再貼一次同樣的指令。"
  }
}

Say "jr-setup-ui-v2 安裝嚮導"

Update-PathFromRegistry

if (Get-Command node -ErrorAction SilentlyContinue) {
  Write-Host "Node.js 已安裝：$(node --version)"
} else {
  Install-Node
}

Say "下載嚮導（$branch）"
$zipPath = Join-Path $env:TEMP "jr-setup-ui-v2.zip"
$extractDir = Join-Path $env:TEMP "jr-setup-ui-v2-extract"
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath

if (Test-Path $extractDir) {
  Remove-Item -Recurse -Force $extractDir
}

Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

# ⚠️ 先離開那個資料夾再刪。這支腳本最後會 Set-Location $appDir（為了直接跑 node），
# 所以在同一個視窗重貼一次安裝指令時，這個行程就站在要被刪掉的目錄裡——Windows 不准
# 刪掉行程的目前目錄，訊息是「because it is in use」（VM 實測）。macOS 不會，POSIX
# 允許刪掉當前目錄。
Set-Location $HOME

if (Test-Path $appDir) {
  try {
    Remove-Item -Recurse -Force -ErrorAction Stop $appDir
  } catch {
    # 另一個視窗還跑著舊的嚮導時，那個 node 行程也鎖著同一個目錄。PowerShell 的
    # 原文看不出要去關哪個視窗，所以這裡自己講。
    throw "刪不掉舊的嚮導（$appDir）。嚮導可能還在另一個視窗跑著——先關掉那個視窗，再貼一次這行指令。"
  }
}

New-Item -ItemType Directory -Force -Path (Split-Path $appDir) | Out-Null
Move-Item (Join-Path $extractDir $extractedName) $appDir

# 留一張紙條說這份是從哪抓的。學生貼回來的畫面看不出他跑的是 main 還是我們請他驗
# 的那條分支，package.json 的 version 是 0.0.0 也幫不上忙。
Set-Content -LiteralPath (Join-Path $appDir ".jr-source") -Value $branch -Encoding utf8
Remove-Item -Recurse -Force $extractDir
Remove-Item -Force $zipPath

# 舊版出貨的是純 JS，這一代要 build——網頁那半是 vite 打包出來的，dist/ 不進版控。
Say "安裝相依套件並打包（第一次大約一分鐘）"

# ⚠️ `npm.cmd` 不能寫成 `npm`。PowerShell 裡的裸 `npm` 解析到的是
# C:\Program Files\nodejs\npm.ps1，而 Windows 預設的執行原則是 Restricted——整支
# 腳本連載入都被擋（Windows VM 實測：「running scripts is disabled on this system」，
# bootstrap 就停在這一行）。`.cmd` 那支不受執行原則管，官方安裝檔兩支都放了。
#
# 也不在這裡改機器的執行原則：那是「Windows 先準備好」那張卡要帶學生自己做的事，
# bootstrap 偷偷改掉的話，那張卡驗出來就永遠是綠的。
npm.cmd --prefix $appDir install
npm.cmd --prefix $appDir run build

Say "啟動嚮導（關掉這個視窗就會結束）"

# 等伺服器起來再開瀏覽器：開太早會看到「無法連線」，學生第一眼就以為壞了。
Start-Job -ScriptBlock {
  param($url)
  for ($i = 0; $i -lt 40; $i++) {
    try {
      Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
      Start-Process $url
      return
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
} -ArgumentList "http://localhost:$port" | Out-Null

# ⚠️ 直接 node，不要 npm start：npm 執行 script 時會往環境塞一整組 npm_config_*，
# 其中 npm_config_prefix 會被嚮導開出去的子行程繼承——如果哪天又有動作用到 npm -g，
# 那個「全域安裝」就會被導進這個資料夾。
Set-Location $appDir
node src\adapter\server\main.ts
