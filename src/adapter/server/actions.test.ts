import assert from "node:assert/strict";
import { test } from "node:test";

import { ACTIONS } from "./actions.ts";

test("login-codex 只執行 login、保留 stdin，而且不設定 BROWSER", () => {
  const action = ACTIONS["login-codex"];

  assert.deepEqual(action?.args, ["login"]);
  assert.equal(action?.acceptsInput, true);
  assert.equal(Object.hasOwn(action?.env ?? {}, "BROWSER"), false);
});
