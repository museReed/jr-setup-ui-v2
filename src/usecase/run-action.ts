import type {
  Clock,
  ProcessRunner,
  RunEvent,
  RunHandle,
} from "./ports.ts";

export interface RunActionResult {
  readonly events: readonly RunEvent[];
  readonly success: boolean;
  readonly exitCode?: number;
}

export function startAction(action: string, runner: ProcessRunner): RunHandle {
  return runner.start(action);
}

// 事件一邊到一邊往外送（onEvent），最後才回報結論。收完才送的話，網頁上的終端
// 要等整個安裝跑完才會出現第一行字——而那正是學生最需要看到「有在動」的幾分鐘。
export async function collectAction(
  handle: RunHandle,
  clock: Clock,
  onEvent?: (event: RunEvent) => void,
): Promise<RunActionResult> {
  const events: RunEvent[] = [];
  let exitCode: number | undefined;

  for await (const event of handle.events) {
    const stamped = stampEvent(event, clock);
    events.push(stamped);
    onEvent?.(stamped);

    if (stamped.kind === "exit") {
      exitCode = stamped.exitCode;
    }
  }

  return exitCode === undefined
    ? { events, success: false }
    : { events, success: exitCode === 0, exitCode };
}

function stampEvent(event: RunEvent, clock: Clock): RunEvent {
  if (event.exitCode === undefined) {
    return { kind: event.kind, text: event.text, at: clock.now() };
  }

  return {
    kind: event.kind,
    text: event.text,
    at: clock.now(),
    exitCode: event.exitCode,
  };
}
