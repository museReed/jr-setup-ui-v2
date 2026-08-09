import type { IncomingMessage, ServerResponse } from "node:http";

import type { Card, CardCheck } from "../../../domain/card.ts";
import { findCapability } from "../../../domain/card.ts";
import { K, type MessageKey } from "../../../domain/copy-keys.ts";
import { canVerifyYet } from "../../../domain/progress.ts";
import { verifyInTerminal } from "../../../usecase/verify-in-terminal.ts";
import type { ServerContext } from "../context.ts";
import { readJson, readString, sendJson } from "../respond.ts";
import { verifyHookBehavior } from "../verify-hook.ts";

// 自動驗證：程式自己問得到答案的那幾題。
const AUTO_VERIFIERS: Readonly<
  Record<string, () => Promise<{ passed: boolean; lines: readonly string[] }>>
> = {
  "verify-hook": verifyHookBehavior,
};

export async function startVerify(
  ctx: ServerContext,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const checkId = readString(await readJson(request), "checkId");
  const found = locate(ctx, checkId);

  // 驗證是**那一格**的事。前一代底下那顆共用按鈕跑的永遠是第一格，合併卡上看起來
  // 像「全部重跑」，實際只重跑了一個。
  if (found === null) {
    sendJson(response, 400, { error: "這一格沒有宣告驗證" });
    return;
  }

  const { card, check, capability } = found;

  // 合併卡：兩份都裝好才輪到驗證。順序反了驗的是「只裝了一半」的狀態，而那種
  // 驗證多半會過——綠燈就長在一個沒做完的東西上。
  if (!canVerifyYet(card, ctx.store.snapshot())) {
    sendJson(response, 409, { error: "這張卡上還有沒裝完的，先裝完再驗" });
    return;
  }

  // 「跑過」在按下去的當下就記——學生可能什麼都沒做（canAdvance 認它，isComplete 不認）。
  ctx.store.markAttempted(check.id);
  ctx.bus.publish({ type: "state", progress: ctx.store.wire() });
  sendJson(response, 200, { started: true });

  void (capability.via === "terminal"
    ? runTerminalVerify(ctx, card, check.id, capability.action)
    : runAutoVerify(ctx, check.id, capability.action));
}

function locate(
  ctx: ServerContext,
  checkId: string | null,
): { card: Card; check: CardCheck; capability: { via: string; action: string } } | null {
  for (const card of ctx.cards) {
    for (const check of card.checks) {
      const capability = findCapability(check, "verify");

      if (check.id === checkId && capability !== undefined) {
        return { card, check, capability };
      }
    }
  }

  return null;
}

// 程式自己問得到答案的那幾題：跑一次、把過程逐行印出來、直接判定。
async function runAutoVerify(
  ctx: ServerContext,
  checkId: string,
  action: string,
): Promise<void> {
  const verifier = Object.hasOwn(AUTO_VERIFIERS, action) ? AUTO_VERIFIERS[action] : undefined;

  if (verifier === undefined) {
    say(ctx, checkId, K.run.verifyAbandoned, true);
    return;
  }

  const verdict = await verifier();

  for (const text of verdict.lines) {
    ctx.bus.publish({
      type: "run-line",
      runId: checkId,
      event: { kind: "line", text, at: ctx.clock.now() },
    });
  }

  ctx.store.markVerified(checkId, verdict.passed);
  ctx.bus.publish({ type: "state", progress: ctx.store.wire() });
  ctx.bus.publish({ type: "run-done", runId: checkId, success: verdict.passed });
}

async function runTerminalVerify(
  ctx: ServerContext,
  card: Card,
  checkId: string,
  action: string,
): Promise<void> {
  say(ctx, checkId, K.run.verifyOpened, false);

  // 開完視窗就拿不到裡面的輸出了，結果只能靠重新探測——這是設計，不是偷懶。
  const { completed, checks } = await verifyInTerminal(action, card, ctx.terminal, ctx.probe);

  // ⛔ 沒走完就不是驗證通過。探測看的是「檔案在不在」，那本來就是好的——拿它
  // 當驗證結果，就是把「裝好」當成「生效」。
  if (!completed) {
    say(ctx, checkId, K.run.verifyAbandoned, true);
    ctx.bus.publish({ type: "run-done", runId: checkId, success: false });
    return;
  }

  const status = checks.find((check) => check.id === checkId)?.status;
  ctx.store.markVerified(checkId, status === "ok");
  ctx.bus.publish({ type: "state", progress: ctx.store.wire() });
  ctx.bus.publish({ type: "run-done", runId: checkId, success: status === "ok" });
}

// 我們自己的話送代號，不送翻好的字——伺服器不必知道使用者用哪個語言。
function say(
  ctx: ServerContext,
  runId: string,
  messageKey: MessageKey,
  failed: boolean,
): void {
  ctx.bus.publish({ type: "notice", runId, messageKey, failed });
}
