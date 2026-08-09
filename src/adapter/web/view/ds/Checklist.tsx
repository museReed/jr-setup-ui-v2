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

// 誰負責驗這一格。這不是裝飾——導覽裡明講「青色＝系統自己驗、橘色＝要你自己看」，
// 顏色要一直成立才有用。
export type VerifiedBy = "system" | "manual";

export interface CheckItemProps {
  checked: boolean;
  // ⚠️ 必須是純字串，不能是任意 children：glitch 的干擾動畫靠 `content:attr(data-text)`
  // 把同一段字複製成兩層（一層青一層橘往反方向錯位），所以那段字要能塞進屬性裡。
  label: string;
  verifiedBy: VerifiedBy;
  hint?: ComponentChildren;
  // 程式判定的那幾格：學生看得到狀態，但不能自己勾。
  // 「能自動判定的就自動判定，勾選欄位越少，學生越不會一排全勾。」
  readOnly?: boolean;
  // 這一格自己的動作。掛在格內而不是卡片底下——留在外面的話，學生仍然要自己配對
  // 哪顆按鈕帶他做哪一格。
  actions?: ComponentChildren;
  // 有編過教學才給這顆。沒有的話不畫——按出一個空彈窗比沒有按鈕更讓人困惑。
  onHelp?: (() => void) | undefined;
  onChange?: ((checked: boolean) => void) | undefined;
}

export function CheckItem({
  checked,
  label,
  verifiedBy,
  hint,
  readOnly = false,
  actions,
  onHelp,
  onChange,
}: CheckItemProps) {
  return (
    // ⚠️ 按鈕不能放在 <label> 裡：點按鈕會連帶觸發 label 的 for，把勾選一起切掉。
    // 所以 label 只包到文字為止，動作排在它旁邊。
    <div class="check-row">
      {/* 唯讀不需要額外的 class：DS 的 glitch 變體已經有
          `.ds-check:has(input:disabled){cursor:not-allowed}`。自己再加一條只會分岔。
          is-system / is-manual 只用來重新指向顏色 token，不覆寫任何 ds-* 規則。 */}
      <label class={verifiedBy === "manual" ? "ds-check is-manual" : "ds-check is-system"}>
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
          {/* 文字要包一層 .ds-check-label 並且把同一段字寫進 data-text——hover 時
              DS 用 content:attr(data-text) 複製成兩層做訊號干擾感。少了這一層，
              動畫不會報錯，只是靜靜地不發生。 */}
          <span class="ds-check-label" data-text={label}>
            {label}
          </span>
          {/* 說明文字掛自己的 class：DS 把勾選後的 small 寫死成青色（不吃 --gl-ink），
              橘的那幾格會變成「標題橘、底下那句青」——兩種顏色本來就是用來分「誰負責
              驗」的，混在同一格裡就沒有意義了。 */}
          {hint === undefined ? null : <small class="check-detail">{hint}</small>}
        </span>
      </label>
      {actions === undefined && onHelp === undefined ? null : (
        <div class="check-row-actions">
          {actions}
          {onHelp === undefined ? null : (
            <button
              type="button"
              class="check-help"
              aria-label="怎麼做"
              title="怎麼做"
              onClick={onHelp}
            >
              ?
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export interface ChecklistProps {
  title: string;
  done: number;
  total: number;
  children: ComponentChildren;
}

// --glitch 是 DS 內建的深色終端變體。前一代整套嚮導都用它——「青色＝系統自己驗、
// 橘色＝要你自己看」那組顏色語彙是靠這個底色才有對比度的。
export function Checklist({ title, done, total, children }: ChecklistProps) {
  // is-complete 會把右上角那顆計數變成成功色（.ds-checklist.is-complete .ds-checklist-count）。
  // 全部勾完才給——這是學生唯一會盯著看的數字。
  const complete = total > 0 && done === total;

  return (
    <div
      class={
        complete
          ? "ds-checklist ds-checklist--glitch is-complete"
          : "ds-checklist ds-checklist--glitch"
      }
    >
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
