import type { MessageKey } from "../domain/copy-keys.ts";

// ⚠️ 型別是 Record<MessageKey, string> 不是 Partial：漏翻一個代號就是 typecheck 紅，
// 不是上線之後畫面上冒出一段別的語言。
//
// （反過來不成立：多出來的代號不會報錯。刪掉一格時記得順手清這裡的孤兒條目。）
export const zhTW: Record<MessageKey, string> = {
  "check.claude": "Claude Code CLI",
  "check.claude-auth": "Claude Code 登入狀態",

  "check.hook": "一次只跑一個指令",
  "check.allowlist": "常用指令不用每次問你",

  "manual-step.fullscreen-open-title": "第一步：開一個視窗，把這兩件做完",
  "manual-step.fullscreen-open-button": "開啟 Claude Code",
  "eye.fullscreen-yes": "跳出方框時按 1. Yes, try it",
  "eye.fullscreen-yes-detail": "畫面會整個重畫一次，方框消失",
  "eye.fullscreen-mouse": "打一句話，用滑鼠點那句話中間",
  "eye.fullscreen-mouse-detail":
    "就在剛才那個視窗裡；游標會跳到你點的位置，不用按左右鍵移過去",
  "manual-step.fullscreen-proof-title": "第二步：再開一個，圈選代碼貼回來",
  "manual-step.fullscreen-proof-button": "開啟並送出測試句",
  "eye.fullscreen-copy": "圈選代碼那一行，貼進下面的欄位",
  "eye.fullscreen-copy-detail":
    "放開滑鼠就複製好了，不要按 Ctrl+C——在這個模式下它是中斷執行",

  "badge.untouched": "還沒開始",
  "badge.visited-incomplete": "進行中",
  "badge.complete": "已完成",
  "badge.failed": "驗證沒過",

  "status.missing": "還沒安裝",
  "status.not-logged-in": "還沒登入",
  // 中間那一態是整套設計的重點：結構齊全不等於行為生效。
  "status.unverified": "裝好了，還沒驗過真的生效",
  "status.ok": "驗過生效",
  "status.failed": "驗過，但沒通過",

  "action.install": "安裝",
  "action.reinstall": "重新安裝",
  "action.login": "登入",
  "action.relogin": "重新登入",
  "action.verify-terminal": "開終端驗證",
  "action.verify-auto": "驗證",
  "action.rerun-verify": "重跑驗證",
  "action.recheck": "再 check 一次",
  "action.cancel": "取消這一輪",
  "action.submit-code": "送出",
  "action.open-link": "打開登入頁面",

  "card.claude": "Claude Code",
  "card.guardrails": "它什麼時候該停下來問你",
  "card.checklist-title": "這張卡要完成的事",
  "card.advance-done": "這張做完了",
  "card.advance-loose": "可以往下一張，但這張還沒完成",
  "card.advance-blocked": "上面幾格做完才能往下一張",
  "card.next": "下一張",
  "card.skip": "先跳過這張",
  "card.help": "怎麼做",

  "hint.manual-only": "這一格程式看不到，只有你看得到",


  "terminal.title": "現在正在做什麼",
  "terminal.empty": "按上面的按鈕，這裡會即時顯示進度。",

  "mock.unknown": "認不得的畫面類型：",
  "mock.which-button": "（哪顆按鈕）",
  "mock.which-row": "（哪一列）",
  "mock.which-step": "（哪一步）",
  "mock.which-step-item": "（那一步底下的項目）",
  "mock.which-title": "（標題）",
  "mock.terminal-app": "終端機",

  "terminal.raw-summary": "看原始輸出",
  "terminal.raw-empty": "還沒有任何指令跑過。",
  "terminal.copy": "複製",
  "terminal.copied": "已複製",

  "walkthrough.title": "怎麼做",
  "walkthrough.close": "關閉",
  "walkthrough.see": "會看到",
  "walkthrough.warn": "別做",
  "walkthrough.miss": "沒發生的話",

  "run.rechecking": "重新檢查環境狀態…",
  "run.recheck-done": "檢查完成，狀態已更新。",
  "run.done": "完成",
  "run.failed": "沒有成功",
  "run.start-install-claude": "正在安裝 Claude Code。這一步要下載，可能要一兩分鐘。",
  "run.start-login-claude": "正在開始登入。等一下會出現一段網址與代碼，照著做完再回來。",
  "run.start-install-hook": "正在裝「一次只跑一個指令」的攔截器。",
  "run.start-install-allowlist": "正在寫入常用指令的白名單。",
  "run.verify-opened": "已開啟一個新的終端視窗，照裡面的字做完再回來。",
  "run.verify-abandoned":
    "那個終端視窗沒有走完（被關掉，或超過三分鐘沒動作）。這次不算驗證通過，可以再按一次。",
  "run.verify-blocked":
    "這張卡上還有沒裝完的東西，先把每一格都裝好再驗——只裝一半去驗，驗過了也不算數。",
  "run.verify-undeclared": "這一格沒有可以驗的東西。",
};
