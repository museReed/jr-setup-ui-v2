import type { Platform } from "../../../domain/platform.ts";

export interface WalkthroughKid {
  id: string;
  kind: "see" | "warn" | "miss";
  title: string;
  detail?: string | string[];
  visual?: unknown;
  // 只給某個平台看的那幾條。「去 Dock 找」與「看工作列在閃」是兩件不同的事，
  // 兩條都顯示的話學生要自己判斷哪條是給他的——那正是教學不該留給他的工作。
  only?: string;
}

export interface WalkthroughStep {
  id: string;
  title: string;
  detail?: string | string[];
  visual?: unknown;
  kids?: WalkthroughKid[];
  only?: string;
}

export interface WalkthroughDoc {
  id: string;
  card?: string;
  steps: WalkthroughStep[];
}

// 純函式：文件與平台進去，這台機器該看的那份出來。可以在 Node 裡直接測。
export function walkthroughForPlatform(
  doc: WalkthroughDoc,
  platform: Platform,
): WalkthroughDoc {
  return {
    ...doc,
    steps: doc.steps.filter((step) => showsOn(step.only, platform)).map((step) => ({
      ...step,
      kids: (step.kids ?? []).filter((kid) => showsOn(kid.only, platform)),
    })),
  };
}

// 沒標 only 的一律顯示——絕大多數步驟兩個平台都一樣，要求每一條都標會讓內容
// 難編，而漏標的後果是「該看的沒看到」。
function showsOn(only: string | undefined, platform: Platform): boolean {
  return only === undefined || only === platform;
}
