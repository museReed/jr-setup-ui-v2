import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveCardIndex } from "./card-route.ts";

const CARDS = [{ id: "claude" }, { id: "codex" }, { id: "guardrails" }];

test("網址帶卡片 id 就停在那張", () => {
  assert.equal(resolveCardIndex(CARDS, "codex"), 1);
});

test("網址帶數字時是 1-based，跟畫面右上角那個「第幾張」同一個數", () => {
  assert.equal(resolveCardIndex(CARDS, "2"), 1);
});

test("沒帶參數就停在第一張", () => {
  assert.equal(resolveCardIndex(CARDS, null), 0);
});

test("認不得的 id 停在第一張，不是空畫面", () => {
  assert.equal(resolveCardIndex(CARDS, "no-such-card"), 0);
});

test("數字超出張數就停在第一張", () => {
  assert.equal(resolveCardIndex(CARDS, "99"), 0);
  assert.equal(resolveCardIndex(CARDS, "0"), 0);
});

test("半個數字（2abc、2.5）不算數，停在第一張", () => {
  assert.equal(resolveCardIndex(CARDS, "2abc"), 0);
  assert.equal(resolveCardIndex(CARDS, "2.5"), 0);
});

// id 純數字時 id 先贏——不然那張卡永遠只能靠位置找，而位置會漂移。
test("id 剛好長得像數字時，先當 id 比對", () => {
  assert.equal(resolveCardIndex([{ id: "a" }, { id: "1" }], "1"), 1);
});
