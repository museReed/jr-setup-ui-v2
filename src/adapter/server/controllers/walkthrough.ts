import { readFile } from "node:fs/promises";
import type { ServerResponse } from "node:http";
import path from "node:path";

import type { ServerContext } from "../context.ts";
import { sendJson } from "../respond.ts";

// 「怎麼做」的內容一格一個檔。按下去才抓——開頁就把十幾份 JSON 全載進來，
// 學生九成看不到。
export async function getWalkthrough(
  ctx: ServerContext,
  id: string,
  response: ServerResponse,
): Promise<void> {
  // id 只能是檔名本身。少了這一條，`/api/walkthrough/../../.ssh/id_rsa` 就成立了。
  if (!/^[a-z0-9-]+$/.test(id)) {
    sendJson(response, 400, { error: "不合法的教學編號" });
    return;
  }

  const file = path.resolve(ctx.contentRoot, "walkthroughs", `${id}.json`);

  try {
    sendJson(response, 200, JSON.parse(await readFile(file, "utf8")));
  } catch {
    sendJson(response, 404, { error: `找不到教學 ${id}` });
  }
}
