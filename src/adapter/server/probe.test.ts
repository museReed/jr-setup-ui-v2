import assert from "node:assert/strict";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";

import { createFakeEnv } from "./fake-env.ts";
import { installAllowlist, installHook } from "./config-install.ts";
import { createEnvProbe } from "./probe.ts";

const MATERIALS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../materials",
);

const dir = mkdtempSync(path.join(tmpdir(), "jr-probe-"));
process.env.JR_CLAUDE_DIR = dir;

const originalPath = process.env.PATH;
const bin = path.join(dir, "bin");
const codexLog = path.join(dir, "codex-args.txt");
const codex = path.join(bin, "codex");
mkdirSync(bin);
writeFileSync(
  codex,
  `#!/bin/sh\nprintf '%s\\n' "$*" >> '${codexLog}'\nexit 0\n`,
);
chmodSync(codex, 0o755);
process.env.PATH = `${bin}${path.delimiter}${originalPath ?? ""}`;

after(() => {
  process.env.PATH = originalPath;
  rmSync(dir, { recursive: true, force: true });
});

async function drain(events: AsyncIterable<unknown>): Promise<void> {
  for await (const _ of events) {
    // 裝就好，輸出這裡不看。
  }
}

// 這題就是「裝了幾次還是說沒裝，於是驗證永遠被擋」那個 bug。
test("假環境只蓋它認得的那幾格，設定檔那兩格照樣去問磁碟", async () => {
  await drain(installHook(MATERIALS));
  await drain(installAllowlist(MATERIALS));

  const probe = createEnvProbe(createFakeEnv("missing"), MATERIALS);

  assert.equal(await probe.probe("claude"), "missing");
  assert.equal(await probe.probe("hook"), "ok");
  assert.equal(await probe.probe("allowlist"), "ok");
});

test("認不得的格仍然是 missing，不是變成 undefined 漏出去", async () => {
  const probe = createEnvProbe(createFakeEnv("missing"), MATERIALS);

  assert.equal(await probe.probe("nonesuch"), "missing");
});

test("Codex CLI 與登入探測分別執行 codex --version 和 codex login status", async () => {
  const probe = createEnvProbe(null, MATERIALS);

  assert.equal(await probe.probe("codex"), "ok");
  assert.equal(await probe.probe("codex-auth"), "ok");
  assert.deepEqual(readFileSync(codexLog, "utf8").trim().split("\n"), [
    "--version",
    "login status",
  ]);
});
