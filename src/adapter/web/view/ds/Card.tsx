import type { ComponentChildren } from "preact";

// design-system.css 的 .ds-card（第 46 行）：底色、邊框、圓角、陰影、內距全包了，
// 這裡只補「標題 + 右上角狀態」這個每張卡都一樣的骨架。
//
// 徽章沒有對應的 DS class——前一代那顆是自己刻的。所以 tone 只影響我們自己的
// class，不假裝它是設計系統的一部分（見 styles.css 的 .card-badge）。
export type BadgeTone = "neutral" | "ok" | "warn" | "bad";

export interface CardProps {
  title: string;
  badge?: { text: string; tone: BadgeTone };
  logo?: ComponentChildren;
  children: ComponentChildren;
  footer?: ComponentChildren;
}

export function Card({ title, badge, logo, children, footer }: CardProps) {
  return (
    <section class="ds-card task-card">
      <header class="task-card-head">
        {logo}
        <h1>{title}</h1>
        {badge === undefined ? null : (
          <span class={`card-badge card-badge--${badge.tone}`}>{badge.text}</span>
        )}
      </header>
      {children}
      {footer === undefined ? null : <footer class="task-card-foot">{footer}</footer>}
    </section>
  );
}
