import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import type { StateBody } from "./api.ts";

// 三張卡的假伺服器。這一組測的是「開頁時停在哪一張、網址被寫成什麼」，
// 不是 API 本身，所以回應固定。
const stateBody: StateBody = {
  cards: [
    {
      id: "claude",
      sectionId: "env",
      labelKey: "card.claude",
      logoId: "logo-claude",
      display: "untouched",
      complete: false,
      canAdvance: false,
      canSkip: false,
      visited: false,
      checks: [],
      capabilities: [],
    },
    {
      id: "codex",
      sectionId: "env",
      labelKey: "card.codex",
      logoId: "logo-openai",
      display: "untouched",
      complete: false,
      canAdvance: false,
      canSkip: false,
      visited: false,
      checks: [],
      capabilities: [],
    },
    {
      id: "guardrails",
      sectionId: "rules",
      labelKey: "card.guardrails",
      logoId: "logo-claude",
      display: "untouched",
      complete: false,
      canAdvance: false,
      canSkip: false,
      visited: false,
      checks: [],
      capabilities: [],
    },
  ],
  platform: "mac",
};

const visited: string[] = [];
let url = "http://localhost:7430/";

beforeEach(() => {
  visited.length = 0;
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
    location: {
      get href() {
        return url;
      },
      get search() {
        return new URL(url).search;
      },
    },
    history: {
      replaceState: (_state: unknown, _title: string, next: URL | string) => {
        url = String(next);
      },
    },
    fetch: async (input: string | URL, init?: RequestInit) => {
      const path = String(input);

      if (path === "/api/visit") {
        visited.push(JSON.parse(String(init?.body)).cardId);
      }

      return {
        ok: true,
        status: 200,
        json: async () => stateBody,
      } as unknown as Response;
    },
  });
});

async function loadWith(href: string): Promise<{ activeIndex: number }> {
  url = href;
  const { createStore } = await import("./store.ts");
  const store = createStore();
  await store.load();
  return store.get();
}

test("網址帶 ?card=codex 時開頁就停在 Codex 那張，並且 visit 的是它", async () => {
  const state = await loadWith("http://localhost:7430/?card=codex");

  assert.equal(state.activeIndex, 1);
  assert.deepEqual(visited, ["codex"]);
});

test("網址帶 ?card=3 時停在第三張（1-based）", async () => {
  const state = await loadWith("http://localhost:7430/?card=3");

  assert.equal(state.activeIndex, 2);
  assert.deepEqual(visited, ["guardrails"]);
});

test("沒帶參數時停在第一張，而且網址被補成它的 id", async () => {
  const state = await loadWith("http://localhost:7430/");

  assert.equal(state.activeIndex, 0);
  assert.equal(new URL(url).searchParams.get("card"), "claude");
});

// 數字會隨卡片增減漂移，所以寫回網址的一律是 id——今天複製的連結明天還要指到同一張。
test("用數字進來時，網址會被換成那張卡的 id", async () => {
  await loadWith("http://localhost:7430/?card=2");

  assert.equal(new URL(url).searchParams.get("card"), "codex");
});

test("按下一張時網址跟著換", async () => {
  url = "http://localhost:7430/?card=claude";
  const { createStore } = await import("./store.ts");
  const store = createStore();
  await store.load();

  await store.goNext();

  assert.equal(new URL(url).searchParams.get("card"), "codex");
});
