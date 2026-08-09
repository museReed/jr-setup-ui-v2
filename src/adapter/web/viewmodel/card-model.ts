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
import type { BadgeTone } from "../view/ds/Card.tsx";
import type { ButtonTone, TerminalLine, TerminalTone } from "../view/ds/index.ts";

// 終端裡的一行「發生了什麼」。store 只記語意，顏色是呈現決定，留給 ViewModel。
export type TerminalEntryKind = "output" | "error" | "note" | "done-ok" | "done-fail";

export interface TerminalEntry {
  readonly text: string;
  readonly kind: TerminalEntryKind;
}

export interface AppState {
  readonly card: Card;
  readonly labels: Readonly<Record<string, string>>;
  readonly progress: ProgressState;
  readonly terminal: readonly TerminalEntry[];
  readonly runningAction: string | null;
}

export interface ButtonModel {
  readonly action: string;
  readonly label: string;
  readonly tone: ButtonTone;
  readonly disabled: boolean;
}

export interface ChecklistRow {
  readonly id: string;
  readonly label: string;
  readonly hint: string | undefined;
  readonly checked: boolean;
  // 程式判定的那幾格學生不能自己勾。能自動判定的就自動判定——勾選欄位越少，
  // 學生越不會一排全勾。
  readonly readOnly: boolean;
}

export interface ChecklistModel {
  readonly title: string;
  readonly done: number;
  readonly total: number;
  readonly rows: readonly ChecklistRow[];
}

export interface CardViewModel {
  readonly title: string;
  readonly logoId: string;
  readonly display: CardDisplayState;
  readonly badge: { readonly text: string; readonly tone: BadgeTone };
  readonly checklist: ChecklistModel;
  readonly buttons: readonly ButtonModel[];
  readonly terminalLines: readonly TerminalLine[];
  readonly canAdvance: boolean;
  readonly canSkip: boolean;
  readonly advanceHint: string;
}

const BADGES: Readonly<Record<CardDisplayState, { text: string; tone: BadgeTone }>> = {
  untouched: { text: "還沒開始", tone: "neutral" },
  "visited-incomplete": { text: "進行中", tone: "warn" },
  complete: { text: "已完成", tone: "ok" },
  failed: { text: "驗證沒過", tone: "bad" },
};

const STATUS_HINT: Readonly<Record<CheckStatus, string>> = {
  missing: "還沒安裝",
  // 中間那一態是整套設計的重點：結構齊全不等於行為生效。二態的世界裡它會是綠燈，
  // 學生連重跑的機會都沒有。
  unverified: "裝好了，還沒驗過真的生效",
  ok: "驗過生效",
  failed: "驗過，但沒通過",
};

const TERMINAL_TONE: Readonly<Record<TerminalEntryKind, TerminalTone>> = {
  output: "plain",
  error: "err",
  note: "dim",
  "done-ok": "ok",
  "done-fail": "err",
};

export function cardModel(state: AppState): CardViewModel {
  const { card, progress } = state;
  const display = cardDisplayState(card, progress);
  const rows = checklistRows(state);
  const advance = canAdvance(card, progress);

  return {
    title: card.label,
    logoId: "logo-claude",
    display,
    badge: BADGES[display],
    checklist: {
      title: "這張卡要完成的事",
      done: rows.filter((row) => row.checked).length,
      total: rows.length,
      rows,
    },
    buttons: buttons(state),
    terminalLines: state.terminal.map(
      (entry): TerminalLine => ({ text: entry.text, tone: TERMINAL_TONE[entry.kind] }),
    ),
    canAdvance: advance,
    canSkip: canSkip(card, progress),
    advanceHint: isComplete(card, progress)
      ? "這張做完了"
      : advance
        ? "可以往下一張，但這張還沒完成"
        : "上面幾格做完才能往下一張",
  };
}

// 程式判定的格與學生勾的格排在同一張清單裡。分兩塊的話，學生要自己把「未登入」
// 跟下面那顆授權按鈕連起來——前一代 VM 實測就卡在這。
function checklistRows(state: AppState): ChecklistRow[] {
  const { card, progress } = state;

  const system = card.checkIds.map((id: CheckId): ChecklistRow => {
    const status = effectiveStatus(id, card, progress);
    return {
      id,
      label: state.labels[id] ?? id,
      hint: STATUS_HINT[status],
      checked: status === "ok",
      readOnly: true,
    };
  });

  const eyes = findCapabilities(card, "eye-check").map(
    (capability): ChecklistRow => ({
      id: capability.id,
      label: capability.prompt,
      hint: "這一格程式看不到，只有你看得到",
      checked: progress.eyeChecked.has(capability.id),
      readOnly: false,
    }),
  );

  return [...system, ...eyes];
}

// ⚠️ 這裡只讀 capabilities，不問「這張卡是什麼種類」。前一代 17 處 kind 分岔
// 就是從這種地方長出來的。
function buttons(state: AppState): ButtonModel[] {
  const { card, progress, runningAction } = state;
  const busy = runningAction !== null;
  const list: ButtonModel[] = [];

  const install = findCapability(card, "install");
  if (install !== undefined) {
    const installed = progress.statuses.get(card.checkIds[0] ?? "") !== "missing";
    list.push({
      action: install.action,
      label: installed ? "重新安裝" : "安裝",
      tone: installed ? "success" : "accent",
      disabled: busy,
    });
  }

  const login = findCapability(card, "login");
  if (login !== undefined) {
    const loggedIn = progress.statuses.get("claude-auth") !== "missing";
    list.push({
      action: login.action,
      label: loggedIn ? "重新登入" : "登入",
      tone: loggedIn ? "success" : "accent",
      disabled: busy,
    });
  }

  const verify = findCapability(card, "verify");
  if (verify !== undefined) {
    // 沒驗過叫「開終端驗證」，驗過才叫「重跑驗證」——第一次就寫「重跑」，學生會
    // 以為自己漏掉了前面某一步。
    const ran = card.checkIds.some((id) => progress.verified.has(id));
    list.push({
      action: verify.action,
      label: ran ? "重跑驗證" : "開終端驗證",
      tone: "accent",
      disabled: busy,
    });
  }

  if (findCapability(card, "recheck") !== undefined) {
    list.push({
      action: "recheck",
      label: "再 check 一次",
      tone: "success",
      disabled: busy,
    });
  }

  return list;
}
