import type { Capability, Card, CardCheck } from "../../../domain/card.ts";
import { findCapabilities, findCapability } from "../../../domain/card.ts";
import type { CheckStatus } from "../../../domain/check.ts";
import { K, type MessageKey } from "../../../domain/copy-keys.ts";
import { copy } from "../../../copy/index.ts";
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

// 終端裡的一行「發生了什麼」。
//
// 指令吐出來的是原文（照原樣留著，那是真實輸出）；我們自己的話是代號，這一層才
// 翻成字。顏色也在這一層決定——store 只記語意。
export type TerminalEntryKind = "output" | "error" | "note" | "done-ok" | "done-fail";

export type TerminalEntry =
  | { readonly source: "output"; readonly text: string; readonly kind: TerminalEntryKind }
  | {
      readonly source: "notice";
      readonly messageKey: MessageKey;
      readonly kind: TerminalEntryKind;
    };

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

const BADGES: Readonly<Record<CardDisplayState, { key: MessageKey; tone: BadgeTone }>> = {
  untouched: { key: K.badge.untouched, tone: "neutral" },
  "visited-incomplete": { key: K.badge.visitedIncomplete, tone: "warn" },
  complete: { key: K.badge.complete, tone: "ok" },
  failed: { key: K.badge.failed, tone: "bad" },
};

const STATUS_HINT: Readonly<Record<CheckStatus, MessageKey>> = {
  missing: K.status.missing,
  unverified: K.status.unverified,
  ok: K.status.ok,
  failed: K.status.failed,
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

  const badge = BADGES[display];

  return {
    title: copy(card.labelKey),
    logoId: "logo-claude",
    display,
    badge: { text: copy(badge.key), tone: badge.tone },
    checklist: {
      title: copy(K.card.checklistTitle),
      done: rows.filter((row) => row.checked).length,
      total: rows.length,
      rows,
    },
    cardButtons:
      findCapability(card, "recheck") === undefined
        ? []
        : [
            {
              action: "recheck",
              label: copy(K.action.recheck),
              tone: "success",
              disabled: state.runningAction !== null,
            },
          ],
    terminalLines: state.terminal.map(
      (entry): TerminalLine => ({
        text: entry.source === "output" ? entry.text : copy(entry.messageKey),
        tone: TERMINAL_TONE[entry.kind],
      }),
    ),
    canAdvance: advance,
    canSkip: canSkip(card, progress),
    advanceHint: copy(
      isComplete(card, progress)
        ? K.card.advanceDone
        : advance
          ? K.card.advanceLoose
          : K.card.advanceBlocked,
    ),
  };
}

// 程式判定的格與學生勾的格排在同一張清單裡，每一格帶著自己的按鈕。
function checklistRows(state: AppState): ChecklistRow[] {
  const { card, progress } = state;

  const system = card.checks.map((check): ChecklistRow => {
    const status = effectiveStatus(check, progress);
    return {
      id: check.id,
      label: copy(check.labelKey),
      hint: copy(STATUS_HINT[status]),
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
      label: copy(capability.promptKey),
      hint: copy(K.hint.manualOnly),
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
          label: copy(installed ? K.action.reinstall : K.action.install),
          tone: installed ? "success" : "accent",
          disabled: busy,
        },
      ];
    }

    if (capability.kind === "login") {
      return [
        {
          action: capability.action,
          label: copy(installed ? K.action.relogin : K.action.login),
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
    return copy(K.action.rerunVerify);
  }

  return copy(
    capability.via === "terminal" ? K.action.verifyTerminal : K.action.verifyAuto,
  );
}
