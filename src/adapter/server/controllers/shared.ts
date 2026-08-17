import type { Platform } from "../../../domain/platform.ts";
import { checkEnvironment } from "../../../usecase/check-environment.ts";
import {
  describeCards,
  type CardView,
} from "../../../usecase/describe-progress.ts";
import type { ServerContext } from "../context.ts";

export interface StateBody {
  cards: CardView[];
  platform: Platform;
}

// 重新探測一次，把結果寫回 store，然後告訴所有連著的網頁。
//
// ⚠️ 順序是「先寫 store 再廣播」。反過來的話網頁收到通知就去拿狀態，拿到的是
// 這次探測之前的那一份——前一代那類「做完動作提示還掛著」的 bug 就是這麼來的。
export async function refreshChecks(ctx: ServerContext): Promise<void> {
  for (const card of ctx.cards) {
    for (const check of await checkEnvironment(card, ctx.probe)) {
      ctx.store.setStatus(check.id, check.status);
    }
  }

  ctx.bus.publish({
    type: "state",
    cards: describeCards(ctx.cards, ctx.store.snapshot()),
  });
}

export function stateBody(ctx: ServerContext): StateBody {
  return {
    cards: describeCards(ctx.cards, ctx.store.snapshot()),
    platform: ctx.platform,
  };
}
