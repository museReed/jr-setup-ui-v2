import assert from "node:assert/strict";
import test from "node:test";

import { claudeCodeCard, CLAUDE_CHECK_LABELS } from "../../../domain/catalog.ts";
import type { CheckId, CheckStatus } from "../../../domain/check.ts";
import type { ProgressState } from "../../../domain/progress.ts";
import { cardModel, type AppState } from "./card-model.ts";

// ViewModel 是純函式：不碰 DOM、不發請求，所以在 Node 裡直接測得動。
// 前一代這些判斷住在 2525 行的接線層裡，只能靠 regex 掃原始碼守。

test("兩格都裝好但沒驗過時，清單顯示中間態、下一張不放行", () => {
  const model = cardModel(
    appState({ claude: "ok", "claude-auth": "ok" }, {}),
  );

  assert.deepEqual(
    model.checklist.map((row) => row.status),
    ["unverified", "unverified"],
  );
  assert.equal(model.badge, "還沒開始");
  assert.equal(model.canAdvance, false);
});

test("驗過又勾了眼睛才算完成", () => {
  const model = cardModel(
    appState(
      { claude: "ok", "claude-auth": "ok" },
      {
        verified: ["claude", "claude-auth"],
        attempted: ["claude", "claude-auth"],
        eyeChecked: ["eye-claude-fullscreen"],
      },
    ),
  );

  assert.equal(model.badge, "已完成");
  assert.equal(model.canAdvance, true);
  assert.equal(model.canSkip, false);
});

test("驗證失敗時鎖住下一張，但給一顆不慶祝的逆口", () => {
  const model = cardModel(
    appState(
      { claude: "ok", "claude-auth": "failed" },
      { attempted: ["claude", "claude-auth"] },
    ),
  );

  assert.equal(model.badge, "驗證沒過");
  assert.equal(model.canAdvance, false);
  assert.equal(model.canSkip, true);
});

// 這一條守的是 PRD D1：按鈕從 capabilities 長出來，不是從「這張卡是什麼種類」。
test("按鈕來自卡片宣告的能力", () => {
  const model = cardModel(appState({ claude: "missing" }, {}));

  assert.deepEqual(
    model.buttons.map((button) => button.action),
    ["install-claude", "login-claude", "verify-claude", "recheck"],
  );
  assert.equal(model.buttons[0]?.label, "安裝");
});

test("沒驗過叫「開終端驗證」，驗過才叫「重跑驗證」", () => {
  const before = cardModel(appState({ claude: "ok" }, {}));
  const after = cardModel(appState({ claude: "ok" }, { verified: ["claude"] }));

  assert.equal(before.buttons[2]?.label, "開終端驗證");
  assert.equal(after.buttons[2]?.label, "重跑驗證");
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
    labels: CLAUDE_CHECK_LABELS,
    progress,
    terminalLines: [],
    runningAction: null,
  };
}
