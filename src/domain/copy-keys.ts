// 畫面上每一句話的代號。
//
// ⚠️ 這裡只有**代號**，沒有任何一個字。翻譯住在 src/copy/{locale}.ts。
//
// 為什麼代號放 domain：依賴方向。卡片定義要指名「這一格叫什麼」，而翻譯檔要能
// 查得到有哪些代號——代號放內圈，兩邊都往內依賴，domain 仍然不 import 任何人。
//
// 為什麼是常數物件不是裸字串：打錯字會是 typecheck 紅的，而且編輯器點一下就跳到
// 定義。裸字串兩者都做不到。
export const K = {
  check: {
    claude: "check.claude",
    claudeAuth: "check.claude-auth",
  },
  eye: {
    claudeFullscreen: "eye.claude-fullscreen",
  },
  badge: {
    untouched: "badge.untouched",
    visitedIncomplete: "badge.visited-incomplete",
    complete: "badge.complete",
    failed: "badge.failed",
  },
  status: {
    missing: "status.missing",
    unverified: "status.unverified",
    ok: "status.ok",
    failed: "status.failed",
  },
  action: {
    install: "action.install",
    reinstall: "action.reinstall",
    login: "action.login",
    relogin: "action.relogin",
    verifyTerminal: "action.verify-terminal",
    verifyAuto: "action.verify-auto",
    rerunVerify: "action.rerun-verify",
    recheck: "action.recheck",
  },
  card: {
    // 卡片的名字與格子的名字是兩件事：這張卡叫「Claude Code」，它第一格叫
    // 「Claude Code CLI」。共用一個代號的話卡片標題會變成那一格的名字。
    claude: "card.claude",
    checklistTitle: "card.checklist-title",
    advanceDone: "card.advance-done",
    advanceLoose: "card.advance-loose",
    advanceBlocked: "card.advance-blocked",
    next: "card.next",
    skip: "card.skip",
    help: "card.help",
  },
  hint: {
    manualOnly: "hint.manual-only",
  },
  terminal: {
    title: "terminal.title",
    empty: "terminal.empty",
  },
  walkthrough: {
    title: "walkthrough.title",
    close: "walkthrough.close",
    see: "walkthrough.see",
    warn: "walkthrough.warn",
    miss: "walkthrough.miss",
  },
  run: {
    rechecking: "run.rechecking",
    recheckDone: "run.recheck-done",
    done: "run.done",
    failed: "run.failed",
    verifyOpened: "run.verify-opened",
    verifyAbandoned: "run.verify-abandoned",
  },
} as const;

type Leaves<T> = T extends string ? T : { [P in keyof T]: Leaves<T[P]> }[keyof T];

export type MessageKey = Leaves<typeof K>;
