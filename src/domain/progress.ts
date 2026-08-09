import type { CheckId, CheckStatus } from "./check.ts";
import type { Card, CardId } from "./card.ts";
import { findCapabilities, findCapability } from "./card.ts";

export interface ProgressState {
  readonly statuses: ReadonlyMap<CheckId, CheckStatus>;
  readonly verified: ReadonlySet<CheckId>;
  readonly attempted: ReadonlySet<CheckId>;
  readonly eyeChecked: ReadonlySet<string>;
  readonly visited: ReadonlySet<CardId>;
  readonly skipped: ReadonlySet<CardId>;
}

export type CardDisplayState =
  | "untouched"
  | "visited-incomplete"
  | "complete"
  | "failed";

export function effectiveStatus(
  checkId: CheckId,
  card: Card,
  state: ProgressState,
): CheckStatus {
  const original = rawStatus(checkId, state);

  if (original === "missing") {
    return "missing";
  }

  if (original === "failed") {
    return "failed";
  }

  if (findCapability(card, "verify") && !state.verified.has(checkId)) {
    return "unverified";
  }

  return original;
}

export function isComplete(card: Card, state: ProgressState): boolean {
  return (
    card.checkIds.every(
      (checkId) => effectiveStatus(checkId, card, state) === "ok",
    ) &&
    findCapabilities(card, "eye-check").every((capability) =>
      state.eyeChecked.has(capability.id),
    )
  );
}

export function canAdvance(card: Card, state: ProgressState): boolean {
  if (state.skipped.has(card.id)) {
    return true;
  }

  const installedEnough = card.checkIds.every((checkId) => {
    const status = rawStatus(checkId, state);
    return status !== "missing" && status !== "failed";
  });
  const verificationAttempted =
    !findCapability(card, "verify") ||
    card.checkIds.every((checkId) => state.attempted.has(checkId));
  const eyeChecksDone = findCapabilities(card, "eye-check").every(
    (capability) => state.eyeChecked.has(capability.id),
  );

  return installedEnough && verificationAttempted && eyeChecksDone;
}

export function canSkip(card: Card, state: ProgressState): boolean {
  return (
    !canAdvance(card, state) &&
    card.checkIds.some(
      (checkId) => effectiveStatus(checkId, card, state) === "failed",
    )
  );
}

export function cardDisplayState(
  card: Card,
  state: ProgressState,
): CardDisplayState {
  if (isComplete(card, state)) {
    return "complete";
  }

  if (
    card.checkIds.some(
      (checkId) => effectiveStatus(checkId, card, state) === "failed",
    )
  ) {
    return "failed";
  }

  if (state.visited.has(card.id)) {
    return "visited-incomplete";
  }

  return "untouched";
}

function rawStatus(
  checkId: CheckId,
  state: ProgressState,
): CheckStatus {
  return state.statuses.get(checkId) ?? "missing";
}
