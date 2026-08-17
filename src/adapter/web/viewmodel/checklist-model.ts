// 格子清單元件負責組成系統檢查、人工確認與操作步驟。
import { copy } from "../../../copy/index.ts";
import { K, type MessageKey } from "../../../domain/copy-keys.ts";
import {
  findCapabilities,
  type CardView,
  type CheckDisplay,
} from "../../../usecase/describe-progress.ts";
import type { AppState } from "./app-state.ts";
import { rowButtons, type ButtonModel } from "./button-model.ts";

// 不 import View 的型別，讓 Presenter 保持獨立；若多吐 View 畫不出的語氣，typecheck 會在傳遞處報錯。
export type VerifiedBy = "system" | "manual";

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
  readonly stepId: string | undefined;
  // 有 proofValue 才畫貼回輸入框；勾選結果仍寫進 eyeChecked。
  readonly proofValue: string | undefined;
}

export interface ChecklistStep {
  readonly id: string;
  readonly title: string;
  readonly button: ButtonModel;
  readonly rows: readonly ChecklistRow[];
}

// 指令停下來等人打字的那一刻。
export interface PromptModel {
  readonly submitLabel: string;
  // 指令輸出裡的那個授權網址。
  //
  // ⚠️ 一定要抽出來變成可點的連結：我們刻意擋掉 claude 自動開瀏覽器（它會蓋掉嚮導
  // 頁面，學生找不到回來的路），而擋掉之後唯一的入口就是這裡。只留在原始輸出裡的話
  // 那串網址是折行、不可點的（Mac VM 實測，學生就卡在那）。
  readonly link: { readonly href: string; readonly label: string } | null;
}

export interface ChecklistModel {
  readonly title: string;
  readonly done: number;
  readonly total: number;
  readonly rows: readonly ChecklistRow[];
  readonly steps: readonly ChecklistStep[];
}

// 程式判定的格與學生完成的格排在同一張清單裡；有 stepId 的格再掛回自己的步驟。
export function checklistModel(
  state: AppState,
  card: CardView,
  STATUS_HINT: Readonly<Record<CheckDisplay, MessageKey>>,
): ChecklistModel {
  const t = (key: string): string => copy(state.locale, key as MessageKey);

  const system = card.checks.map((check): ChecklistRow => {
    const status = check.status;
    return {
      id: check.id,
      label: t(check.labelKey),
      // 「還沒完成」那句由格子自己決定，其餘狀態共用——只有 missing 的意思會隨
      // 格子而變（沒裝 / 沒登入），ok 與 failed 不會。
      hint: t(
        status === "missing" && check.missingKey !== undefined
          ? check.missingKey
          : STATUS_HINT[status],
      ),
      checked: status === "ok",
      readOnly: true,
      verifiedBy: "system",
      walkthroughId: undefined,
      buttons: rowButtons(check, state),
      stepId: undefined,
      proofValue: undefined,
    };
  });

  const manual = card.capabilities.flatMap((capability): ChecklistRow[] => {
    if (capability.kind === "eye-check") {
      return [
        {
          id: capability.id,
          label: t(capability.promptKey),
          hint: t(capability.detailKey ?? K.hint.manualOnly),
          checked: capability.done,
          readOnly: false,
          verifiedBy: "manual",
          walkthroughId: capability.walkthrough,
          buttons: [],
          stepId: capability.stepId,
          proofValue: undefined,
        },
      ];
    }

    if (capability.kind === "paste-proof") {
      return [
        {
          id: capability.id,
          label: t(capability.promptKey),
          hint: t(capability.detailKey ?? K.hint.manualOnly),
          checked: capability.done,
          readOnly: true,
          verifiedBy: "system",
          walkthroughId: capability.walkthrough,
          buttons: [],
          stepId: capability.stepId,
          proofValue: state.proofValues[capability.id] ?? "",
        },
      ];
    }

    return [];
  });

  const rows = [...system, ...manual];
  const busy = state.runningAction !== null;
  const steps = findCapabilities(card.capabilities, "manual-step").map(
    (step): ChecklistStep => ({
      id: step.id,
      title: t(step.titleKey),
      button: {
        action: step.action,
        label: t(step.buttonKey),
        tone: "accent",
        disabled: busy,
        opensTerminal: true,
      },
      rows: manual.filter((row) => row.stepId === step.id),
    }),
  );

  return {
    title: t(K.card.checklistTitle),
    done: rows.filter((row) => row.checked).length,
    total: rows.length,
    rows,
    steps,
  };
}

export function matchesPasteProof(pasted: string, expected: string): boolean {
  // 圈選很難剛好停在字尾，貼回來時常會黏到空白或換行。
  return pasted.trim() === expected;
}
