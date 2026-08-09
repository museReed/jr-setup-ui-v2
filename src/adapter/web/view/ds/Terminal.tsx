import { useState } from "preact/hooks";
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

// 原始輸出是**另一塊**，不跟白話進度混在一起。
//
// 上面那塊回答「現在正在做什麼」，是給學生看的；底下這塊是指令原封不動吐出來的
// 東西，是給助教看的。混在一起的話 npm 那幾十行雜訊會把白話進度整個淹掉，而
// 學生最需要的正是那幾句白話。
export interface TerminalRaw {
  readonly text: string;
  readonly summaryLabel: string;
  readonly emptyLabel: string;
  readonly copyLabel: string;
  // 複製成功要說一聲。不說的話學生按完什麼都沒發生，只能再按一次——而剪貼簿
  // 本來就看不見，沒有回饋等於沒有結果。
  readonly copiedLabel: string;
  readonly onCopy: () => void;
}

export interface TerminalProps {
  title: string;
  lines: readonly TerminalLine[];
  emptyHint: string;
  raw?: TerminalRaw;
  // 頂欄右側的位置。前一代把常駐的小人掛在這裡，之後接回來時不用改結構。
  chromeExtra?: ComponentChildren;
}

export function Terminal({ title, lines, emptyHint, raw, chromeExtra }: TerminalProps) {
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

      {raw === undefined ? null : (
        <details class="term-raw">
          <summary>{raw.summaryLabel}</summary>
          {/* 複製鈕放在 summary 外面：放進去的話點它會順手把面板收起來，
              學生按「複製」看到的是內容消失。 */}
          <CopyButton raw={raw} />
          <pre>{raw.text === "" ? raw.emptyLabel : raw.text}</pre>
        </details>
      )}
    </section>
  );
}

// 按完閃一下「已複製」再退回去。這一小段狀態是純呈現的，不值得往 store 送。
function CopyButton({ raw }: { raw: TerminalRaw }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      class="term-raw-copy"
      onClick={() => {
        raw.onCopy();
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? raw.copiedLabel : raw.copyLabel}
    </button>
  );
}
