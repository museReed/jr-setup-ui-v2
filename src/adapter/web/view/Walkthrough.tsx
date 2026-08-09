import { useState } from "preact/hooks";

import { renderMock, type MockVisual } from "./mocks.ts";

// 「怎麼做」彈窗。
//
// 主節點一律是「你要做」——只看主節點就走得完整件事，所以主節點沒有 kind。
// kids 是那個動作的附註：see 會看到 / warn 別做 / miss 沒發生的話。點了才展開，
// 不然一次攤十幾條，學生會直接放棄。
export interface WalkthroughKid {
  id: string;
  kind: "see" | "warn" | "miss";
  title: string;
  detail?: string;
  visual?: MockVisual | null;
}

export interface WalkthroughStep {
  id: string;
  title: string;
  detail?: string;
  visual?: MockVisual | null;
  kids?: WalkthroughKid[];
}

export interface WalkthroughDoc {
  id: string;
  card?: string;
  row?: string;
  steps: WalkthroughStep[];
}

const KID_LABEL: Readonly<Record<WalkthroughKid["kind"], string>> = {
  see: "會看到",
  warn: "別做",
  miss: "沒發生的話",
};

export function Walkthrough({
  doc,
  onClose,
}: {
  doc: WalkthroughDoc;
  onClose: () => void;
}) {
  return (
    <div class="wt-overlay" onClick={onClose}>
      <section
        class="wt-panel"
        role="dialog"
        aria-modal="true"
        aria-label="怎麼做"
        onClick={(event) => event.stopPropagation()}
      >
        <header class="wt-head">
          <strong>怎麼做</strong>
          <button type="button" class="wt-close" onClick={onClose} aria-label="關閉">
            ×
          </button>
        </header>
        <ol class="wt-steps">
          {doc.steps.map((step, index) => (
            <Step key={step.id} step={step} index={index + 1} />
          ))}
        </ol>
      </section>
    </div>
  );
}

function Step({ step, index }: { step: WalkthroughStep; index: number }) {
  const kids = step.kids ?? [];

  return (
    <li class="wt-step">
      <div class="wt-step-head">
        <span class="wt-num">{index}</span>
        <div>
          <div class="wt-title">{step.title}</div>
          {step.detail === undefined ? null : <p class="wt-detail">{step.detail}</p>}
        </div>
      </div>
      <Visual visual={step.visual} />
      {kids.map((kid) => (
        <Kid key={kid.id} kid={kid} />
      ))}
    </li>
  );
}

function Kid({ kid }: { kid: WalkthroughKid }) {
  const [open, setOpen] = useState(false);

  return (
    <div class={`wt-kid wt-kid--${kid.kind}`}>
      <button type="button" class="wt-kid-head" onClick={() => setOpen(!open)}>
        <span class="wt-kid-tag">{KID_LABEL[kid.kind]}</span>
        <span>{kid.title}</span>
        <span class="wt-kid-caret">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div class="wt-kid-body">
          {kid.detail === undefined ? null : <p class="wt-detail">{kid.detail}</p>}
          <Visual visual={kid.visual} />
        </div>
      ) : null}
    </div>
  );
}

function Visual({ visual }: { visual: MockVisual | null | undefined }) {
  if (visual === null || visual === undefined || visual.type !== "mock") {
    return null;
  }

  return (
    <figure class="wt-visual">
      {/* mocks 只回字串、不碰 DOM，這樣嚮導與編輯器共用同一份。內容是我們自己
          repo 裡的 JSON，不是使用者輸入；renderMock 也對每個欄位做過跳脫。 */}
      <div dangerouslySetInnerHTML={{ __html: renderMock(visual) }} />
      {visual.caption === undefined ? null : (
        <figcaption>{visual.caption}</figcaption>
      )}
    </figure>
  );
}
