import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { K } from "../../domain/copy-keys.ts";

// store 直接用 fetch / EventSource / localStorage，Node 裡沒有那三個。
// 這裡只補到「能跑起來」的程度——要測的是被拒絕之後 store 做了什麼。
interface Stub {
  status: number;
  body: unknown;
}

const stub: Stub = { status: 200, body: {} };

beforeEach(() => {
  stub.status = 200;
  stub.body = {};
});

const store = await (async () => {
  const memory = new Map<string, string>();

  Object.assign(globalThis, {
    EventSource: class {
      onmessage: ((message: { data: string }) => void) | null = null;
      close(): void {}
    },
    localStorage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => void memory.set(key, value),
    },
    fetch: async () =>
      ({
        ok: stub.status < 400,
        status: stub.status,
        json: async () => stub.body,
      }) as unknown as Response,
  });

  const { createStore } = await import("./store.ts");
  return createStore();
})();

// 這兩題就是「按下驗證沒有反應」那個 bug：伺服器早就回答了，而畫面把它整個吞掉。
test("伺服器擋下驗證時，它的理由印在白話那一區", async () => {
  stub.status = 409;
  stub.body = { errorKey: K.run.verifyBlocked };

  await store.runAction("verify-allowlist", "allowlist");

  const last = store.get().terminal.at(-1);
  assert.deepEqual(last, {
    source: "notice",
    messageKey: K.run.verifyBlocked,
    kind: "done-fail",
  });
});

test("被擋下來之後按鈕要還給學生，不是整張卡鎖死", async () => {
  stub.status = 409;
  stub.body = { errorKey: K.run.verifyBlocked };

  await store.runAction("verify-allowlist", "allowlist");

  assert.equal(store.get().runningAction, null);
});

test("沒有代號的錯誤：原文進原始輸出，不是被美化成一句「沒有成功」就算了", async () => {
  stub.status = 500;
  stub.body = { error: "boom" };

  await store.runAction("install-hook");

  const texts = store
    .get()
    .terminal.filter((entry) => entry.source === "output")
    .map((entry) => entry.text);
  assert.ok(texts.includes("boom"));
});
