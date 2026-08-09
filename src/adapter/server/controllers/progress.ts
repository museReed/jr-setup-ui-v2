import type { IncomingMessage, ServerResponse } from "node:http";

import { findCapabilities } from "../../../domain/card.ts";
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
    findCapabilities(card, "eye-check").some((capability) => capability.id === id),
  );

  if (id === null || !declared) {
    sendJson(response, 400, { error: "這張卡沒有宣告這一格人工勾選" });
    return;
  }

  ctx.store.setEyeChecked(id, body["checked"] === true);
  ctx.bus.publish({ type: "state", progress: ctx.store.wire() });
  sendJson(response, 200, stateBody(ctx));
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
  ctx.bus.publish({ type: "state", progress: ctx.store.wire() });
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
  ctx.bus.publish({ type: "state", progress: ctx.store.wire() });
  sendJson(response, 200, stateBody(ctx));
}
