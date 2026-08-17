import type { Card } from "../domain/card.ts";
import { findCapabilities } from "../domain/card.ts";
import type { TerminalOpener } from "./ports.ts";

// 「這張卡有沒有宣告這個開窗動作」是規則，不是 HTTP 的事。
//
// ⚠️ 這個判斷原本寫在 controller 裡，而 controller 同時還直接呼叫 adapter 的
// openWindow——等於轉接層自己做了驗證又自己做了跨程序的事。兩件都搬進來之後，
// controller 剩下的只有「解析請求、叫一個 use case、把結果變成回應」。
export type OpenWorkWindowResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "undeclared" };

export async function openWorkWindow(
  action: string | null,
  cards: readonly Card[],
  opener: TerminalOpener,
): Promise<OpenWorkWindowResult> {
  const declared =
    action !== null &&
    cards.some((card) =>
      findCapabilities(card, "manual-step").some(
        (capability) => capability.action === action,
      ),
    );

  if (!declared) {
    return { ok: false, reason: "undeclared" };
  }

  await opener.openWorkWindow(action);
  return { ok: true };
}
