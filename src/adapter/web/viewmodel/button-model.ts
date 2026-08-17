// 按鈕元件負責從能力與執行狀態推導每顆操作按鈕。
import { copy, type Locale } from "../../../copy/index.ts";
import { K, type MessageKey } from "../../../domain/copy-keys.ts";
import type {
  CheckView,
  ViewCapability,
} from "../../../usecase/describe-progress.ts";
import type { AppState } from "./app-state.ts";
import type { TerminalEntry } from "./terminal-model.ts";

// 不 import View 的型別，讓 Presenter 保持獨立；若多吐 View 畫不出的語氣，typecheck 會在傳遞處報錯。
export type ButtonTone = "accent" | "success";

export interface ButtonModel {
  readonly action: string;
  readonly label: string;
  readonly tone: ButtonTone;
  readonly disabled: boolean;
  // 驗證要指名是哪一格。少了它，卡片上有兩個驗證時第二格會拿隔壁格的參數去跑。
  readonly checkId?: string;
  // 按下去的那一刻要講的那句白話（驗證那條的訊息由伺服器發，所以沒有）。
  readonly startKey?: MessageKey;
  // 這顆只開工作視窗，不建立會等待完成的 run。
  readonly opensTerminal?: boolean;
}

// ⚠️ 只讀 capabilities，不問「這張卡是什麼種類」。
export function rowButtons(check: CheckView, state: AppState): ButtonModel[] {
  const { runningAction } = state;
  const t = (key: string): string => copy(state.locale, key as MessageKey);
  const busy = runningAction !== null;
  const installed = check.status !== "missing";

  return check.capabilities.flatMap((capability): ButtonModel[] => {
    if (capability.kind === "install") {
      return [
        {
          action: capability.action,
          label: t(installed ? K.action.reinstall : K.action.install),
          tone: installed ? "success" : "accent",
          disabled: busy,
          startKey: capability.startKey as MessageKey,
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
          startKey: capability.startKey as MessageKey,
        },
      ];
    }

    if (capability.kind === "verify") {
      // 沒驗過叫「開終端驗證」，驗過才叫「重跑驗證」——第一次就寫「重跑」，學生會
      // 以為自己漏掉了前面某一步。
      return [
        {
          action: capability.action,
          label: labelForVerify(capability, check.status === "ok", state.locale),
          tone: "accent",
          disabled: busy,
          checkId: check.id,
        },
      ];
    }

    return [];
  });
}

export function labelForVerify(
  capability: Extract<ViewCapability, { kind: "verify" }>,
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

// 從指令輸出裡把授權網址撈出來。
//
// ⚠️ 從**最後**一行往前找：登入可以重跑，而每一輪的網址都不一樣（帶著那一輪的
// state 與 challenge）。拿到第一個的話學生點的是上一輪的連結，貼回來的碼永遠對不上。
export function findAuthLink(
  entries: readonly TerminalEntry[],
  label: string,
): { href: string; label: string } | null {
  const urls = entries
    .filter((entry) => entry.source === "output")
    .flatMap(
      (entry) =>
        entry.text.replace(/\u001b\[[0-9;]*m/g, "").match(/https?:\/\/\S+/g) ?? [],
    )
    .map((url) => url.replace(/[.,)]+$/, ""));
  const last = urls.at(-1);

  return last === undefined ? null : { href: last, label };
}
