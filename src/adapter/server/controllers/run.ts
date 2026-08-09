import type { IncomingMessage, ServerResponse } from "node:http";

import { findCapability } from "../../../domain/card.ts";
import { collectAction, startAction } from "../../../usecase/run-action.ts";
import type { ServerContext } from "../context.ts";
import { readJson, readString, sendJson } from "../respond.ts";
import { refreshChecks } from "./shared.ts";

// 網頁只送 action 名字。這裡對照每一格宣告的能力——不在能力清單裡的動作一律拒絕，
// 網頁就沒辦法叫伺服器跑任意指令。
function isDeclared(ctx: ServerContext, action: string): boolean {
  return ctx.cards.some((card) =>
    card.checks.some(
      (check) =>
        findCapability(check, "install")?.action === action ||
        findCapability(check, "login")?.action === action,
    ),
  );
}

export async function startRun(
  ctx: ServerContext,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const action = readString(await readJson(request), "action");

  if (action === null || !isDeclared(ctx, action)) {
    sendJson(response, 400, { error: "這張卡沒有宣告這個動作" });
    return;
  }

  const handle = startAction(action, ctx.runner);
  // runId 先回去，事件之後從 SSE 流過來——等跑完才回應的話，安裝那幾分鐘裡
  // 網頁什麼都拿不到。
  sendJson(response, 200, { runId: handle.runId });

  void collectAction(handle, ctx.clock, (event) => {
    ctx.bus.publish({ type: "run-line", runId: handle.runId, event });
  }).then(async (result) => {
    ctx.bus.publish({
      type: "run-done",
      runId: handle.runId,
      success: result.success,
    });
    // 裝完 / 登入完要重探一次，那一格才會自己變色，不用學生按重新檢查。
    await refreshChecks(ctx);
  });
}

export async function sendRunInput(
  ctx: ServerContext,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const body = await readJson(request);
  const runId = readString(body, "runId");
  const text = readString(body, "text");

  if (runId === null || text === null) {
    sendJson(response, 400, { error: "缺 runId 或 text" });
    return;
  }

  await ctx.runner.sendInput(runId, text);
  sendJson(response, 200, { ok: true });
}

export async function cancelRun(
  ctx: ServerContext,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const runId = readString(await readJson(request), "runId");

  if (runId === null) {
    sendJson(response, 400, { error: "缺 runId" });
    return;
  }

  await ctx.runner.cancel(runId);
  sendJson(response, 200, { ok: true });
}
