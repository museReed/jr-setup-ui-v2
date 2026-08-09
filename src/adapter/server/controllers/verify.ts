import type { IncomingMessage, ServerResponse } from "node:http";

import { findCapability } from "../../../domain/card.ts";
import { verifyInTerminal } from "../../../usecase/verify-in-terminal.ts";
import type { ServerContext } from "../context.ts";
import { readJson, readString, sendJson } from "../respond.ts";

export async function startVerify(
  ctx: ServerContext,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const checkId = readString(await readJson(request), "checkId");
  const check = ctx.card.checks.find((candidate) => candidate.id === checkId);
  const capability = check === undefined ? undefined : findCapability(check, "verify");

  // 驗證是**那一格**的事。前一代底下那顆共用按鈕跑的永遠是第一格，合併卡上看起來
  // 像「全部重跑」，實際只重跑了一個。
  if (check === undefined || capability === undefined) {
    sendJson(response, 400, { error: "這一格沒有宣告驗證" });
    return;
  }

  // 「跑過」在開視窗的當下就記——學生可能關掉視窗什麼都沒做，那也算跑過一次
  //（canAdvance 認它，isComplete 不認）。
  ctx.store.markAttempted(check.id);
  ctx.bus.publish({ type: "state", progress: ctx.store.wire() });

  // 視窗可能開著好幾分鐘，不能讓這個請求掛在那裡等。結果之後從 SSE 過來。
  sendJson(response, 200, { opened: true });

  void runVerify(ctx, capability.action, check.id);
}

async function runVerify(
  ctx: ServerContext,
  action: string,
  checkId: string,
): Promise<void> {
  say(ctx, "已開啟一個新的終端視窗，照裡面的字做完再回來。", "line");

  // 開完視窗就拿不到裡面的輸出了，結果只能靠重新探測——這是設計，不是偷懶。
  const { completed, checks } = await verifyInTerminal(
    action,
    ctx.card,
    ctx.terminal,
    ctx.probe,
  );

  // ⛔ 沒走完就不是驗證通過。探測看的是「檔案在不在」，那本來就是好的——拿它
  // 當驗證結果，就是把「裝好」當成「生效」，綠燈長在沒做過的事情上。
  if (!completed) {
    say(
      ctx,
      "那個終端視窗沒有走完（被關掉，或超過三分鐘沒動作）。這次不算驗證通過，可以再按一次。",
      "error",
    );
    ctx.bus.publish({ type: "run-done", runId: "verify", success: false });
    return;
  }

  const status = checks.find((check) => check.id === checkId)?.status;
  ctx.store.markVerified(checkId, status === "ok");

  ctx.bus.publish({ type: "state", progress: ctx.store.wire() });
  ctx.bus.publish({ type: "run-done", runId: "verify", success: status === "ok" });
}

function say(ctx: ServerContext, text: string, kind: "line" | "error"): void {
  ctx.bus.publish({
    type: "run-line",
    runId: "verify",
    event: { kind, text, at: ctx.clock.now() },
  });
}
