// 應用程式狀態供各個呈現元件共用同一份畫面輸入。
import type { CardView } from "../../../usecase/describe-progress.ts";
import type { TerminalEntry } from "./terminal-model.ts";

export interface AppState {
  readonly cards: readonly CardView[];
  readonly activeIndex: number;
  // 語言是狀態的一部分，不是模組層級的全域值：切語言就是換一次 state，畫面照
  // 原本那條路重新推導出來，不需要任何「切完記得重畫」的規則。
  readonly locale: "zh-TW" | "zh-CN" | "en";
  // 這台機器是什麼。教學內容的平台過濾靠它（見 walkthrough-model）。
  readonly platform: "mac" | "win" | "other";
  readonly proofValues: Readonly<Record<string, string>>;
  readonly terminal: readonly TerminalEntry[];
  readonly runningAction: string | null;
  // 這一輪的把手。取消要指名取消誰——驗證用的是那一格的 id，跑指令用的是伺服器
  // 發的 runId，兩者共用同一顆按鈕。
  readonly runningRunId: string | null;
  // 這一輪會不會停下來等學生打字（登入要貼授權碼）。
  readonly runningAcceptsInput: boolean;
}
