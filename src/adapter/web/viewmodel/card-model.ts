import type { Capability, Card, CardCheck } from "../../../domain/card.ts";
import { findCapabilities, findCapability } from "../../../domain/card.ts";
import type { CheckStatus } from "../../../domain/check.ts";
import { K, type MessageKey } from "../../../domain/copy-keys.ts";
import { copy, type Locale } from "../../../copy/index.ts";
import type { Platform } from "../../../domain/platform.ts";
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
  | {
      readonly source: "output";
      readonly text: string;
      readonly kind: TerminalEntryKind;
      // 這一行是第幾輪跑出來的。保留最近幾輪要靠它分組。
      readonly run: number;
    }
  | {
      readonly source: "notice";
      readonly messageKey: MessageKey;
      readonly kind: TerminalEntryKind;
    };

export interface AppState {
  readonly card: Card;
  // 語言是狀態的一部分，不是模組層級的全域值：切語言就是換一次 state，畫面照
  // 原本那條路重新推導出來，不需要任何「切完記得重畫」的規則。
  readonly locale: Locale;
  // 這台機器是什麼。教學內容的平台過濾靠它（見 walkthrough-model）。
  readonly platform: Platform;
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
  // 按下去的那一刻要講的那句白話（驗證那條的訊息由伺服器發，所以沒有）。
  readonly startKey?: MessageKey;
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
  // 白話進度：回答「現在正在做什麼」。
  readonly terminalLines: readonly TerminalLine[];
  // 指令原封不動吐出來的東西。跟上面分開——npm 那幾十行雜訊會把白話進度淹掉。
  readonly rawOutput: string;
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
  const t = (key: MessageKey): string => copy(state.locale, key);
  const display = cardDisplayState(card, progress);
  const rows = checklistRows(state);
  const advance = canAdvance(card, progress);

  const badge = BADGES[display];

  return {
    title: t(card.labelKey),
    logoId: "logo-claude",
    display,
    badge: { text: t(badge.key), tone: badge.tone },
    checklist: {
      title: t(K.card.checklistTitle),
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
              label: t(K.action.recheck),
              tone: "success",
              disabled: state.runningAction !== null,
            },
          ],
    terminalLines: state.terminal
      .filter((entry) => entry.source === "notice")
      .map((entry): TerminalLine => ({
        text: t(entry.messageKey),
        tone: TERMINAL_TONE[entry.kind],
      })),
    rawOutput: recentRawOutput(state.terminal),
    canAdvance: advance,
    canSkip: canSkip(card, progress),
    advanceHint: t(
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
  const t = (key: MessageKey): string => copy(state.locale, key);

  const system = card.checks.map((check): ChecklistRow => {
    const status = effectiveStatus(check, progress);
    return {
      id: check.id,
      label: t(check.labelKey),
      hint: t(STATUS_HINT[status]),
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
      label: t(capability.promptKey),
      hint: t(K.hint.manualOnly),
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
  const t = (key: MessageKey): string => copy(state.locale, key);
  const busy = runningAction !== null;
  const installed = progress.statuses.get(check.id) !== "missing";

  return check.capabilities.flatMap((capability): ButtonModel[] => {
    if (capability.kind === "install") {
      return [
        {
          action: capability.action,
          label: t(installed ? K.action.reinstall : K.action.install),
          tone: installed ? "success" : "accent",
          disabled: busy,
          startKey: capability.startKey,
        },
      ];
    }

    if (capability.kind === "login") {
      return [
        {
          action: capability.action,
          label: t(installed ? K.action.relogin : K.action.login),
          tone: installed ? "success" : "accent",
          disabled: busy,
          startKey: capability.startKey,
        },
      ];
    }

    if (capability.kind === "verify") {
      // 沒驗過叫「開終端驗證」，驗過才叫「重跑驗證」——第一次就寫「重跑」，學生會
      // 以為自己漏掉了前面某一步。
      return [
        {
          action: capability.action,
          label: labelForVerify(capability, progress.verified.has(check.id), state.locale),
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
  locale: Locale,
): string {
  if (ran) {
    return copy(locale, K.action.rerunVerify);
  }

  return copy(
    locale,
    capability.via === "terminal" ? K.action.verifyTerminal : K.action.verifyAuto,
  );
}

// 保留最近幾輪，不是只留最後一輪。
//
// 學生遇到失敗的第一個動作就是再按一次——那時失敗那次的輸出已經沒了，而我們要
// 判斷的正是失敗那次。輪與輪之間畫一條線隔開。
const MAX_KEPT_RUNS = 3;
const RUN_SEPARATOR = "────────────";

function recentRawOutput(entries: readonly TerminalEntry[]): string {
  const outputs = entries.filter((entry) => entry.source === "output");
  const runs = [...new Set(outputs.map((entry) => entry.run))].slice(-MAX_KEPT_RUNS);

  return runs
    .map((run) =>
      outputs
        .filter((entry) => entry.run === run)
        .map((entry) => entry.text)
        .join("\n"),
    )
    .join(`\n${RUN_SEPARATOR}\n`);
}
