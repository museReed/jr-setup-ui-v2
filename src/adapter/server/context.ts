import type { Card } from "../../domain/card.ts";
import { claudeCodeCard } from "../../domain/catalog.ts";
import type {
  Clock,
  EnvProbe,
  ProcessRunner,
  TerminalOpener,
} from "../../usecase/ports.ts";
import { createEventBus, type EventBus } from "./event-bus.ts";
import { createFakeEnv } from "./fake-env.ts";
import { createEnvProbe } from "./probe.ts";
import { createProcessRunner } from "./process-runner.ts";
import { createStateStore, type StateStore } from "./state-store.ts";
import { createTerminalOpener } from "./terminal-opener.ts";

export interface ServerContext {
  readonly card: Card;
  readonly probe: EnvProbe;
  readonly runner: ProcessRunner;
  readonly terminal: TerminalOpener;
  readonly store: StateStore;
  readonly bus: EventBus;
  readonly clock: Clock;
  // 「怎麼做」那些 JSON 的所在。路徑從外面帶進來，這一層不自己算——算路徑要知道
  // 自己被裝在哪，那是 main 的事。
  readonly contentRoot: string;
}

// 所有「碰得到外面世界」的東西在這裡一次接好。usecase 與 domain 只認介面，
// 換成假的（測試）或換成別的平台實作都不用動它們。
export function createServerContext(contentRoot: string): ServerContext {
  const fake = createFakeEnv(process.env.JR_FAKE_ENV);

  if (fake !== null) {
    console.log(`⚠️  假環境已啟用（JR_FAKE_ENV=${process.env.JR_FAKE_ENV}）`);
  }

  return {
    card: claudeCodeCard,
    probe: createEnvProbe(fake),
    runner: createProcessRunner(fake),
    terminal: createTerminalOpener(fake),
    store: createStateStore(),
    bus: createEventBus(),
    clock: { now: () => Date.now() },
    contentRoot,
  };
}
