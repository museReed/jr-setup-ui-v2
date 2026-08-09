import type { ComponentChildren } from "preact";

// design-system.css 的 .ds-checklist / .ds-check 契約（第 307-327 行）。
//
// ⚠️ 三條只寫在 CSS 選擇器裡、轉述就會掉的規矩：
//
//   1. input 與 .ds-check-box 是**相鄰**兄弟（`input:checked + .ds-check-box`）。
//      中間插任何東西，打勾的底色就不會變。
//   2. .ds-check-text 要是 input 的**後續**兄弟（`input:checked ~ .ds-check-text`），
//      勾起來才會變灰加刪除線。
//   3. 打勾那個勾勾是 SVG path 用 stroke-dashoffset 畫出來的，**不是**字元。
//      少了那支 svg，方框會變色但裡面永遠是空的。
//      path 的 d 沿用前一代：M5 12.5 10 17l9-10
const TICK_PATH = "M5 12.5 10 17l9-10";

export interface CheckItemProps {
  checked: boolean;
  children: ComponentChildren;
  hint?: ComponentChildren;
  // 程式判定的那幾格：學生看得到狀態，但不能自己勾。
  // 「能自動判定的就自動判定，勾選欄位越少，學生越不會一排全勾。」
  readOnly?: boolean;
  onChange?: (checked: boolean) => void;
}

export function CheckItem({
  checked,
  children,
  hint,
  readOnly = false,
  onChange,
}: CheckItemProps) {
  return (
    <label class={readOnly ? "ds-check is-readonly" : "ds-check"}>
      <input
        type="checkbox"
        checked={checked}
        disabled={readOnly}
        onChange={(event) => onChange?.(event.currentTarget.checked)}
      />
      <span class="ds-check-box" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d={TICK_PATH} />
        </svg>
      </span>
      <span class="ds-check-text">
        {children}
        {hint === undefined ? null : <small>{hint}</small>}
      </span>
    </label>
  );
}

export interface ChecklistProps {
  title: string;
  done: number;
  total: number;
  children: ComponentChildren;
}

export function Checklist({ title, done, total, children }: ChecklistProps) {
  // is-complete 會把右上角那顆計數變成成功色（.ds-checklist.is-complete .ds-checklist-count）。
  // 全部勾完才給——這是學生唯一會盯著看的數字。
  const complete = total > 0 && done === total;

  return (
    <div class={complete ? "ds-checklist is-complete" : "ds-checklist"}>
      <div class="ds-checklist-head">
        <span class="ds-checklist-title">{title}</span>
        <span class="ds-checklist-count">
          {done} / {total}
        </span>
      </div>
      {children}
    </div>
  );
}
