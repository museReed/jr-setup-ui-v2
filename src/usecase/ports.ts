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

export interface TerminalOpener {
  open(action: string): Promise<void>;
}

export interface Clock {
  now(): number;
}
