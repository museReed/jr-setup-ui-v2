import type { MessageKey } from "../domain/copy-keys.ts";
import { en } from "./en.ts";
import { zhCN } from "./zh-CN.ts";
import { zhTW } from "./zh-TW.ts";

export type Locale = "zh-TW" | "zh-CN" | "en";

// 切換器上的順序與名字。每個語言用**自己的語言**寫自己的名字——用中文寫
// 「英文」的話，只看得懂英文的人在選單裡找不到自己那一條。
export const LOCALES: readonly { id: Locale; label: string }[] = [
  { id: "zh-TW", label: "繁體" },
  { id: "zh-CN", label: "简体" },
  { id: "en", label: "EN" },
];

const MESSAGES: Readonly<Record<Locale, Record<MessageKey, string>>> = {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  en,
};

// 純函式：語言與代號進去，字出來。沒有模組層級的「目前語言」——那種隱藏狀態會
// 讓 ViewModel 的測試依賴執行順序。
export function copy(locale: Locale, key: MessageKey): string {
  return MESSAGES[locale][key];
}

export function isLocale(value: unknown): value is Locale {
  return value === "zh-TW" || value === "zh-CN" || value === "en";
}
