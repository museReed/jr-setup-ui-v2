import { checkEnvironment } from "../../../usecase/check-environment.ts";
import type { ServerContext } from "../context.ts";

// 重新探測一次，把結果寫回 store，然後告訴所有連著的網頁。
//
// ⚠️ 順序是「先寫 store 再廣播」。反過來的話網頁收到通知就去拿狀態，拿到的是
// 這次探測之前的那一份——前一代那類「做完動作提示還掛著」的 bug 就是這麼來的。
export async function refreshChecks(ctx: ServerContext): Promise<void> {
  const checks = await checkEnvironment(ctx.card, ctx.probe);

  for (const check of checks) {
    ctx.store.setStatus(check.id, check.status);
  }

  ctx.bus.publish({ type: "state", progress: ctx.store.wire() });
}

export function stateBody(ctx: ServerContext): unknown {
  return { card: ctx.card, platform: ctx.platform, progress: ctx.store.wire() };
}
