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
//
// ⚠️ 目前 catalog 裡沒有任何一格宣告 via: "auto"——攔截器那格本來是，後來改成開真的
// claude（理由見 catalog.ts）。這張表留著是因為 verifyHookBehavior 仍然有用：它答的是
// 「腳本自己會不會擋」，`scripts/try-guardrails.mjs` 靠它做不花錢的自檢。
const AUTO_VERIFIERS: Readonly<
  Record<string, () => Promise<{ passed: boolean; lines: readonly string[] }>>
> = {
  "verify-hook": verifyHookBehavior,
};

// 還在等的那幾次驗證。
//
// 開出去的終端視窗一旦被關掉，這邊沒有任何辦法知道——只能等滿逾時（三到四分鐘），
// 而那段時間畫面上每顆按鈕都是灰的，學生想重跑也按不動。取消就是給他一條主動說
// 「我關掉了」的路。
const PENDING = new Map<string, AbortController>();

export function cancelVerify(checkId: string): boolean {
  const controller = PENDING.get(checkId);

  if (controller === undefined) {
    return false;
  }

  controller.abort();
  return true;
}

export async function startVerify(
  ctx: ServerContext,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const checkId = readString(await readJson(request), "checkId");
  const found = locate(ctx, checkId);

  // 驗證是**那一格**的事。前一代底下那顆共用按鈕跑的永遠是第一格，合併卡上看起來
  // 像「全部重跑」，實際只重跑了一個。
  // ⚠️ 拒絕的理由送代號不送字。送字的話這句話只有中文、而且會繞過終端那條路
  //（畫面上唯一「伺服器在跟你講話」的地方）。
  if (found === null) {
    sendJson(response, 400, { errorKey: K.run.verifyUndeclared });
    return;
  }

  const { card, check, capability } = found;

  // 這一格自己裝好了才輪到驗證——沒裝的東西沒得驗。隔壁格還沒裝不關這一格的事。
  if (!canVerifyYet(check, ctx.store.snapshot())) {
    sendJson(response, 409, { errorKey: K.run.verifyBlocked });
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

  const controller = new AbortController();
  PENDING.set(checkId, controller);

  // 開完視窗就拿不到裡面的輸出了，結果只能靠重新探測——這是設計，不是偷懶。
  const { completed, checks } = await verifyInTerminal(
    action,
    card,
    ctx.terminal,
    ctx.probe,
    controller.signal,
  ).finally(() => PENDING.delete(checkId));

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
