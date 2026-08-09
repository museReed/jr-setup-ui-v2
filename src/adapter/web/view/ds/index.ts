// 設計系統的 Preact 包裝層。這一層**沒有任何領域知識**——它不知道什麼是 check、
// 什麼是 capability，只知道 design-system.css 的結構契約。
//
// 每加一張新卡片、新段落都直接用這裡的元件，不要再各自寫一次 class 名：那些 class
// 之間的相鄰／後續兄弟關係只寫在 CSS 選擇器裡，抄第二次就是漏第一次的開始。
export { Button, type ButtonProps, type ButtonTone } from "./Button.tsx";
export { Card, type BadgeTone, type CardProps } from "./Card.tsx";
export {
  CheckItem,
  Checklist,
  type CheckItemProps,
  type ChecklistProps,
  type VerifiedBy,
} from "./Checklist.tsx";
export { Logo, type LogoProps } from "./Logo.tsx";
export {
  Terminal,
  type TerminalLine,
  type TerminalProps,
  type TerminalTone,
} from "./Terminal.tsx";
