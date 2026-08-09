import type { ServerResponse } from "node:http";

import { findCapability } from "../../../domain/card.ts";
import { CLAUDE_CHECK_LABELS } from "../../../domain/catalog.ts";
import { verifyInTerminal } from "../../../usecase/verify-in-terminal.ts";
import type { ServerContext } from "../context.ts";
import { sendJson } from "../respond.ts";

export async function startVerify(
  ctx: ServerContext,
  response: ServerResponse,
): Promise<void> {
  const capability = findCapability(ctx.card, "verify");

  if (capability === undefined) {
    sendJson(response, 400, { error: "這張卡沒有宣告驗證" });
    return;
  }

  // 「跑過」在開視窗的當下就記——學生可能關掉視窗什麼都沒做，那也算跑過一次
  // （canAdvance 認它，isComplete 不認）。
  for (const checkId of ctx.card.checkIds) {
    ctx.store.markAttempted(checkId);
  }
  ctx.bus.publish({ type: "state", progress: ctx.store.wire() });

  // 視窗可能開著好幾分鐘，不能讓這個請求掛在那裡等。結果之後從 SSE 過來。
  sendJson(response, 200, { opened: true });

  void runVerify(ctx, capability.action);
}

async function runVerify(ctx: ServerContext, action: string): Promise<void> {
  ctx.bus.publish({
    type: "run-line",
    runId: "verify",
    event: {
      kind: "line",
      text: "已開啟一個新的終端視窗，照裡面的字做完再回來。",
      at: ctx.clock.now(),
    },
  });

  // 開完視窗就拿不到裡面的輸出了，結果只能靠重新探測——這是設計，不是偷懶。
  const checks = await verifyInTerminal(action, ctx.card, ctx.terminal, ctx.probe, {
    labelFor: (id) => CLAUDE_CHECK_LABELS[id] ?? id,
  });

  for (const check of checks) {
    ctx.store.markVerified(check.id, check.status === "ok");
  }

  ctx.bus.publish({ type: "state", progress: ctx.store.wire() });
  ctx.bus.publish({
    type: "run-done",
    runId: "verify",
    success: checks.every((check) => check.status === "ok"),
  });
}
