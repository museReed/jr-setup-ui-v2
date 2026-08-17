import assert from "node:assert/strict";
import test from "node:test";

import {
  claudeCodeCard,
  FULLSCREEN_PROOF,
} from "../../../domain/cards/claude-code.ts";
import { codexCliCard } from "../../../domain/cards/codex-cli.ts";
import { CARDS } from "../../../domain/cards/index.ts";
import type { CheckId, CheckStatus } from "../../../domain/check.ts";
import { K } from "../../../domain/copy-keys.ts";
import { describeCards } from "../../../usecase/describe-progress.ts";
import { cardModel, matchesPasteProof, type AppState } from "./card-model.ts";

// ViewModel 是純函式：不碰 DOM、不發請求，所以在 Node 裡直接測得動。
// 前一代這些判斷住在 2525 行的接線層裡，只能靠 regex 掃原始碼守。

const MANUAL_DONE = ["fullscreen-yes", "fullscreen-mouse", "fullscreen-copy"];

test("按鈕掛在它負責的那一格，不是卡片底下", () => {
  const model = cardModel(appState({ claude: "missing", "claude-auth": "missing" }, {}));
  const [cli, auth] = model.checklist.rows;

  assert.deepEqual(cli?.buttons.map((button) => button.label), [
    "安裝",
    "開終端驗證",
  ]);
  assert.deepEqual(auth?.buttons.map((button) => button.label), ["登入"]);
  assert.deepEqual(
    model.checklist.steps.map((step) => step.button.label),
    ["開啟 Claude Code", "開啟並送出測試句"],
  );
  // 卡片底下只剩真正作用在整張卡上的那顆。
  assert.deepEqual(model.cardButtons.map((button) => button.label), ["再 check 一次"]);
});

test("每個步驟只掛著 stepId 指向自己的格子", () => {
  const model = cardModel(appState({ claude: "ok", "claude-auth": "ok" }, {}));

  assert.deepEqual(
    model.checklist.steps.map((step) => ({
      id: step.id,
      rows: step.rows.map((row) => row.id),
    })),
    [
      { id: "fullscreen-open", rows: ["fullscreen-yes", "fullscreen-mouse"] },
      { id: "fullscreen-proof", rows: ["fullscreen-copy"] },
    ],
  );
});

test("貼回驗證會容忍前後空白，但錯誤代碼不會通過", () => {
  assert.equal(matchesPasteProof(` \n${FULLSCREEN_PROOF}\t`, FULLSCREEN_PROOF), true);
  assert.equal(matchesPasteProof("wrong-code", FULLSCREEN_PROOF), false);
  assert.equal(matchesPasteProof("", FULLSCREEN_PROOF), false);
});

test("貼回輸入框顯示 store 裡尚未送完的原文", () => {
  const text = "打到一半 ";
  const model = cardModel({
    ...appState({ claude: "ok" }, {}),
    proofValues: { "fullscreen-copy": text },
  });

  assert.equal(
    model.checklist.rows.find((row) => row.id === "fullscreen-copy")?.proofValue,
    text,
  );
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

// 這題守每一格自己的 missing 文案，也守住沒有覆寫的格仍沿用共用文案。
test("登入未完成說還沒登入，CLI 未完成仍說還沒安裝", () => {
  const model = cardModel(
    appState({ claude: "missing", "claude-auth": "missing" }, {}),
  );

  assert.equal(model.checklist.rows[1]?.hint, "還沒登入");
  assert.equal(model.checklist.rows[0]?.hint, "還沒安裝");
});

test("驗過又完成三格才算完成", () => {
  const model = cardModel(
    appState(
      { claude: "ok", "claude-auth": "ok" },
      { verified: ["claude"], attempted: ["claude"], eyeChecked: MANUAL_DONE },
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
      { attempted: ["claude"], eyeChecked: MANUAL_DONE },
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
test("程式判定與貼回格唯讀，兩個眼睛格可以勾", () => {
  const model = cardModel(appState({ claude: "ok" }, {}));

  assert.deepEqual(
    model.checklist.rows.map((row) => row.readOnly),
    [true, true, false, false, true],
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

// 這兩題守的是「終端視窗被關掉之後學生按不動任何東西」那個坑：跑的時候要給得出
// 一條主動結束的路，沒在跑的時候不要有那顆按鈕誤導人。
test("還在跑的時候給得出取消", () => {
  const model = cardModel({
    ...appState({ claude: "missing" }, {}),
    runningAction: "verify-claude",
    runningRunId: "claude",
  });

  assert.equal(model.cancel?.label, "取消這一輪");
});

test("沒在跑就沒有取消鈕", () => {
  assert.equal(cardModel(appState({ claude: "missing" }, {})).cancel, null);
});

// 這題守輸入區只在目前這一輪真的等待輸入時出現。
test("這一輪要等輸入時才有輸入區", () => {
  const waiting = cardModel({
    ...appState({ claude: "ok" }, {}),
    runningAcceptsInput: true,
  });
  const notWaiting = cardModel({
    ...appState({ claude: "ok" }, {}),
    runningAcceptsInput: false,
  });

  assert.notEqual(waiting.prompt, null);
  assert.equal(waiting.prompt?.submitLabel, "送出");
  assert.equal(notWaiting.prompt, null);
});

// 這題守登入重跑後要用最新一輪的網址，否則貼回來的授權碼會對不上。
test("授權連結取輸出裡的最後一個網址，不是第一個", () => {
  const model = cardModel({
    ...appState({ claude: "ok" }, {}),
    terminal: [
      {
        source: "output",
        text: "請開啟 https://example.com/previous",
        kind: "output",
        run: 1,
      },
      {
        source: "output",
        text: "請開啟 https://example.com/current",
        kind: "output",
        run: 2,
      },
    ],
    runningAcceptsInput: true,
  });

  assert.equal(model.prompt?.link?.href, "https://example.com/current");
});

test("授權網址被 ANSI 色碼包住時不會把 escape 序列或尾端標點放進 href", () => {
  const model = cardModel({
    ...appState({ claude: "ok" }, {}),
    terminal: [
      {
        source: "output",
        text: "請開啟 \u001b[36mhttps://auth.openai.com/authorize\u001b[0m.,)",
        kind: "output",
        run: 1,
      },
    ],
    runningAcceptsInput: true,
  });

  assert.equal(model.prompt?.link?.href, "https://auth.openai.com/authorize");
});

test("Codex 卡使用 OpenAI logo，而 Claude 卡保留 Claude logo", () => {
  const claude = cardModel(appState({ claude: "ok" }, {}));
  const codex = cardModel(appState({ codex: "ok" }, {}, [codexCliCard]));

  assert.equal(codex.logoId, "logo-openai");
  assert.equal(claude.logoId, "logo-claude");
});

test("Codex 登入連結使用瀏覽器未開時的 OpenAI 備援文案", () => {
  const model = cardModel({
    ...appState({ codex: "ok", "codex-auth": "missing" }, {}, [codexCliCard]),
    terminal: [
      {
        source: "output",
        text: "https://auth.openai.com/authorize",
        kind: "output",
        run: 1,
      },
    ],
    runningAcceptsInput: true,
  });

  assert.equal(
    model.prompt?.link?.label,
    "瀏覽器沒開？點這裡開啟 OpenAI 授權頁",
  );
});

test("Codex 卡排在 Claude Code 之後且 guardrails 之前", () => {
  assert.deepEqual(
    CARDS.map((card) => card.id),
    ["claude", "codex", "guardrails"],
  );
});

function appState(
  statuses: Record<CheckId, CheckStatus>,
  sets: {
    verified?: CheckId[];
    attempted?: CheckId[];
    eyeChecked?: string[];
  },
  cards = [claudeCodeCard],
): AppState {
  const progress: Parameters<typeof describeCards>[1] = {
    statuses: new Map(Object.entries(statuses)),
    verified: new Set(sets.verified ?? []),
    attempted: new Set(sets.attempted ?? []),
    eyeChecked: new Set(sets.eyeChecked ?? []),
    visited: new Set(),
    skipped: new Set(),
  };

  return {
    cards: describeCards(cards, progress),
    activeIndex: 0,
    locale: "zh-TW",
    platform: "mac",
    proofValues: {},
    terminal: [],
    runningAction: null,
    runningRunId: null,
    runningAcceptsInput: false,
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
