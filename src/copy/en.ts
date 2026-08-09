import type { MessageKey } from "../domain/copy-keys.ts";

export const en: Record<MessageKey, string> = {
  "card.claude": "Claude Code",
  "check.claude": "Claude Code CLI",
  "check.claude-auth": "Claude Code sign-in",

  "eye.claude-fullscreen":
    "The first time it runs, it asks which display mode you want — tick this once you've picked",

  "badge.untouched": "Not started",
  "badge.visited-incomplete": "In progress",
  "badge.complete": "Done",
  "badge.failed": "Verification failed",

  "status.missing": "Not installed yet",
  "status.unverified": "Installed, but not verified to actually work",
  "status.ok": "Verified working",
  "status.failed": "Verified, but it didn't pass",

  "action.install": "Install",
  "action.reinstall": "Reinstall",
  "action.login": "Sign in",
  "action.relogin": "Sign in again",
  "action.verify-terminal": "Verify in a terminal",
  "action.verify-auto": "Verify",
  "action.rerun-verify": "Verify again",
  "action.recheck": "Check again",

  "card.checklist-title": "What this card needs",
  "card.advance-done": "This card is done",
  "card.advance-loose": "You can move on, but this card isn't finished",
  "card.advance-blocked": "Finish the rows above to move on",
  "card.next": "Next card",
  "card.skip": "Skip this card for now",
  "card.help": "How to do it",

  "hint.manual-only": "No program can see this one — only you can",

  "terminal.title": "What's happening right now",
  "terminal.empty": "Press a button above and progress shows up here.",

  "mock.unknown": "Unknown screen type: ",
  "mock.which-button": "(which button)",
  "mock.which-row": "(which row)",
  "mock.which-step": "(which step)",
  "mock.which-step-item": "(the item under that step)",
  "mock.which-title": "(title)",
  "mock.terminal-app": "Terminal",

  "terminal.raw-summary": "Show raw output",
  "terminal.raw-empty": "Nothing has run yet.",
  "terminal.copy": "Copy",
  "terminal.copied": "Copied",

  "walkthrough.title": "How to do it",
  "walkthrough.close": "Close",
  "walkthrough.see": "You'll see",
  "walkthrough.warn": "Don't",
  "walkthrough.miss": "If it didn't happen",

  "run.rechecking": "Rechecking the environment…",
  "run.recheck-done": "Check finished, status updated.",
  "run.done": "Done",
  "run.failed": "Didn't succeed",
  "run.verify-opened":
    "A new terminal window is open — follow what it says, then come back.",
  "run.verify-abandoned":
    "That terminal window wasn't finished (closed, or idle for over three minutes). This doesn't count as verified — you can press it again.",
};
