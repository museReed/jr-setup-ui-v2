import { useState } from "preact/hooks";

import { copy, type Locale } from "../../../copy/index.ts";
import { K, type MessageKey } from "../../../domain/copy-keys.ts";
import type { Platform } from "../../../domain/platform.ts";
import {
  walkthroughForPlatform,
  type WalkthroughDoc,
  type WalkthroughKid,
  type WalkthroughStep,
} from "../viewmodel/walkthrough-model.ts";
import { renderMock, type MockVisual } from "./mocks.ts";

// 「怎麼做」彈窗。
//
// 主節點一律是「你要做」——只看主節點就走得完整件事，所以主節點沒有 kind。
// kids 是那個動作的附註：see 會看到 / warn 別做 / miss 沒發生的話。點了才展開，
// 不然一次攤十幾條，學生會直接放棄。
// 形狀與平台過濾住在 viewmodel（純函式，Node 裡測得動）；這裡只負責畫。
export type { WalkthroughDoc } from "../viewmodel/walkthrough-model.ts";

const KID_KEY: Readonly<Record<WalkthroughKid["kind"], MessageKey>> = {
  see: K.walkthrough.see,
  warn: K.walkthrough.warn,
  miss: K.walkthrough.miss,
};

export function Walkthrough({
  doc,
  locale,
  platform,
  onClose,
}: {
  doc: WalkthroughDoc;
  locale: Locale;
  platform: Platform;
  onClose: () => void;
}) {
  const t = (key: MessageKey): string => copy(locale, key);
  // 不是給這台機器看的就不顯示——兩條都畫的話，學生要自己判斷哪條是給他的。
  const shown = walkthroughForPlatform(doc, platform);
  return (
    <div class="wt-overlay" onClick={onClose}>
      <section
        class="wt-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t(K.walkthrough.title)}
        onClick={(event) => event.stopPropagation()}
      >
        <header class="wt-head">
          <strong>{t(K.walkthrough.title)}</strong>
          <button
            type="button"
            class="wt-close"
            onClick={onClose}
            aria-label={t(K.walkthrough.close)}
          >
            ×
          </button>
        </header>
        <ol class="wt-steps">
          {shown.steps.map((step, index) => (
            <Step key={step.id} step={step} index={index + 1} locale={locale} />
          ))}
        </ol>
      </section>
    </div>
  );
}

function Step({
  step,
  index,
  locale,
}: {
  step: WalkthroughStep;
  index: number;
  locale: Locale;
}) {
  const kids = step.kids ?? [];

  return (
    <li class="wt-step">
      <div class="wt-step-head">
        <span class="wt-num">{index}</span>
        <div>
          <div class="wt-title">{step.title}</div>
          <Detail detail={step.detail} />
        </div>
      </div>
      <Visual visual={step.visual} locale={locale} />
      {kids.map((kid) => (
        <Kid key={kid.id} kid={kid} locale={locale} />
      ))}
    </li>
  );
}

function Kid({ kid, locale }: { kid: WalkthroughKid; locale: Locale }) {
  const [open, setOpen] = useState(false);

  return (
    <div class={`wt-kid wt-kid--${kid.kind}`}>
      <button type="button" class="wt-kid-head" onClick={() => setOpen(!open)}>
        <span class="wt-kid-tag">{copy(locale, KID_KEY[kid.kind])}</span>
        <span>{kid.title}</span>
        <span class="wt-kid-caret">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div class="wt-kid-body">
          <Detail detail={kid.detail} />
          <Visual visual={kid.visual} locale={locale} />
        </div>
      ) : null}
    </div>
  );
}

function Detail({ detail }: { detail: string | string[] | undefined }) {
  if (detail === undefined) {
    return null;
  }

  return (
    <>
      {(Array.isArray(detail) ? detail : [detail]).map((line) => (
        <p key={line} class="wt-detail">
          {line}
        </p>
      ))}
    </>
  );
}

function Visual({
  visual,
  locale,
}: {
  visual: unknown;
  locale: Locale;
}) {
  const mock = visual as MockVisual | null | undefined;

  if (mock === null || mock === undefined || mock.type !== "mock") {
    return null;
  }

  return (
    <figure class="wt-visual">
      {/* mocks 只回字串、不碰 DOM，這樣嚮導與編輯器共用同一份。內容是我們自己
          repo 裡的 JSON，不是使用者輸入；renderMock 也對每個欄位做過跳脫。 */}
      <div dangerouslySetInnerHTML={{ __html: renderMock(mock, locale) }} />
      {mock.caption === undefined ? null : <figcaption>{mock.caption}</figcaption>}
    </figure>
  );
}
