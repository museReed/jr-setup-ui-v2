import type { ServerResponse } from "node:http";

import type { ServerContext } from "../context.ts";
import { sendJson } from "../respond.ts";
import { refreshChecks, stateBody } from "./shared.ts";

export async function getState(
  ctx: ServerContext,
  response: ServerResponse,
): Promise<void> {
  sendJson(response, 200, stateBody(ctx));
}

export async function recheck(
  ctx: ServerContext,
  response: ServerResponse,
): Promise<void> {
  await refreshChecks(ctx);
  sendJson(response, 200, stateBody(ctx));
}
