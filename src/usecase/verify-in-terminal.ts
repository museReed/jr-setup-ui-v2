import type { Card } from "../domain/card.ts";
import type { Check } from "../domain/check.ts";
import type { EnvProbe, TerminalOpener } from "./ports.ts";
import { checkEnvironment } from "./check-environment.ts";

export interface VerifyInTerminalResult {
  // 學生有沒有真的走完那個視窗。沒走完就不該算驗證過，即使重新探測看起來是好的
  //——探測看的是結構，驗證看的是行為，兩者不能互相代替。
  readonly completed: boolean;
  readonly checks: Check[];
}

export async function verifyInTerminal(
  action: string,
  card: Card,
  terminalOpener: TerminalOpener,
  envProbe: EnvProbe,
): Promise<VerifyInTerminalResult> {
  const outcome = await terminalOpener.open(action);
  return {
    completed: outcome.completed,
    checks: await checkEnvironment(card, envProbe),
  };
}
