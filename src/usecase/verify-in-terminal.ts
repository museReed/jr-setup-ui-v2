import type { Card } from "../domain/card.ts";
import type { Check, CheckId } from "../domain/check.ts";
import type { EnvProbe, TerminalOpener } from "./ports.ts";
import { checkEnvironment } from "./check-environment.ts";

export interface VerifyInTerminalOptions {
  labelFor?: (checkId: CheckId) => string;
}

export async function verifyInTerminal(
  action: string,
  card: Card,
  terminalOpener: TerminalOpener,
  envProbe: EnvProbe,
  options: VerifyInTerminalOptions = {},
): Promise<Check[]> {
  await terminalOpener.open(action);
  return checkEnvironment(card, envProbe, options);
}
