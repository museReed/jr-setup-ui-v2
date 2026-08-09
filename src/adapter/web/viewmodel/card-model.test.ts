import assert from "node:assert/strict";
import test from "node:test";

import { claudeCodeCard } from "../../../domain/catalog.ts";
import type { CheckId, CheckStatus } from "../../../domain/check.ts";
import { K } from "../../../domain/copy-keys.ts";
import type { ProgressState } from "../../../domain/progress.ts";
import { cardModel, type AppState } from "./card-model.ts";

// ViewModel 是純函式：不碰 DOM、不發請求，所以在 Node 裡直接測得動。
// 前一代這些判斷住在 2525 行的接線層裡，只能靠 regex 掃原始碼守。

const EYE = "eye-claude-fullscreen";

test("按鈕掛在它負責的那一格，不是卡片底下", () => {
  const model = cardModel(appState({ claude: "missing", "claude-auth": "missing" }, {}));
  const [cli, auth, eye] = model.checklist.rows;

  assert.deepEqual(cli?.buttons.map((button) => button.label), [
    "安裝",
    "開終端驗證",
  ]);
  assert.deepEqual(auth?.buttons.map((button) => button.label), ["登入"]);
  // 人工勾選那格沒有按鈕——它要做的事只有學生自己看得到。
  assert.deepEqual(eye?.buttons, []);
  // 卡片底下只剩真正作用在整張卡上的那顆。
  assert.deepEqual(model.cardButtons.map((button) => button.label), ["再 check 一次"]);
});

test("驗證按鈕帶著它那一格的 checkId", () => {
  const model = cardModel(appState({ claude: "ok" }, {}));
  const verify = model.checklist.rows[0]?.buttons.find(
    (button) => button.label === "開終端驗證",
  );

  assert.equal(verify?.checkId, "claude");
});

test("宣告了驗證的那格才顯示中間態", () => {
  const model = cardModel(appState({ claude: "ok", "claude-auth": "ok" }, {}));

  assert.equal(model.checklist.rows[0]?.hint, "裝好了，還沒驗過真的生效");
  // 登入那格沒有 verify capability，不該被隔壁格連坐
  assert.equal(model.checklist.rows[1]?.hint, "驗過生效");
});

test("驗過又勾了眼睛才算完成", () => {
  const model = cardModel(
    appState(
      { claude: "ok", "claude-auth": "ok" },
      { verified: ["claude"], attempted: ["claude"], eyeChecked: [EYE] },
    ),
  );

  assert.equal(model.badge.text, "已完成");
  assert.equal(model.badge.tone, "ok");
  assert.equal(model.checklist.done, model.checklist.total);
  assert.equal(model.canAdvance, true);
  assert.equal(model.canSkip, false);
});

test("驗證失敗時鎖住下一張，但給一顆不慶祝的逆口", () => {
  const model = cardModel(
    appState(
      { claude: "failed", "claude-auth": "ok" },
      { attempted: ["claude"], eyeChecked: [EYE] },
    ),
  );

  assert.equal(model.badge.text, "驗證沒過");
  assert.equal(model.canAdvance, false);
  assert.equal(model.canSkip, true);
});

test("沒驗過叫「開終端驗證」，驗過才叫「重跑驗證」", () => {
  const before = cardModel(appState({ claude: "ok" }, {}));
  const after = cardModel(appState({ claude: "ok" }, { verified: ["claude"] }));

  assert.equal(before.checklist.rows[0]?.buttons[1]?.label, "開終端驗證");
  assert.equal(after.checklist.rows[0]?.buttons[1]?.label, "重跑驗證");
});

// 程式判定的格不能讓學生自己勾——能自動判定的就自動判定，勾選欄位越少，學生越
// 不會一排全勾。
test("程式判定的格唯讀，只有眼睛那格可以勾", () => {
  const model = cardModel(appState({ claude: "ok" }, {}));

  assert.deepEqual(
    model.checklist.rows.map((row) => row.readOnly),
    [true, true, false],
  );
});

// 指令輸出照原樣、我們自己的話翻代號；顏色兩者都由 ViewModel 決定。
test("終端：指令輸出留原文，我們的話從代號翻出來", () => {
  const model = cardModel({
    ...appState({ claude: "ok" }, {}),
    terminal: [
      { source: "output", text: "added 1 package in 3s", kind: "output" },
      { source: "output", text: "command not found", kind: "error" },
      { source: "notice", messageKey: K.run.done, kind: "done-ok" },
    ],
  });

  assert.deepEqual(
    model.terminalLines.map((line) => line.tone),
    ["plain", "err", "ok"],
  );
  assert.equal(model.terminalLines[0]?.text, "added 1 package in 3s");
  assert.equal(model.terminalLines[2]?.text, "完成");
});

function appState(
  statuses: Record<CheckId, CheckStatus>,
  sets: {
    verified?: CheckId[];
    attempted?: CheckId[];
    eyeChecked?: string[];
  },
): AppState {
  const progress: ProgressState = {
    statuses: new Map(Object.entries(statuses)),
    verified: new Set(sets.verified ?? []),
    attempted: new Set(sets.attempted ?? []),
    eyeChecked: new Set(sets.eyeChecked ?? []),
    visited: new Set(),
    skipped: new Set(),
  };

  return {
    card: claudeCodeCard,
    progress,
    terminal: [],
    runningAction: null,
  };
}
