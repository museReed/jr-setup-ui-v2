import assert from "node:assert/strict";
import { test } from "node:test";

import { claudeCodeCard } from "../domain/cards/claude-code.ts";
import { findCapabilities } from "../domain/card.ts";
import { openWorkWindow } from "./open-work-window.ts";
import type { TerminalOpener } from "./ports.ts";

// 卡片自己宣告了哪些開窗動作——測試不寫死字串，免得卡片改宣告時測試還是綠的。
const DECLARED = findCapabilities(claudeCodeCard, "manual-step")[0]?.action ?? "";

function opener(): { port: TerminalOpener; opened: string[] } {
  const opened: string[] = [];

  return {
    opened,
    port: {
      open: async () => ({ completed: false }),
      openWorkWindow: async (action) => {
        opened.push(action);
      },
    },
  };
}

test("卡片宣告過的動作才開得起來", async () => {
  const { port, opened } = opener();

  assert.deepEqual(await openWorkWindow(DECLARED, [claudeCodeCard], port), { ok: true });
  assert.deepEqual(opened, [DECLARED]);
});

// 沒宣告就連視窗都不該開。少了這一條，網頁送什麼字串過來都會被拿去開視窗。
test("沒宣告的動作被擋下來，而且沒有碰到 opener", async () => {
  const { port, opened } = opener();

  assert.deepEqual(await openWorkWindow("rm -rf /", [claudeCodeCard], port), {
    ok: false,
    reason: "undeclared",
  });
  assert.deepEqual(opened, []);
});

test("action 是 null 時當成沒宣告，不丟例外", async () => {
  const { port, opened } = opener();

  assert.deepEqual(await openWorkWindow(null, [claudeCodeCard], port), {
    ok: false,
    reason: "undeclared",
  });
  assert.deepEqual(opened, []);
});
