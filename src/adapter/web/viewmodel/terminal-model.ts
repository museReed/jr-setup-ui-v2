// 終端元件負責呈現語意化訊息與保留最近幾輪原始輸出。
import type { MessageKey } from "../../../domain/copy-keys.ts";
import type { TerminalTone } from "../view/ds/index.ts";

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

export const TERMINAL_TONE: Readonly<Record<TerminalEntryKind, TerminalTone>> = {
  output: "plain",
  error: "err",
  note: "dim",
  "done-ok": "ok",
  "done-fail": "err",
};

// 保留最近幾輪，不是只留最後一輪。
//
// 學生遇到失敗的第一個動作就是再按一次——那時失敗那次的輸出已經沒了，而我們要
// 判斷的正是失敗那次。輪與輪之間畫一條線隔開。
const MAX_KEPT_RUNS = 3;
const RUN_SEPARATOR = "────────────";

export function recentRawOutput(entries: readonly TerminalEntry[]): string {
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
