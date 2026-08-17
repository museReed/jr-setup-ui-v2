import type { IncomingMessage, ServerResponse } from "node:http";

import { findCapabilities } from "../../../domain/card.ts";
import { openWorkWindow } from "../../../usecase/open-work-window.ts";
import type { ServerContext } from "../context.ts";
import { readJson, readString, sendJson } from "../respond.ts";
import { stateBody } from "./shared.ts";

export async function setEyeCheck(
  ctx: ServerContext,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const body = await readJson(request);
  const id = readString(body, "id");
  const declared = ctx.cards.some((card) =>
    [...findCapabilities(card, "eye-check"), ...findCapabilities(card, "paste-proof")]
      .some((capability) => capability.id === id),
  );

  if (id === null || !declared) {
    sendJson(response, 400, { error: "這張卡沒有宣告這一格人工完成項" });
    return;
  }

  ctx.store.setEyeChecked(id, body["checked"] === true);
  ctx.bus.publish({ type: "state", cards: stateBody(ctx).cards });
  sendJson(response, 200, stateBody(ctx));
}

export async function openTerminalWindow(
  ctx: ServerContext,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const action = readString(await readJson(request), "action");

  // 這條只負責把視窗開起來，不像 verify 要等結論；因此不發 run-done，也不建立
  // running action，學生可以一直留在新視窗工作而不會卡住網頁。
  const result = await openWorkWindow(action, ctx.cards, ctx.terminal);

  if (!result.ok) {
    sendJson(response, 400, { error: "這張卡沒有宣告這個開窗動作" });
    return;
  }

  sendJson(response, 200, { ok: true });
}

export async function skipCard(
  ctx: ServerContext,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const cardId = readString(await readJson(request), "cardId");

  if (cardId === null || !ctx.cards.some((card) => card.id === cardId)) {
    sendJson(response, 400, { error: "不認得的卡片" });
    return;
  }

  ctx.store.skip(cardId);
  ctx.bus.publish({ type: "state", cards: stateBody(ctx).cards });
  sendJson(response, 200, stateBody(ctx));
}

export async function visitCard(
  ctx: ServerContext,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const cardId = readString(await readJson(request), "cardId");

  if (cardId === null || !ctx.cards.some((card) => card.id === cardId)) {
    sendJson(response, 400, { error: "不認得的卡片" });
    return;
  }

  ctx.store.visit(cardId);
  ctx.bus.publish({ type: "state", cards: stateBody(ctx).cards });
  sendJson(response, 200, stateBody(ctx));
}
