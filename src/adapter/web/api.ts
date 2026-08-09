import type { Card } from "../../domain/card.ts";
import type { CheckId, CheckStatus } from "../../domain/check.ts";
import type { MessageKey } from "../../domain/copy-keys.ts";
import type { Platform } from "../../domain/platform.ts";
import type { RunEvent } from "../../usecase/ports.ts";

export interface WireProgress {
  statuses: [CheckId, CheckStatus][];
  verified: CheckId[];
  attempted: CheckId[];
  eyeChecked: string[];
  visited: string[];
  skipped: string[];
}

export interface StateBody {
  cards: Card[];
  platform: Platform;
  progress: WireProgress;
}

export type ServerEvent =
  | { type: "run-line"; runId: string; event: RunEvent }
  // 伺服器自己的話只送代號，不送翻好的字——它不必知道使用者用哪個語言。
  | { type: "notice"; runId: string; messageKey: MessageKey; failed: boolean }
  | { type: "run-done"; runId: string; success: boolean }
  | { type: "state"; progress: WireProgress };

async function post(path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });

  // 伺服器回 4xx/5xx 時 fetch 不會 throw。不自己擋的話呼叫端會拿一個看起來
  // 正常的空物件，然後在別的地方壞掉。
  if (!response.ok) {
    const detail: unknown = await response.json().catch(() => ({}));
    throw new Error(
      typeof detail === "object" && detail !== null && "error" in detail
        ? String((detail as { error: unknown }).error)
        : `${path} 回了 ${response.status}`,
    );
  }

  return response.json();
}

export const api = {
  async state(): Promise<StateBody> {
    return (await (await fetch("/api/state")).json()) as StateBody;
  },
  recheck: () => post("/api/recheck") as Promise<StateBody>,
  run: (action: string) => post("/api/run", { action }) as Promise<{ runId: string }>,
  input: (runId: string, text: string) => post("/api/input", { runId, text }),
  cancel: (runId: string) => post("/api/cancel", { runId }),
  verify: (checkId: string) => post("/api/verify", { checkId }),

  // 按下去才抓——開頁就把十幾份教學全載進來，學生九成看不到。
  // 教學內容分語言存，所以網址要帶語言：翻譯過的步驟跟 UI 是同一件事。
  async walkthrough(locale: string, id: string): Promise<unknown> {
    const response = await fetch(`/api/walkthrough/${locale}/${id}`);

    if (!response.ok) {
      throw new Error(`找不到教學 ${id}`);
    }

    return response.json();
  },
  eyeCheck: (id: string, checked: boolean) => post("/api/eye-check", { id, checked }),
  skip: (cardId: string) => post("/api/skip", { cardId }) as Promise<StateBody>,
  visit: (cardId: string) => post("/api/visit", { cardId }) as Promise<StateBody>,

  stream(onEvent: (event: ServerEvent) => void): () => void {
    const source = new EventSource("/api/stream");
    source.onmessage = (message) => {
      onEvent(JSON.parse(message.data as string) as ServerEvent);
    };
    return () => source.close();
  },
};
