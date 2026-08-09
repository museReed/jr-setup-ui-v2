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

export interface ProcessRunner {
  run(action: string): AsyncIterable<RunEvent>;
  sendInput(runId: string, text: string): Promise<void>;
}

export interface TerminalOpener {
  open(action: string): Promise<void>;
}

export interface Clock {
  now(): number;
}
