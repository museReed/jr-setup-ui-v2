import { LOCALES, type Locale } from "../../../../copy/index.ts";

// 語言切換。放在畫面右上角——學生第一眼看不懂的時候，那是他會找的地方。
//
// 用按鈕列不用下拉選單：三個選項而已，下拉要點兩下才看得到有哪些語言，
// 而「看不懂現在這個語言」的人正是最需要一眼看到選項的人。
export function LocaleSwitch({
  locale,
  onSelect,
}: {
  locale: Locale;
  onSelect: (locale: Locale) => void;
}) {
  return (
    <div class="locale-switch" role="group" aria-label="Language">
      {LOCALES.map((option) => (
        <button
          key={option.id}
          type="button"
          class={option.id === locale ? "locale-option is-current" : "locale-option"}
          aria-pressed={option.id === locale}
          onClick={() => onSelect(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
