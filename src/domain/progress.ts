import type { CheckId, CheckStatus } from "./check.ts";
import type { Card, CardCheck, CardId } from "./card.ts";
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

// 一格的有效狀態。
//
// ⚠️ 「要不要降級成 unverified」看的是**這一格**有沒有宣告驗證，不是整張卡。
// 用卡片級判斷的話，登入那一格會被 CLI 那一格的驗證需求連坐，明明 `claude auth
// status` 已經回答了行為問題，畫面上卻還寫「還沒驗過生效」。
export function effectiveStatus(
  check: CardCheck,
  state: ProgressState,
): CheckStatus {
  const original = rawStatus(check.id, state);

  if (original === "missing" || original === "failed") {
    return original;
  }

  if (findCapability(check, "verify") !== undefined && !state.verified.has(check.id)) {
    return "unverified";
  }

  return original;
}

export function isComplete(card: Card, state: ProgressState): boolean {
  return (
    card.checks.every((check) => effectiveStatus(check, state) === "ok") &&
    eyeChecks(card).every((capability) => state.eyeChecked.has(capability.id))
  );
}

// 「能不能翻下一張」跟「這張完成了」是兩件事。驗證跑過但還沒通過，學生仍然走得掉
// ——課堂上不能因為一次環境抽風就把人鎖死在同一張卡上。
export function canAdvance(card: Card, state: ProgressState): boolean {
  if (state.skipped.has(card.id)) {
    return true;
  }

  const installed = card.checks.every((check) => {
    const status = rawStatus(check.id, state);
    return status !== "missing" && status !== "failed";
  });

  const attempted = card.checks.every(
    (check) =>
      findCapability(check, "verify") === undefined ||
      state.attempted.has(check.id),
  );

  const eyesDone = eyeChecks(card).every((capability) =>
    state.eyeChecked.has(capability.id),
  );

  return installed && attempted && eyesDone;
}

// 逆口只在「被鎖住，而且原因是驗證失敗」時出現，不是隨時都給。
export function canSkip(card: Card, state: ProgressState): boolean {
  return !canAdvance(card, state) && hasFailure(card, state);
}

export function cardDisplayState(
  card: Card,
  state: ProgressState,
): CardDisplayState {
  if (isComplete(card, state)) {
    return "complete";
  }

  if (hasFailure(card, state)) {
    return "failed";
  }

  return state.visited.has(card.id) ? "visited-incomplete" : "untouched";
}

function hasFailure(card: Card, state: ProgressState): boolean {
  return card.checks.some((check) => effectiveStatus(check, state) === "failed");
}

// 人工勾選掛在卡片級：它們對應的不是某一格程式檢查，而是「只有你看得到」的事。
function eyeChecks(card: Card) {
  return findCapabilities(card, "eye-check");
}

function rawStatus(checkId: CheckId, state: ProgressState): CheckStatus {
  return state.statuses.get(checkId) ?? "missing";
}

// 合併卡的順序約束：這張卡上該裝的都裝好了，才輪到驗證。
//
// 順序反了驗的是「只裝了一半」的狀態——而那種驗證多半會過（半套設定通常不會
// 報錯，只是不完整），於是綠燈長在一個沒做完的東西上。
export function canVerifyYet(card: Card, state: ProgressState): boolean {
  return card.checks
    .filter((check) => findCapability(check, "install") !== undefined)
    .every((check) => rawStatus(check.id, state) !== "missing");
}
