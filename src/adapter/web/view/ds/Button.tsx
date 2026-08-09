import type { ComponentChildren, JSX } from "preact";

// design-system.css 的 .ds-btn-fill 契約（第 402-412 行）：
//
//   .ds-btn-fill > svg, .ds-btn-fill > span { position:relative; z-index:1 }
//
// ⚠️ 文字**一定**要包在 <span> 裡。直接放裸文字的話它壓在 ::before 那顆會膨脹的
// 圓底下，hover 時整個字會被填色蓋掉。這是元件存在的第一個理由——這條規矩只寫在
// CSS 裡，每個呼叫端各自記得是遲早會漏的。
//
// 顏色走 --fill-color 這個 custom property，不是靠額外的 class 疊。
export type ButtonTone = "accent" | "success";

export interface ButtonProps {
  children: ComponentChildren;
  tone?: ButtonTone;
  icon?: JSX.Element;
  disabled?: boolean;
  onClick?: () => void;
}

export function Button({
  children,
  tone = "accent",
  icon,
  disabled = false,
  onClick,
}: ButtonProps) {
  return (
    <button
      type="button"
      class={tone === "success" ? "ds-btn-fill ds-btn-fill--success" : "ds-btn-fill"}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
