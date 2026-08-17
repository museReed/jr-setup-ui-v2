import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, test } from "node:test";

import { FULLSCREEN_PROOF, claudeCodeCard } from "../../domain/cards/claude-code.ts";
import { describeCards } from "../../usecase/describe-progress.ts";
import type { StateBody } from "./api.ts";
import { createStore } from "./store.ts";

// 分層寫在文件裡沒人會遵守，寫成測試才擋得住；前一代就是靠一支掃原始碼的
// test/frontend-layers.mjs 在守。
const VIEW_DIR = fileURLToPath(new URL("./view/", import.meta.url));
const CARD_MODEL = fileURLToPath(
  new URL("./viewmodel/card-model.ts", import.meta.url),
);
const VIEW_SOURCES = sourceFiles(VIEW_DIR).map((file) => ({
  file,
  source: readFileSync(file, "utf8"),
}));

test("View 不直接 import api.ts", () => {
  for (const { file, source } of VIEW_SOURCES) {
    assert.doesNotMatch(
      source,
      /(?:from\s+|import\s*)["'][^"']*api\.ts["']/,
      path.relative(VIEW_DIR, file),
    );
  }
});

test("View 不 import domain 的 progress.ts 判定完成狀態", () => {
  for (const { file, source } of VIEW_SOURCES) {
    assert.doesNotMatch(
      source,
      /(?:from\s+|import\s*)["'][^"']*domain\/progress\.ts["']/,
      path.relative(VIEW_DIR, file),
    );
  }
});

test("ViewModel 不 import api.ts，維持純函式", () => {
  assert.doesNotMatch(
    readFileSync(CARD_MODEL, "utf8"),
    /(?:from\s+|import\s*)["'][^"']*api\.ts["']/,
  );
});

interface RequestRecord {
  readonly url: string;
  readonly body: unknown;
}

const requests: RequestRecord[] = [];
const walkthrough = { title: "Fullscreen" };
const stateBody: StateBody = {
  cards: describeCards([claudeCodeCard], {
    statuses: new Map(),
    verified: new Set(),
    attempted: new Set(),
    eyeChecked: new Set(),
    visited: new Set(),
    skipped: new Set(),
  }),
  platform: "mac",
};

beforeEach(() => {
  requests.length = 0;
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
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body === undefined ? undefined : JSON.parse(String(init.body));
      requests.push({ url, body });

      const responseBody =
        url === "/api/state" || url === "/api/visit"
          ? stateBody
          : url === "/api/walkthrough/zh-TW/fullscreen-copy"
            ? walkthrough
            : {};

      return {
        ok: true,
        status: 200,
        json: async () => responseBody,
      } as Response;
    },
  });
});

test("submitProof 保留原文並沿用 ViewModel 的比對規則", async () => {
  const store = createStore();
  await store.load();
  requests.length = 0;
  const text = ` \n${FULLSCREEN_PROOF}\t`;

  await store.submitProof("fullscreen-copy", text);

  assert.equal(store.get().proofValues["fullscreen-copy"], text);
  assert.deepEqual(requests, [
    {
      url: "/api/eye-check",
      body: { id: "fullscreen-copy", checked: true },
    },
  ]);
});

test("loadWalkthrough 用 store 當下的語言抓教學", async () => {
  const store = createStore();

  assert.deepEqual(await store.loadWalkthrough("fullscreen-copy"), walkthrough);
  assert.equal(requests[0]?.url, "/api/walkthrough/zh-TW/fullscreen-copy");
});

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return sourceFiles(file);
    }

    return /\.(?:ts|tsx)$/.test(entry.name) ? [file] : [];
  });
}
