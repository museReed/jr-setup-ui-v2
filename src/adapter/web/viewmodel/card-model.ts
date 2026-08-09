import type { Capability, Card, CardCheck } from "../../../domain/card.ts";
import { findCapabilities, findCapability } from "../../../domain/card.ts";
import type { CheckStatus } from "../../../domain/check.ts";
import type { CardDisplayState, ProgressState } from "../../../domain/progress.ts";
import {
  canAdvance,
  canSkip,
  cardDisplayState,
  effectiveStatus,
  isComplete,
} from "../../../domain/progress.ts";
import type { BadgeTone } from "../view/ds/Card.tsx";
import type {
  ButtonTone,
  TerminalLine,
  TerminalTone,
  VerifiedBy,
} from "../view/ds/index.ts";

// 終端裡的一行「發生了什麼」。store 只記語意，顏色是呈現決定，留給 ViewModel。
export type TerminalEntryKind = "output" | "error" | "note" | "done-ok" | "done-fail";

export interface TerminalEntry {
  readonly text: string;
  readonly kind: TerminalEntryKind;
}

export interface AppState {
  readonly card: Card;
  readonly progress: ProgressState;
  readonly terminal: readonly TerminalEntry[];
  readonly runningAction: string | null;
}

export interface ButtonModel {
  readonly action: string;
  readonly label: string;
  readonly tone: ButtonTone;
  readonly disabled: boolean;
  // 驗證要指名是哪一格。少了它，卡片上有兩個驗證時第二格會拿隔壁格的參數去跑。
  readonly checkId?: string;
}

export interface ChecklistRow {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly checked: boolean;
  readonly readOnly: boolean;
  // 誰負責驗這一格。顏色語彙靠它：青＝系統自己驗、橘＝要你自己看。
  readonly verifiedBy: VerifiedBy;
  // 這一格有沒有編過「怎麼做」。沒編過的不畫按鈕——按出一個空彈窗比沒有按鈕
  // 更讓人困惑。
  readonly walkthroughId: string | undefined;
  // 這一格自己的按鈕。掛在格內而不是卡片底下——學生才不用自己配對哪顆帶他做哪一格。
  readonly buttons: readonly ButtonModel[];
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
  // 卡片級的按鈕只剩「再 check 一次」——它真的作用在整張卡上。
  readonly cardButtons: readonly ButtonModel[];
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
    cardButtons: findCapability(card, "recheck") === undefined
      ? []
      : [{ action: "recheck", label: "再 check 一次", tone: "success", disabled: state.runningAction !== null }],
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

// 程式判定的格與學生勾的格排在同一張清單裡，每一格帶著自己的按鈕。
function checklistRows(state: AppState): ChecklistRow[] {
  const { card, progress } = state;

  const system = card.checks.map((check): ChecklistRow => {
    const status = effectiveStatus(check, progress);
    return {
      id: check.id,
      label: check.label,
      hint: STATUS_HINT[status],
      checked: status === "ok",
      readOnly: true,
      verifiedBy: "system",
      walkthroughId: undefined,
      buttons: rowButtons(check, state),
    };
  });

  const eyes = findCapabilities(card, "eye-check").map(
    (capability): ChecklistRow => ({
      id: capability.id,
      label: capability.prompt,
      hint: "這一格程式看不到，只有你看得到",
      checked: progress.eyeChecked.has(capability.id),
      readOnly: false,
      verifiedBy: "manual",
      walkthroughId: capability.walkthrough,
      buttons: [],
    }),
  );

  return [...system, ...eyes];
}

// ⚠️ 只讀 capabilities，不問「這張卡是什麼種類」。
function rowButtons(check: CardCheck, state: AppState): ButtonModel[] {
  const { progress, runningAction } = state;
  const busy = runningAction !== null;
  const installed = progress.statuses.get(check.id) !== "missing";

  return check.capabilities.flatMap((capability): ButtonModel[] => {
    if (capability.kind === "install") {
      return [
        {
          action: capability.action,
          label: installed ? "重新安裝" : "安裝",
          tone: installed ? "success" : "accent",
          disabled: busy,
        },
      ];
    }

    if (capability.kind === "login") {
      return [
        {
          action: capability.action,
          label: installed ? "重新登入" : "登入",
          tone: installed ? "success" : "accent",
          disabled: busy,
        },
      ];
    }

    if (capability.kind === "verify") {
      // 沒驗過叫「開終端驗證」，驗過才叫「重跑驗證」——第一次就寫「重跑」，學生會
      // 以為自己漏掉了前面某一步。
      return [
        {
          action: capability.action,
          label: labelForVerify(capability, progress.verified.has(check.id)),
          tone: "accent",
          disabled: busy,
          checkId: check.id,
        },
      ];
    }

    return [];
  });
}

function labelForVerify(
  capability: Extract<Capability, { kind: "verify" }>,
  ran: boolean,
): string {
  if (ran) {
    return "重跑驗證";
  }

  return capability.via === "terminal" ? "開終端驗證" : "驗證";
}
