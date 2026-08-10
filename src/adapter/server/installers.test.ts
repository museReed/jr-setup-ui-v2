import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveInstaller } from "./installers.ts";

// 這幾題守的是舊版用一台乾淨 VM 換來的三個結論。它們看起來像在測字串，實際上測的是
// 「別再改回去」——每一條的反面都在真機器上壞過。
test("不經過 npm——npm -g 在 macOS 上會撞 root 擁有的目錄", () => {
  for (const platform of ["darwin", "win32"]) {
    const installer = resolveInstaller("claude", platform);
    const line = [installer?.cmd, ...(installer?.args ?? [])].join(" ");

    assert.ok(!line.includes("npm"), `${platform} 的安裝器又走回 npm 了`);
  }
});

test("macOS：pipefail 不能省，否則 curl 失敗整條會回 exit 0", () => {
  const script = resolveInstaller("claude", "darwin")?.args.join("\n") ?? "";

  assert.match(script, /set -eo pipefail/);
  assert.match(script, /curl -fsSL https:\/\/claude\.ai\/install\.sh \| bash/);
});

test("macOS：claude 不碰 shell rc，PATH 要嚮導自己補，而且不能補出第二行", () => {
  const script = resolveInstaller("claude", "darwin")?.args.join("\n") ?? "";

  assert.match(script, /\.zshrc/);
  // 先 grep 再追加：重裝不該長出第二行一模一樣的 export。
  assert.match(script, /grep -qF/);
});

test("Windows：claude.exe 不寫永久 PATH，嚮導要自己寫進登錄檔", () => {
  const script = resolveInstaller("claude", "win32")?.args.join("\n") ?? "";

  assert.match(script, /\$ErrorActionPreference = 'Stop'/);
  assert.match(script, /SetEnvironmentVariable\('Path'/);
});

test("沒有安裝器的平台回 undefined，不是硬給一條裝不起來的指令", () => {
  assert.equal(resolveInstaller("claude", "linux"), undefined);
  assert.equal(resolveInstaller("nonesuch", "darwin"), undefined);
});
