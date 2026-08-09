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

test("isComplete is false when checks are ok but eye-check is not checked", () => {
  const state = progressState({
    statuses: new Map([
      ["claude", "ok"],
      ["claude-auth", "ok"],
    ]),
    verified: new Set(["claude", "claude-auth"]),
  });

  assert.equal(isComplete(claudeCodeCard, state), false);
});

test("isComplete is false when ok checks were not verified", () => {
  const state = progressState({
    statuses: new Map([
      ["claude", "ok"],
      ["claude-auth", "ok"],
    ]),
    eyeChecked: new Set(["eye-claude-fullscreen"]),
  });

  assert.equal(effectiveStatus("claude", claudeCodeCard, state), "unverified");
  assert.equal(isComplete(claudeCodeCard, state), false);
});

test("failed verification blocks advance and exposes skip", () => {
  const state = progressState({
    statuses: new Map([
      ["claude", "failed"],
      ["claude-auth", "ok"],
    ]),
    attempted: new Set(["claude", "claude-auth"]),
    eyeChecked: new Set(["eye-claude-fullscreen"]),
  });

  assert.equal(canAdvance(claudeCodeCard, state), false);
  assert.equal(canSkip(claudeCodeCard, state), true);
  assert.equal(cardDisplayState(claudeCodeCard, state), "failed");
});

test("skipped card can advance without being complete", () => {
  const state = progressState({
    statuses: new Map([
      ["claude", "failed"],
      ["claude-auth", "ok"],
    ]),
    skipped: new Set(["claude"]),
  });

  assert.equal(canAdvance(claudeCodeCard, state), true);
  assert.equal(isComplete(claudeCodeCard, state), false);
});

function progressState(overrides: {
  statuses?: ReadonlyMap<CheckId, CheckStatus>;
  verified?: ReadonlySet<CheckId>;
  attempted?: ReadonlySet<CheckId>;
  eyeChecked?: ReadonlySet<string>;
  visited?: ReadonlySet<string>;
  skipped?: ReadonlySet<string>;
}): ProgressState {
  return {
    statuses: overrides.statuses ?? new Map(),
    verified: overrides.verified ?? new Set(),
    attempted: overrides.attempted ?? new Set(),
    eyeChecked: overrides.eyeChecked ?? new Set(),
    visited: overrides.visited ?? new Set(),
    skipped: overrides.skipped ?? new Set(),
  };
}
