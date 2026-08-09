import type { Card } from "../domain/card.ts";
import type { Check } from "../domain/check.ts";
import type { EnvProbe } from "./ports.ts";

// 標籤從卡片定義來，不再由呼叫端傳一張對照表進來——後端回報與前端清單本來就該
// 叫同一個名字，兩邊各存一份遲早會分岔。
export async function checkEnvironment(
  card: Card,
  envProbe: EnvProbe,
): Promise<Check[]> {
  const checks: Check[] = [];

  for (const check of card.checks) {
    checks.push({
      id: check.id,
      label: check.label,
      status: await envProbe.probe(check.id),
    });
  }

  return checks;
}
