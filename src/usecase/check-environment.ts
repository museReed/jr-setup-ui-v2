import type { Card } from "../domain/card.ts";
import type { Check } from "../domain/check.ts";
import type { EnvProbe } from "./ports.ts";

// 只回 id 與狀態。標籤是呈現層的事，這一層不碰。
export async function checkEnvironment(
  card: Card,
  envProbe: EnvProbe,
): Promise<Check[]> {
  const checks: Check[] = [];

  for (const check of card.checks) {
    checks.push({ id: check.id, status: await envProbe.probe(check.id) });
  }

  return checks;
}
