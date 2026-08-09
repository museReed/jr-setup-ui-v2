import type { MessageKey } from "../domain/copy-keys.ts";
import { zhTW } from "./zh-TW.ts";

// 目前只有一種語言。多語言真的要上時，這裡換成「看使用者選什麼」——所有呼叫端
// 都已經走這道門，不用再回頭改。
const messages: Record<MessageKey, string> = zhTW;

export function copy(key: MessageKey): string {
  return messages[key];
}
