import assert from "node:assert/strict";
import { test } from "node:test";

import { createFakeEnv } from "./fake-env.ts";

test("JR_FAKE_ENV=missing 會把 Codex CLI 與登入狀態一起設成 missing", () => {
  const fake = createFakeEnv("missing");

  assert.equal(fake?.status("codex"), "missing");
  assert.equal(fake?.status("codex-auth"), "missing");
});
