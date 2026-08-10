import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
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

after(() => rmSync(dir, { recursive: true, force: true }));

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
