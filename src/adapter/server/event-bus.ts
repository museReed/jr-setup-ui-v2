import type { ServerResponse } from "node:http";

import type { MessageKey } from "../../domain/copy-keys.ts";
import type { CardView } from "../../usecase/describe-progress.ts";
import type { RunEvent } from "../../usecase/ports.ts";

// 網頁要即時知道三件事：指令吐了一行字、我們自己要講一句話、狀態變了。
//
// ⚠️ 指令的輸出是原文（`npm install…` 那些），照原樣送；**我們自己的話一律送代號**。
// 送翻好的字的話，伺服器就得知道使用者用哪個語言——那不是它該知道的事。
export type ServerEvent =
  | { type: "run-line"; runId: string; event: RunEvent }
  | { type: "notice"; runId: string; messageKey: MessageKey; failed: boolean }
  | { type: "run-done"; runId: string; success: boolean }
  | { type: "state"; cards: CardView[] };

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
