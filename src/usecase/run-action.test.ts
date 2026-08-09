import assert from "node:assert/strict";
import test from "node:test";

import type { Clock, ProcessRunner, RunEvent } from "./ports.ts";
import { runAction, sendActionInput } from "./run-action.ts";

test("runAction preserves event order and reports exit code", async () => {
  const runner = fakeRunner([
    { kind: "line", text: "start", at: 0 },
    { kind: "error", text: "warn", at: 0 },
    { kind: "exit", text: "done", at: 0, exitCode: 7 },
  ]);
  const clock = fakeClock([100, 101, 102]);

  const result = await runAction("install-claude", runner, clock);

  assert.deepEqual(result.events, [
    { kind: "line", text: "start", at: 100 },
    { kind: "error", text: "warn", at: 101 },
    { kind: "exit", text: "done", at: 102, exitCode: 7 },
  ]);
  assert.equal(result.success, false);
  assert.equal(result.exitCode, 7);
});

test("sendActionInput delegates login input to the runner", async () => {
  const runner = fakeRunner([]);

  await sendActionInput("login-run", "abc123\n", runner);

  assert.deepEqual(runner.inputs, [{ runId: "login-run", text: "abc123\n" }]);
});

function fakeRunner(events: readonly RunEvent[]): ProcessRunner & {
  inputs: { runId: string; text: string }[];
} {
  const inputs: { runId: string; text: string }[] = [];

  return {
    inputs,
    async *run() {
      for (const event of events) {
        yield event;
      }
    },
    async sendInput(runId, text) {
      inputs.push({ runId, text });
    },
  };
}

function fakeClock(values: readonly number[]): Clock {
  let index = 0;

  return {
    now() {
      const value = values[index];
      index += 1;

      if (value === undefined) {
        throw new Error("Fake clock ran out of values");
      }

      return value;
    },
  };
}
