import { spawn, type ChildProcess } from "node:child_process";

import type {
  ProcessRunner,
  RunEvent,
  RunHandle,
} from "../../usecase/ports.ts";
import { findAction } from "./actions.ts";
import type { FakeEnv } from "./fake-env.ts";

// 假環境下每個 action 演什麼，以及演完把哪一格改成什麼。真的去裝一次 CLI 要好幾
// 分鐘，而我們現在要驗的是「畫面會不會跟著動」。
const FAKE_SCRIPTS: Readonly<
  Record<string, { lines: readonly string[]; then: [string, "ok"] }>
> = {
  "install-claude": {
    lines: [
      "npm install -g @anthropic-ai/claude-code",
      "added 1 package in 3s",
    ],
    then: ["claude", "ok"],
  },
  "login-claude": {
    lines: [
      "開啟瀏覽器完成授權…",
      "已登入",
    ],
    then: ["claude-auth", "ok"],
  },
};

export function createProcessRunner(fake: FakeEnv | null): ProcessRunner {
  const children = new Map<string, ChildProcess>();
  let counter = 0;

  return {
    start(action) {
      counter += 1;
      const runId = `run-${counter}`;

      return fake === null
        ? spawnReal(runId, action, children)
        : { runId, events: playFake(action, fake) };
    },

    async sendInput(runId, text) {
      const child = children.get(runId);

      // 送不出去要講。前一代這裡靜靜地什麼都不做，學生貼了授權碼按送出、畫面
      // 沒有任何反應，也沒有任何線索說他貼到了哪裡去。
      if (child?.stdin === undefined || child.stdin === null) {
        throw new Error(`找不到還在跑的執行 ${runId}，輸入沒有送出去`);
      }

      child.stdin.write(text);
    },

    async cancel(runId) {
      children.get(runId)?.kill("SIGTERM");
    },
  };
}

function spawnReal(
  runId: string,
  action: string,
  children: Map<string, ChildProcess>,
): RunHandle {
  const spec = findAction(action);

  if (spec === undefined) {
    return { runId, events: single({ kind: "error", text: `不認得的動作：${action}`, at: 0 }) };
  }

  const child = spawn(spec.cmd, [...spec.args], {
    env: { ...process.env, ...spec.env },
    stdio: [spec.acceptsInput ? "pipe" : "ignore", "pipe", "pipe"],
  });
  children.set(runId, child);

  const queue = createQueue<RunEvent>();

  child.stdout?.on("data", (chunk: Buffer) => {
    for (const line of splitLines(chunk)) {
      queue.push({ kind: "line", text: line, at: 0 });
    }
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    for (const line of splitLines(chunk)) {
      queue.push({ kind: "line", text: line, at: 0 });
    }
  });

  // 指令根本不存在（沒裝 npm、PATH 不對）走的是 error 而不是 exit。前一代漏收這條，
  // 於是最常見的那類失敗在卡片上只顯示「exit code: null」。
  child.on("error", (error: Error) => {
    queue.push({ kind: "error", text: error.message, at: 0 });
    queue.push({ kind: "exit", text: "", at: 0, exitCode: 1 });
    children.delete(runId);
    queue.close();
  });

  child.on("close", (code) => {
    queue.push({ kind: "exit", text: "", at: 0, exitCode: code ?? 1 });
    children.delete(runId);
    queue.close();
  });

  return { runId, events: queue.events };
}

async function* playFake(
  action: string,
  fake: FakeEnv,
): AsyncGenerator<RunEvent> {
  const script = Object.hasOwn(FAKE_SCRIPTS, action)
    ? FAKE_SCRIPTS[action]
    : undefined;

  if (script === undefined) {
    yield { kind: "error", text: `假環境沒有這個動作：${action}`, at: 0 };
    yield { kind: "exit", text: "", at: 0, exitCode: 1 };
    return;
  }

  for (const line of script.lines) {
    // 一次全吐出來的話，畫面上是「什麼都沒有」然後「一次全滿」，看不出是串流。
    await new Promise((resolve) => setTimeout(resolve, 400));
    yield { kind: "line", text: line, at: 0 };
  }

  fake.set(script.then[0], script.then[1]);
  yield { kind: "exit", text: "", at: 0, exitCode: 0 };
}

function splitLines(chunk: Buffer): string[] {
  return chunk
    .toString("utf8")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
}

async function* single(event: RunEvent): AsyncGenerator<RunEvent> {
  yield event;
  yield { kind: "exit", text: "", at: 0, exitCode: 1 };
}

// 把 event handler 的推送轉成 for await 拿得到的序列。
function createQueue<T>(): {
  push(value: T): void;
  close(): void;
  events: AsyncIterable<T>;
} {
  const buffer: T[] = [];
  let waiting: ((value: IteratorResult<T>) => void) | null = null;
  let closed = false;

  return {
    push(value) {
      if (waiting !== null) {
        const resolve = waiting;
        waiting = null;
        resolve({ value, done: false });
        return;
      }

      buffer.push(value);
    },
    close() {
      closed = true;

      if (waiting !== null) {
        const resolve = waiting;
        waiting = null;
        resolve({ value: undefined, done: true });
      }
    },
    events: {
      [Symbol.asyncIterator]() {
        return {
          next(): Promise<IteratorResult<T>> {
            const buffered = buffer.shift();

            if (buffered !== undefined) {
              return Promise.resolve({ value: buffered, done: false });
            }

            if (closed) {
              return Promise.resolve({ value: undefined, done: true });
            }

            return new Promise((resolve) => {
              waiting = resolve;
            });
          },
        };
      },
    },
  };
}
