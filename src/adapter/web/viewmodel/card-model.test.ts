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

// 白話進度與原始輸出是兩塊：上面回答「現在正在做什麼」，下面是指令原封不動吐
// 出來的東西。混在一起的話 npm 那幾十行雜訊會把白話進度整個淹掉。
test("終端：白話進度與原始輸出分開，代號在這一層翻成字", () => {
  const model = cardModel({
    ...appState({ claude: "ok" }, {}),
    terminal: [
      { source: "output", text: "added 1 package in 3s", kind: "output", run: 1 },
      { source: "output", text: "command not found", kind: "error", run: 1 },
      { source: "notice", messageKey: K.run.done, kind: "done-ok" },
    ],
  });

  assert.deepEqual(
    model.terminalLines.map((line) => ({ text: line.text, tone: line.tone })),
    [{ text: "完成", tone: "ok" }],
  );
  assert.equal(model.rawOutput, "added 1 package in 3s\ncommand not found");
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
    locale: "zh-TW",
    platform: "mac",
    progress,
    terminal: [],
    runningAction: null,
  };
}

// 學生遇到失敗的第一個動作就是再按一次——那時失敗那次的輸出已經沒了，而我們要
// 判斷的正是失敗那次。
test("原始輸出保留最近三輪，更早的丟掉", () => {
  const model = cardModel({
    ...appState({ claude: "ok" }, {}),
    terminal: [1, 2, 3, 4].map((run) => ({
      source: "output" as const,
      text: `run-${run}`,
      kind: "output" as const,
      run,
    })),
  });

  assert.match(model.rawOutput, /run-2/);
  assert.match(model.rawOutput, /run-4/);
  assert.doesNotMatch(model.rawOutput, /run-1/);
  // 輪與輪之間要看得出分界
  assert.match(model.rawOutput, /────/);
});
