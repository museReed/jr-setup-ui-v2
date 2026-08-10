import { copy, type Locale } from "../../../copy/index.ts";
import { K } from "../../../domain/copy-keys.ts";

// 畫得出來的畫面。從前一代逐字搬過來（只補型別），刻意不重寫。
//
// 為什麼不用截圖：Claude Code 改版、按鈕搬家，截圖就錯了——而畫面上一切正常，
// 沒有任何測試抓得到。跟這個 repo 一路在防的假綠燈同一類。畫的東西改版不會過期，
// 雙平台三語也只要換字串。
//
// ⚠️ mocks.css 不吃任何設計系統的 token，自己帶色值。靠 DS 變數的話，在編輯器那邊
// 會變成沒有樣式的一團字（前一代實際踩到：Dock 畫成了純文字的 `>_`）。
//
// 只回字串、不碰 DOM——這樣嚮導與編輯器可以共用同一份。
//
// 佔位字（內容沒填時顯示的那些）走 copy()：它們只在教學編錯時才出現，但那正是
// 最需要看得懂的時刻。

export interface MockVisual {
  type: "mock";
  mock: string;
  caption?: string;
  lines?: { text?: string; tone?: string }[];
  title?: string;
  body?: string;
  app?: string;
  button?: string;
  place?: string;
  row?: string;
  row2?: string;
  url?: string;
}

const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function term(visual: MockVisual): string {
  const lines = (visual.lines ?? [])
    .map((line) => {
      const text = esc(line.text) || "&nbsp;";
      const body = line.tone === "sel" ? `<span class="m-sel">${text}</span>` : text;
      return `<div class="m-line m-${esc(line.tone ?? "dim")}">${body}</div>`;
    })
    .join("");
  return `<div class="m-term">
<div class="m-term-bar"><i></i><i></i><i></i></div>
<div class="m-term-body">${lines || '<div class="m-line m-dim">&nbsp;</div>'}</div>
</div>`;
}

// 十四格裡有六格在講「分頁標題有沒有變」——那是整份嚮導最常要學生指認的東西，
// 而它在畫面最上面一條、最容易被當成裝飾略過。所以給它自己的畫面類型。
function titlebar(visual: MockVisual, locale: Locale): string {
  return `<div class="m-titlebar">
<div class="m-tb-chrome"><i></i><i></i><i></i>
<span class="m-tb-title">${esc(visual.title ?? copy(locale, K.mock.whichTitle))}</span>
</div>
<div class="m-tb-body">${esc(visual.body ?? "")}</div>
</div>`;
}

function dock(visual: MockVisual): string {
  const label = esc(visual.app ?? ">_");
  return `<div class="m-dock">
<span class="m-app"></span><span class="m-app"></span>
<span class="m-app is-live"><b>${label}</b><i></i></span>
<span class="m-app"></span>
</div>`;
}

function taskbar(visual: MockVisual, locale: Locale): string {
  const label = esc(visual.app ?? copy(locale, K.mock.terminalApp));
  return `<div class="m-taskbar">
<span class="m-tb-item"></span>
<span class="m-tb-item is-flash">${label}</span>
<span class="m-tb-item"></span>
</div>`;
}

// 嚮導自己的卡片＋那顆按鈕。學生看到的是同一套視覺，指認起來不用翻譯。
//
// ⚠️ place 的 below/row 之分是前一代的擺放規則（一個驗證放清單下面、多個放格內）。
// 本代已經統一成「一律格內」，所以新編的內容應該只用 row 與 step；below 保留是為了
// 讀得懂前一代留下來的 JSON。
function wizard(visual: MockVisual, locale: Locale): string {
  const button = `<span class="m-btn is-target">${esc(visual.button ?? copy(locale, K.mock.whichButton))}</span>`;
  const place = visual.place ?? "below";

  if (place === "step") {
    return `<div class="m-card">
<div class="m-step-head"><span class="m-step-title">${esc(visual.row ?? copy(locale, K.mock.whichStep))}</span>${button}</div>
<div class="m-row m-row-plain"><span class="m-box"></span><span class="m-row-text">${esc(visual.row2 ?? copy(locale, K.mock.whichStepItem))}</span></div>
</div>`;
  }

  if (place === "row") {
    return `<div class="m-card">
<div class="m-row"><span class="m-box"></span><span class="m-row-text">${esc(visual.row ?? copy(locale, K.mock.whichRow))}</span>${button}</div>
</div>`;
  }

  return `<div class="m-card">
<div class="m-row m-row-plain"><span class="m-box"></span><span class="m-row-text">${esc(visual.row ?? copy(locale, K.mock.whichRow))}</span></div>
${visual.row2 ? `<div class="m-row m-row-plain"><span class="m-box"></span><span class="m-row-text">${esc(visual.row2)}</span></div>` : ""}
<div class="m-below">${button}</div>
</div>`;
}

function browser(visual: MockVisual): string {
  return `<div class="m-browser">
<div class="m-browser-bar"><i></i><i></i><i></i><span class="m-url">${esc(visual.url ?? "example.com")}</span></div>
<div class="m-browser-body">${esc(visual.body ?? "")}</div>
</div>`;
}

const RENDERERS: Readonly<
  Record<string, (visual: MockVisual, locale: Locale) => string>
> = {
  term,
  titlebar,
  dock,
  taskbar,
  wizard,
  browser,
};

// 認不得的 mock 回一個講得出問題的框，不要靜靜畫成空白。
export function renderMock(visual: MockVisual, locale: Locale): string {
  const render = Object.hasOwn(RENDERERS, visual.mock) ? RENDERERS[visual.mock] : undefined;

  if (render === undefined) {
    return `<div class="m-unknown">${esc(copy(locale, K.mock.unknown))}${esc(visual.mock)}</div>`;
  }

  return render(visual, locale);
}
