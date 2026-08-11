import assert from "node:assert/strict";
import test from "node:test";

import type { Clock, ProcessRunner, RunEvent } from "./ports.ts";
import { collectAction, startAction } from "./run-action.ts";

test("collectAction 保持事件順序並回報 exit code", async () => {
  const runner = fakeRunner([
    { kind: "line", text: "start", at: 0 },
    { kind: "error", text: "warn", at: 0 },
    { kind: "exit", text: "done", at: 0, exitCode: 7 },
  ]);
  const clock = fakeClock([100, 101, 102]);

  const result = await collectAction(
    await startAction("install-claude", runner),
    clock,
  );

  assert.deepEqual(result.events, [
    { kind: "line", text: "start", at: 100 },
    { kind: "error", text: "warn", at: 101 },
    { kind: "exit", text: "done", at: 102, exitCode: 7 },
  ]);
  assert.equal(result.success, false);
  assert.equal(result.exitCode, 7);
});

// 這一條守的是「網頁上的終端要邊跑邊出字」：onEvent 必須在事件到達的當下就被叫到，
// 不是等整串收完再一次補送。
test("collectAction 逐筆往外送，不等跑完", async () => {
  const runner = fakeRunner([
    { kind: "line", text: "a", at: 0 },
    { kind: "exit", text: "", at: 0, exitCode: 0 },
  ]);
  const seen: string[] = [];

  const result = await collectAction(
    await startAction("install-claude", runner),
    fakeClock([1, 2]),
    (event) => seen.push(event.text),
  );

  assert.deepEqual(seen, ["a", ""]);
  assert.equal(result.success, true);
});

test("runId 在事件開始流之前就拿得到", async () => {
  const runner = fakeRunner([]);

  const handle = await startAction("login-claude", runner);
  await runner.sendInput(handle.runId, "abc123\n");

  assert.deepEqual(runner.inputs, [{ runId: "run-1", text: "abc123\n" }]);
});

function fakeRunner(events: readonly RunEvent[]): ProcessRunner & {
  inputs: { runId: string; text: string }[];
} {
  const inputs: { runId: string; text: string }[] = [];

  return {
    inputs,
    async start() {
      return {
        runId: "run-1",
        events: (async function* () {
          for (const event of events) {
            yield event;
          }
        })(),
      };
    },
    async sendInput(runId, text) {
      inputs.push({ runId, text });
    },
    async cancel() {},
  };
}

function fakeClock(values: readonly number[]): Clock {
  let index = 0;

  return {
    now() {
      const value = values[index];
      index += 1;

      if (value === undefined) {
        throw new Error("假時鐘的值用完了");
      }

      return value;
    },
  };
}
