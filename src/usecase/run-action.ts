import type { Clock, ProcessRunner, RunEvent } from "./ports.ts";

export interface RunActionResult {
  readonly events: readonly RunEvent[];
  readonly success: boolean;
  readonly exitCode?: number;
}

export async function runAction(
  action: string,
  runner: ProcessRunner,
  clock: Clock,
): Promise<RunActionResult> {
  const events: RunEvent[] = [];
  let exitCode: number | undefined;

  for await (const event of runner.run(action)) {
    const stamped = stampEvent(event, clock);
    events.push(stamped);

    if (stamped.kind === "exit") {
      exitCode = stamped.exitCode;
    }
  }

  return exitCode === undefined
    ? { events, success: false }
    : { events, success: exitCode === 0, exitCode };
}

export async function sendActionInput(
  runId: string,
  text: string,
  runner: ProcessRunner,
): Promise<void> {
  await runner.sendInput(runId, text);
}

function stampEvent(event: RunEvent, clock: Clock): RunEvent {
  if (event.exitCode === undefined) {
    return {
      kind: event.kind,
      text: event.text,
      at: clock.now(),
    };
  }

  return {
    kind: event.kind,
    text: event.text,
    at: clock.now(),
    exitCode: event.exitCode,
  };
}
