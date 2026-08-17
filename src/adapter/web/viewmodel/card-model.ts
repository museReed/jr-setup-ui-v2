// 卡片元件負責把各個元件的呈現資料組成完整卡片。
import { copy } from "../../../copy/index.ts";
import { K, type MessageKey } from "../../../domain/copy-keys.ts";
import {
  findCapability,
  type CardDisplay,
  type CardView,
  type CheckDisplay,
} from "../../../usecase/describe-progress.ts";
import type { BadgeTone, TerminalLine } from "../view/ds/index.ts";
import type { AppState } from "./app-state.ts";
import { findAuthLink, type ButtonModel } from "./button-model.ts";
import {
  checklistModel,
  type ChecklistModel,
  type PromptModel,
} from "./checklist-model.ts";
import { recentRawOutput, TERMINAL_TONE } from "./terminal-model.ts";

export interface CardViewModel {
  readonly title: string;
  // 這一段總共幾張、現在第幾張。學生要知道自己走到哪。
  readonly position: { readonly index: number; readonly total: number };
  readonly hasNext: boolean;
  readonly logoId: string;
  readonly display: CardDisplay;
  readonly badge: { readonly text: string; readonly tone: BadgeTone };
  readonly checklist: ChecklistModel;
  // 卡片級的按鈕只剩「再 check 一次」——它真的作用在整張卡上。
  readonly cardButtons: readonly ButtonModel[];
  // 白話進度：回答「現在正在做什麼」。
  readonly terminalLines: readonly TerminalLine[];
  // 指令原封不動吐出來的東西。跟上面分開——npm 那幾十行雜訊會把白話進度淹掉。
  readonly rawOutput: string;
  // 還在跑的時候才給取消。這是學生唯一能主動結束一次等待的路——終端視窗被關掉時
  // 伺服器不會知道，沒有這顆按鈕他只能盯著一排灰按鈕等逾時。
  readonly cancel: ButtonModel | null;
  // 登入那條會停下來等學生貼授權碼。沒有這一區的話那條路走不完——指令印著
  // 「Paste code here」，而畫面上沒有任何地方可以貼。
  readonly prompt: PromptModel | null;
  readonly canAdvance: boolean;
  readonly canSkip: boolean;
  readonly advanceHint: string;
}

const BADGES: Readonly<Record<CardDisplay, { key: MessageKey; tone: BadgeTone }>> = {
  untouched: { key: K.badge.untouched, tone: "neutral" },
  "visited-incomplete": { key: K.badge.visitedIncomplete, tone: "warn" },
  complete: { key: K.badge.complete, tone: "ok" },
  failed: { key: K.badge.failed, tone: "bad" },
};

const STATUS_HINT: Readonly<Record<CheckDisplay, MessageKey>> = {
  missing: K.status.missing,
  unverified: K.status.unverified,
  ok: K.status.ok,
  failed: K.status.failed,
};

// 現在停在哪一張。沒有卡片時回一張空的——載入中的那半秒也要畫得出東西。
export function activeCard(state: AppState): CardView {
  return (
    state.cards[state.activeIndex] ?? {
      id: "",
      sectionId: "",
      labelKey: K.card.checklistTitle,
      logoId: "",
      display: "untouched",
      complete: false,
      canAdvance: false,
      canSkip: false,
      visited: false,
      checks: [],
      capabilities: [],
    }
  );
}

export function cardModel(state: AppState): CardViewModel {
  const card = activeCard(state);
  const t = (key: string): string => copy(state.locale, key as MessageKey);
  const checklist = checklistModel(state, card, STATUS_HINT);
  const advance = card.canAdvance;
  const login = card.checks
    .map((check) => findCapability(check.capabilities, "login"))
    .find((capability) => capability !== undefined);

  const badge = BADGES[card.display];

  return {
    title: t(card.labelKey),
    position: { index: state.activeIndex + 1, total: state.cards.length },
    hasNext: state.activeIndex + 1 < state.cards.length,
    logoId: card.logoId,
    display: card.display,
    badge: { text: t(badge.key), tone: badge.tone },
    checklist,
    cardButtons:
      findCapability(card.capabilities, "recheck") === undefined
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
    cancel:
      state.runningAction === null
        ? null
        : {
            action: "cancel",
            label: t(K.action.cancel),
            tone: "accent",
            disabled: false,
          },
    prompt: state.runningAcceptsInput
      ? {
          submitLabel: t(K.action.submitCode),
          link: findAuthLink(state.terminal, t(login?.linkKey ?? K.action.openLink)),
        }
      : null,
    canAdvance: advance,
    canSkip: card.canSkip,
    advanceHint: t(
      card.complete
        ? K.card.advanceDone
        : advance
          ? K.card.advanceLoose
          : K.card.advanceBlocked,
    ),
  };
}
