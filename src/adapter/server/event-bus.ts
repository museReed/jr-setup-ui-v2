import type { ServerResponse } from "node:http";

import type { RunEvent } from "../../usecase/ports.ts";
import type { WireProgress } from "./state-store.ts";

// 網頁要即時知道兩件事：終端多了一行字，以及狀態變了。兩種都走同一條 SSE。
export type ServerEvent =
  | { type: "run-line"; runId: string; event: RunEvent }
  | { type: "run-done"; runId: string; success: boolean }
  | { type: "state"; progress: WireProgress };

export interface EventBus {
  subscribe(response: ServerResponse): void;
  publish(event: ServerEvent): void;
}

export function createEventBus(): EventBus {
  const clients = new Set<ServerResponse>();

  return {
    subscribe(response) {
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      // 先送一個註解把 header 沖出去，瀏覽器才會認為連線建立了。
      response.write(": connected\n\n");
      clients.add(response);
      response.on("close", () => clients.delete(response));
    },

    publish(event) {
      const payload = `data: ${JSON.stringify(event)}\n\n`;

      for (const client of clients) {
        client.write(payload);
      }
    },
  };
}
