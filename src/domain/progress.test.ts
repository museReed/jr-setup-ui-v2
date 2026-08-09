import assert from "node:assert/strict";
import test from "node:test";

import { claudeCodeCard } from "./catalog.ts";
import type { CheckId, CheckStatus } from "./check.ts";
import {
  canAdvance,
  canSkip,
  cardDisplayState,
  effectiveStatus,
  isComplete,
  type ProgressState,
} from "./progress.ts";

const CLI = claudeCodeCard.checks[0]!;
const AUTH = claudeCodeCard.checks[1]!;
const EYE = "eye-claude-fullscreen";

test("宣告了驗證的那格才會降級成 unverified", () => {
  const state = progress({ claude: "ok", "claude-auth": "ok" }, {});

  // CLI 那格有 verify capability → 沒驗過就是中間態
  assert.equal(effectiveStatus(CLI, state), "unverified");
  // 登入那格沒有 verify capability——`claude auth status` 問的就是行為本身，
  // 不該被隔壁格的驗證需求連坐
  assert.equal(effectiveStatus(AUTH, state), "ok");
});

test("兩格都 ok 但沒驗過、沒勾眼睛 → 還沒完成", () => {
  const state = progress({ claude: "ok", "claude-auth": "ok" }, {});

  assert.equal(isComplete(claudeCodeCard, state), false);
});

test("驗過又勾了眼睛才算完成", () => {
  const state = progress(
    { claude: "ok", "claude-auth": "ok" },
    { verified: ["claude"], attempted: ["claude"], eyeChecked: [EYE] },
  );

  assert.equal(isComplete(claudeCodeCard, state), true);
  assert.equal(canAdvance(claudeCodeCard, state), true);
  assert.equal(canSkip(claudeCodeCard, state), false);
  assert.equal(cardDisplayState(claudeCodeCard, state), "complete");
});

test("驗證失敗：鎖住下一張，給逆口，顯示為失敗", () => {
  const state = progress(
    { claude: "failed", "claude-auth": "ok" },
    { attempted: ["claude"], eyeChecked: [EYE] },
  );

  assert.equal(canAdvance(claudeCodeCard, state), false);
  assert.equal(canSkip(claudeCodeCard, state), true);
  assert.equal(cardDisplayState(claudeCodeCard, state), "failed");
});

// 跑過但還沒過，跟跑失敗是兩回事：前者放行、後者鎖住。
test("驗證跑過、狀態仍是 unverified → 走得掉但不算完成", () => {
  const state = progress(
    { claude: "ok", "claude-auth": "ok" },
    { attempted: ["claude"], eyeChecked: [EYE] },
  );

  assert.equal(canAdvance(claudeCodeCard, state), true);
  assert.equal(isComplete(claudeCodeCard, state), false);
});

test("用逆口走掉的卡放行前進，但不算完成", () => {
  const state = progress({ claude: "failed" }, { skipped: ["claude"] });

  assert.equal(canAdvance(claudeCodeCard, state), true);
  assert.equal(isComplete(claudeCodeCard, state), false);
  assert.equal(cardDisplayState(claudeCodeCard, state), "failed");
});

function progress(
  statuses: Record<CheckId, CheckStatus>,
  sets: {
    verified?: CheckId[];
    attempted?: CheckId[];
    eyeChecked?: string[];
    visited?: string[];
    skipped?: string[];
  },
): ProgressState {
  return {
    statuses: new Map(Object.entries(statuses)),
    verified: new Set(sets.verified ?? []),
    attempted: new Set(sets.attempted ?? []),
    eyeChecked: new Set(sets.eyeChecked ?? []),
    visited: new Set(sets.visited ?? []),
    skipped: new Set(sets.skipped ?? []),
  };
}
