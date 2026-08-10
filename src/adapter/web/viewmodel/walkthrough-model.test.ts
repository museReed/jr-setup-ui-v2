import assert from "node:assert/strict";
import test from "node:test";

import { walkthroughForPlatform, type WalkthroughDoc } from "./walkthrough-model.ts";

const doc: WalkthroughDoc = {
  id: "probe",
  steps: [
    {
      id: "open",
      title: "開一個新視窗",
      kids: [
        { id: "dock", kind: "see", title: "去 Dock 找", only: "mac" },
        { id: "taskbar", kind: "see", title: "看工作列在閃", only: "win" },
        { id: "printed", kind: "see", title: "畫面印出一行代碼" },
      ],
    },
    { id: "mac-only-step", title: "按 F3 攤開所有視窗", only: "mac" },
  ],
};

test("mac 只看得到 mac 那幾條與共通的", () => {
  const shown = walkthroughForPlatform(doc, "mac");

  assert.deepEqual(
    shown.steps.map((step) => step.id),
    ["open", "mac-only-step"],
  );
  assert.deepEqual(
    shown.steps[0]?.kids?.map((kid) => kid.id),
    ["dock", "printed"],
  );
});

test("win 看不到 mac 那幾條", () => {
  const shown = walkthroughForPlatform(doc, "win");

  assert.deepEqual(
    shown.steps.map((step) => step.id),
    ["open"],
  );
  assert.deepEqual(
    shown.steps[0]?.kids?.map((kid) => kid.id),
    ["taskbar", "printed"],
  );
});

// 沒標 only 的一律顯示。漏標的後果是「該看的沒看到」，比多看一條嚴重。
test("認不得的平台仍看得到沒標平台的那幾條", () => {
  const shown = walkthroughForPlatform(doc, "other");

  assert.deepEqual(
    shown.steps[0]?.kids?.map((kid) => kid.id),
    ["printed"],
  );
});
