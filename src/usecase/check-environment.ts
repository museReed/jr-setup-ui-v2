import type { Card } from "../domain/card.ts";
import type { Check, CheckId } from "../domain/check.ts";
import type { EnvProbe } from "./ports.ts";

export interface CheckEnvironmentOptions {
  labelFor?: (checkId: CheckId) => string;
}

export async function checkEnvironment(
  card: Card,
  envProbe: EnvProbe,
  options: CheckEnvironmentOptions = {},
): Promise<Check[]> {
  const checks: Check[] = [];

  for (const checkId of card.checkIds) {
    checks.push({
      id: checkId,
      label: options.labelFor?.(checkId) ?? checkId,
      status: await envProbe.probe(checkId),
    });
  }

  return checks;
}
