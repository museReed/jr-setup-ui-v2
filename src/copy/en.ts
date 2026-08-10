import type { MessageKey } from "../domain/copy-keys.ts";

export const en: Record<MessageKey, string> = {
  "card.claude": "Claude Code",
  "check.claude": "Claude Code CLI",
  "check.claude-auth": "Claude Code sign-in",

  "check.hook": "One command at a time",
  "check.allowlist": "Common commands stop asking every time",

  "manual-step.fullscreen-open-title":
    "Step 1: Open a window and finish these two things",
  "manual-step.fullscreen-open-button": "Open Claude Code",
  "eye.fullscreen-yes": "When the box appears, press 1. Yes, try it",
  "eye.fullscreen-yes-detail": "The whole screen redraws once and the box disappears",
  "eye.fullscreen-mouse": "Type a sentence, then click the middle of it with your mouse",
  "eye.fullscreen-mouse-detail":
    "Do this in the same window you just opened; the cursor jumps where you click, without using the arrow keys",
  "manual-step.fullscreen-proof-title":
    "Step 2: Open another window, select the code, and paste it back",
  "manual-step.fullscreen-proof-button": "Open and send the test sentence",
  "eye.fullscreen-copy": "Select the line with the code and paste it into the field below",
  "eye.fullscreen-copy-detail":
    "Releasing the mouse copies it; don't press Ctrl+C—in this mode that interrupts execution",

  "badge.untouched": "Not started",
  "badge.visited-incomplete": "In progress",
  "badge.complete": "Done",
  "badge.failed": "Verification failed",

  "status.missing": "Not installed yet",
  "status.not-logged-in": "Not signed in yet",
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
  "action.cancel": "Cancel this run",
  "action.submit-code": "Submit",
  "action.open-link": "Open the sign-in page",

  "card.guardrails": "When it should stop and ask you",
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
  "run.start-install-claude": "Installing Claude Code. This downloads a package and can take a minute or two.",
  "run.start-login-claude": "Starting sign-in. A URL and a code will appear shortly — follow them, then come back.",
  "run.start-install-hook": "Installing the \"one command at a time\" guard.",
  "run.start-install-allowlist": "Writing the allowlist for common commands.",
  "run.verify-opened":
    "A new terminal window is open — follow what it says, then come back.",
  "run.verify-abandoned":
    "That terminal window wasn't finished (closed, or idle for over three minutes). This doesn't count as verified — you can press it again.",
  "run.verify-blocked":
    "Something on this card isn't installed yet. Install every row first — verifying a half-installed card proves nothing.",
  "run.verify-undeclared": "There's nothing to verify on this row.",
};
