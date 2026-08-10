#!/bin/bash
# jr-setup-ui-v2 bootstrap（macOS）
#
#   curl -fsSL https://raw.githubusercontent.com/museReed/jr-setup-ui-v2/main/docs/setup.sh | bash
#
# 驗某條分支時在前面加 JR_BRANCH：
#
#   JR_BRANCH=feature/1-slice-claude-card bash -c "$(curl -fsSL https://raw.githubusercontent.com/museReed/jr-setup-ui-v2/main/docs/setup.sh)"
#
# 這支腳本做四件事：裝 Node → 修 PATH → 下載嚮導並 build → 啟動。學生從頭到尾
# 只需要貼一行，然後看瀏覽器打開。
set -euo pipefail

# 版本寫死比動態解析可靠：開課前手動更新這一行就好。動態解析「最新」會在開課當天
# 因為上游發版而變成沒人驗過的組合。
NODE_VERSION="v24.19.0"
APP_DIR="$HOME/.jr-setup-v2/app"
BRANCH="${JR_BRANCH:-main}"
TARBALL="https://codeload.github.com/museReed/jr-setup-ui-v2/tar.gz/refs/heads/${BRANCH}"
PORT="${JR_PORT:-7430}"

say() {
  printf '\n\033[1m▸ %s\033[0m\n' "$1"
}

install_node() {
  local pkg="node-${NODE_VERSION}.pkg"
  local url="https://nodejs.org/dist/${NODE_VERSION}/${pkg}"
  local tmp
  tmp="$(mktemp -d)"

  say "安裝 Node.js ${NODE_VERSION}（官方安裝檔，約 90 MB）"
  curl -fL --progress-bar -o "${tmp}/${pkg}" "$url"

  echo "接下來要用系統管理員權限安裝，請輸入你的 Mac 密碼（畫面上不會顯示）："
  sudo installer -pkg "${tmp}/${pkg}" -target /
  rm -rf "$tmp"

  # 安裝檔寫進 /usr/local/bin，但目前這個 shell 的 PATH 是啟動時的快照——不補這兩行，
  # 下一行 node 就會說找不到指令。
  export PATH="/usr/local/bin:$PATH"
  hash -r
}

say "jr-setup-ui-v2 安裝嚮導"

if command -v node >/dev/null 2>&1; then
  echo "Node.js 已安裝：$(node --version)"
else
  install_node
fi

say "下載嚮導（${BRANCH}）"
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"
curl -fsSL "$TARBALL" | tar -xz -C "$APP_DIR" --strip-components=1

# 留一張紙條說這份是從哪抓的。學生貼回來的畫面看不出他跑的是 main 還是我們請他
# 驗的那條分支，package.json 的 version 是 0.0.0 也幫不上忙。
printf '%s\n' "$BRANCH" > "$APP_DIR/.jr-source"

# 舊版出貨的是純 JS，這一代要 build——網頁那半是 vite 打包出來的，dist/ 不進版控。
say "安裝相依套件並打包（第一次大約一分鐘）"
npm --prefix "$APP_DIR" install
npm --prefix "$APP_DIR" run build

say "啟動嚮導（關掉這個視窗就會結束）"

# 等伺服器起來再開瀏覽器：開太早會看到「無法連線」，學生第一眼就以為壞了。
(
  for _ in $(seq 1 40); do
    if curl -fsS -o /dev/null "http://localhost:${PORT}/"; then
      open "http://localhost:${PORT}"
      exit 0
    fi
    sleep 0.5
  done
) &

# ⚠️ 用 exec node 直接跑，不要用 npm start。
#
# npm 執行任何 script 時會往環境塞一整組 npm_config_*，其中 npm_config_prefix 會被
# 嚮導開出去的子行程繼承——如果哪天又有動作用到 npm -g，那個「全域安裝」就會被導進
# 這個資料夾。exec 交棒還有第二個好處：Ctrl-C 直接停掉嚮導，不留孤兒程序。
cd "$APP_DIR"
exec node src/adapter/server/main.ts
