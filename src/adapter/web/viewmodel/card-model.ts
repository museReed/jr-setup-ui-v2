import type { Card } from "../../../domain/card.ts";
import { findCapabilities, findCapability } from "../../../domain/card.ts";
import type { CheckId, CheckStatus } from "../../../domain/check.ts";
import type { CardDisplayState, ProgressState } from "../../../domain/progress.ts";
import {
  canAdvance,
  canSkip,
  cardDisplayState,
  effectiveStatus,
  isComplete,
} from "../../../domain/progress.ts";

export interface AppState {
  readonly card: Card;
  readonly labels: Readonly<Record<string, string>>;
  readonly progress: ProgressState;
  readonly terminalLines: readonly string[];
  readonly runningAction: string | null;
}

export interface ButtonModel {
  readonly action: string;
  readonly label: string;
  readonly kind: "primary" | "ghost";
  readonly disabled: boolean;
}

export interface ChecklistRow {
  readonly id: CheckId;
  readonly label: string;
  readonly status: CheckStatus;
  readonly checked: boolean;
}

export interface EyeCheckRow {
  readonly id: string;
  readonly prompt: string;
  readonly checked: boolean;
}

export interface CardViewModel {
  readonly title: string;
  readonly display: CardDisplayState;
  readonly badge: string;
  readonly checklist: readonly ChecklistRow[];
  readonly eyeChecks: readonly EyeCheckRow[];
  readonly buttons: readonly ButtonModel[];
  readonly canAdvance: boolean;
  readonly canSkip: boolean;
  readonly advanceHint: string;
}

const BADGES: Readonly<Record<CardDisplayState, string>> = {
  untouched: "還沒開始",
  "visited-incomplete": "進行中",
  complete: "已完成",
  failed: "驗證沒過",
};

const STATUS_TEXT: Readonly<Record<CheckStatus, string>> = {
  missing: "未安裝",
  unverified: "裝了，還沒驗過生效",
  ok: "已驗證",
  failed: "驗證沒過",
};

export function statusText(status: CheckStatus): string {
  return STATUS_TEXT[status];
}

// 純函式：state 進去，「畫面該長什麼樣」出來。不碰 DOM、不發請求，所以可以在
// Node 裡直接測。
export function cardModel(state: AppState): CardViewModel {
  const { card, progress } = state;
  const display = cardDisplayState(card, progress);
  const complete = isComplete(card, progress);

  return {
    title: card.label,
    display,
    badge: BADGES[display],
    checklist: card.checkIds.map((id) => {
      const status = effectiveStatus(id, card, progress);
      return {
        id,
        label: state.labels[id] ?? id,
        status,
        checked: status === "ok",
      };
    }),
    eyeChecks: findCapabilities(card, "eye-check").map((capability) => ({
      id: capability.id,
      prompt: capability.prompt,
      checked: progress.eyeChecked.has(capability.id),
    })),
    buttons: buttons(state),
    canAdvance: canAdvance(card, progress),
    canSkip: canSkip(card, progress),
    advanceHint: complete
      ? "這張做完了"
      : canAdvance(card, progress)
        ? "可以往下一張，但這張還沒完成"
        : "做完上面幾格才能往下一張",
  };
}

// ⚠️ 這裡只讀 capabilities，不問「這張卡是什麼種類」。前一代 17 處 kind 分岔
// 就是從這種地方長出來的。
function buttons(state: AppState): ButtonModel[] {
  const { card, progress, runningAction } = state;
  const busy = runningAction !== null;
  const list: ButtonModel[] = [];

  const install = findCapability(card, "install");
  if (install !== undefined) {
    const done = progress.statuses.get(card.checkIds[0] ?? "") !== "missing";
    list.push({
      action: install.action,
      label: done ? "重新安裝" : "安裝",
      kind: done ? "ghost" : "primary",
      disabled: busy,
    });
  }

  const login = findCapability(card, "login");
  if (login !== undefined) {
    const loggedIn = progress.statuses.get("claude-auth") === "ok";
    list.push({
      action: login.action,
      label: loggedIn ? "重新登入" : "登入",
      kind: loggedIn ? "ghost" : "primary",
      disabled: busy,
    });
  }

  const verify = findCapability(card, "verify");
  if (verify !== undefined) {
    // 沒驗過叫「驗證」，驗過才叫「重跑驗證」——第一次就寫「重跑」，學生會以為
    // 自己漏掉了前面某一步。
    const ran = card.checkIds.some((id) => progress.verified.has(id));
    list.push({
      action: verify.action,
      label: ran ? "重跑驗證" : "開終端驗證",
      kind: "primary",
      disabled: busy,
    });
  }

  if (findCapability(card, "recheck") !== undefined) {
    list.push({
      action: "recheck",
      label: "再 check 一次",
      kind: "ghost",
      disabled: busy,
    });
  }

  return list;
}
