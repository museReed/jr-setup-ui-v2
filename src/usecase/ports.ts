import type { CheckId, CheckStatus } from "../domain/check.ts";

export interface RunEvent {
  kind: "line" | "error" | "exit";
  text: string;
  at: number;
  exitCode?: number;
}

export interface EnvProbe {
  probe(checkId: CheckId): Promise<CheckStatus>;
}

// 一次執行的把手。runId 必須在事件開始流之前就拿得到——登入那條路要在跑的中途
// 把使用者輸入送進同一個子行程，沒有 id 就找不到人。
export interface RunHandle {
  readonly runId: string;
  readonly events: AsyncIterable<RunEvent>;
}

export interface ProcessRunner {
  start(action: string): RunHandle;
  sendInput(runId: string, text: string): Promise<void>;
  cancel(runId: string): Promise<void>;
}

// completed = 學生真的在那個視窗裡把事情做完了（而不是關掉、或放著超時）。
// ⚠️ 這個布林值不能省：少了它，「開過視窗」就會被當成「驗證通過」——那正是
// wizard-verification-design.md 說的那道間隙，綠燈但沒生效。
export interface TerminalOutcome {
  readonly completed: boolean;
}

export interface TerminalOpener {
  open(action: string): Promise<TerminalOutcome>;
}

export interface Clock {
  now(): number;
}
