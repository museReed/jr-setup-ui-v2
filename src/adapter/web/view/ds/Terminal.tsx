import type { ComponentChildren } from "preact";

// design-system.css 的 .ds-term 契約（第 94-97、198-203 行）。
//
// 三顆燈是三個 .ds-term-dot，顏色靠 inline style 吃調色盤變數——DS 沒有幫它們
// 各配一個 class，所以顏色只能從呼叫端帶進來。包成元件就不用每個地方各寫一次。
//
// 行的語意色（--prompt / --ok / --err / --dim）是 DS 定義好的四種，別自己另外調色。
export type TerminalTone = "plain" | "ok" | "err" | "dim" | "prompt";

const LINE_CLASS: Readonly<Record<TerminalTone, string>> = {
  plain: "ds-term-line",
  ok: "ds-term-line ds-term-line--ok",
  err: "ds-term-line ds-term-line--err",
  dim: "ds-term-line ds-term-line--dim",
  prompt: "ds-term-line ds-term-line--prompt",
};

export interface TerminalLine {
  readonly text: string;
  readonly tone: TerminalTone;
}

export interface TerminalProps {
  title: string;
  lines: readonly TerminalLine[];
  emptyHint: string;
  // 頂欄右側的位置。前一代把常駐的小人掛在這裡，之後接回來時不用改結構。
  chromeExtra?: ComponentChildren;
}

export function Terminal({ title, lines, emptyHint, chromeExtra }: TerminalProps) {
  return (
    <section class="ds-term ds-term--typing" aria-label="執行狀態">
      <div class="ds-term-chrome">
        <span class="ds-term-dot" style="background: var(--red-4)" aria-hidden="true" />
        <span class="ds-term-dot" style="background: var(--amber-4)" aria-hidden="true" />
        <span class="ds-term-dot" style="background: var(--teal-4)" aria-hidden="true" />
        <span class="term-title">{title}</span>
        {chromeExtra}
      </div>
      <div class="ds-term-body" role="log" aria-live="polite">
        {lines.length === 0 ? (
          <div class={LINE_CLASS.dim}>{emptyHint}</div>
        ) : (
          lines.map((line, index) => (
            <div key={index} class={LINE_CLASS[line.tone]}>
              {line.text}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
