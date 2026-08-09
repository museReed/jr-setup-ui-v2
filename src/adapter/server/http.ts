import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ServerContext } from "./context.ts";
import { cancelRun, sendRunInput, startRun } from "./controllers/run.ts";
import { setEyeCheck, skipCard, visitCard } from "./controllers/progress.ts";
import { getState, recheck } from "./controllers/state.ts";
import { startVerify } from "./controllers/verify.ts";
import { getWalkthrough } from "./controllers/walkthrough.ts";
import { refreshChecks } from "./controllers/shared.ts";
import { sendJson } from "./respond.ts";

type Handler = (
  ctx: ServerContext,
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<void>;

// Controller 只做 HTTP 轉接：解析請求 → 叫一個 use case → 把結果變成回應。
// 檢查邏輯、spawn、檔案系統都不在這一層。
const ROUTES: Readonly<Record<string, Handler>> = {
  "GET /api/state": (ctx, _request, response) => getState(ctx, response),
  "POST /api/recheck": (ctx, _request, response) => recheck(ctx, response),
  "POST /api/run": startRun,
  "POST /api/input": sendRunInput,
  "POST /api/cancel": cancelRun,
  "POST /api/verify": startVerify,
  "POST /api/eye-check": setEyeCheck,
  "POST /api/skip": skipCard,
  "POST /api/visit": visitCard,
};

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

export async function startHttpServer(
  ctx: ServerContext,
  port: number,
  webRoot: string,
): Promise<number> {
  // 開頁之前先探測一次。沒有這一步的話學生看到的第一個畫面是空的，
  // 然後才「跳」成真實狀態。
  await refreshChecks(ctx);

  const server = createServer((request, response) => {
    void handle(ctx, request, response, webRoot);
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(port));
  });
}

async function handle(
  ctx: ServerContext,
  request: IncomingMessage,
  response: ServerResponse,
  webRoot: string,
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (request.method === "GET" && url.pathname === "/api/stream") {
    ctx.bus.subscribe(response);
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/walkthrough/")) {
    const [locale, id] = url.pathname.slice("/api/walkthrough/".length).split("/");
    await getWalkthrough(ctx, locale ?? "", id ?? "", response);
    return;
  }

  const route = ROUTES[`${request.method ?? "GET"} ${url.pathname}`];

  if (route !== undefined) {
    try {
      await route(ctx, request, response);
    } catch (error) {
      // 吞掉例外只會讓網頁那邊看到一個永遠不回來的請求。錯誤要說出口。
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  await serveStatic(url.pathname, response, webRoot);
}

async function serveStatic(
  pathname: string,
  response: ServerResponse,
  webRoot: string,
): Promise<void> {
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const file = path.resolve(webRoot, relative);

  // 只送得出 webRoot 底下的東西。少了這一條，`GET /../../.ssh/id_rsa` 就成立了。
  if (!file.startsWith(path.resolve(webRoot))) {
    sendJson(response, 403, { error: "不在可服務的目錄裡" });
    return;
  }

  try {
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream",
    });
    response.end(body);
  } catch {
    sendJson(response, 404, { error: `找不到 ${pathname}` });
  }
}
