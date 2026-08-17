import assert from "node:assert/strict";
import test from "node:test";

import { claudeCodeCard } from "../domain/cards/claude-code.ts";
import type { ProgressState } from "../domain/progress.ts";
import { describeCards } from "./describe-progress.ts";

const MANUAL_DONE = ["fullscreen-yes", "fullscreen-mouse", "fullscreen-copy"];

test("把完成狀態與人工完成項算進 CardView", () => {
  const [card] = describeCards(
    [claudeCodeCard],
    progress({
      statuses: [
        ["claude", "ok"],
        ["claude-auth", "ok"],
      ],
      verified: ["claude"],
      attempted: ["claude"],
      eyeChecked: MANUAL_DONE,
      visited: ["claude"],
    }),
  );

  assert.equal(card?.display, "complete");
  assert.equal(card?.complete, true);
  assert.equal(card?.canAdvance, true);
  assert.equal(card?.canSkip, false);
  assert.equal(card?.visited, true);
  assert.deepEqual(
    card?.checks.map((check) => ({ status: check.status, canVerify: check.canVerify })),
    [
      { status: "ok", canVerify: true },
      { status: "ok", canVerify: true },
    ],
  );
  assert.deepEqual(
    card?.capabilities
      .filter((capability) =>
        capability.kind === "eye-check" || capability.kind === "paste-proof",
      )
      .map((capability) => capability.done),
    [true, true, true],
  );
});

test("CardView 使用有效狀態並算出驗證是否可執行", () => {
  const [card] = describeCards(
    [claudeCodeCard],
    progress({ statuses: [["claude", "ok"]], visited: ["claude"] }),
  );

  assert.equal(card?.display, "visited-incomplete");
  assert.equal(card?.complete, false);
  assert.equal(card?.canAdvance, false);
  assert.equal(card?.canSkip, false);
  assert.deepEqual(
    card?.checks.map((check) => ({ status: check.status, canVerify: check.canVerify })),
    [
      { status: "unverified", canVerify: true },
      { status: "missing", canVerify: true },
    ],
  );
});

test("安裝前不可驗證，驗證失敗時 CardView 提供失敗逆口", () => {
  const [missing] = describeCards([claudeCodeCard], progress({}));
  const [failed] = describeCards(
    [claudeCodeCard],
    progress({ statuses: [["claude", "failed"]], attempted: ["claude"] }),
  );

  assert.equal(missing?.checks[0]?.canVerify, false);
  assert.equal(failed?.display, "failed");
  assert.equal(failed?.canAdvance, false);
  assert.equal(failed?.canSkip, true);
});

function progress({
  statuses = [],
  verified = [],
  attempted = [],
  eyeChecked = [],
  visited = [],
  skipped = [],
}: {
  statuses?: [string, "missing" | "unverified" | "ok" | "failed"][];
  verified?: string[];
  attempted?: string[];
  eyeChecked?: string[];
  visited?: string[];
  skipped?: string[];
}): ProgressState {
  return {
    statuses: new Map(statuses),
    verified: new Set(verified),
    attempted: new Set(attempted),
    eyeChecked: new Set(eyeChecked),
    visited: new Set(visited),
    skipped: new Set(skipped),
  };
}
