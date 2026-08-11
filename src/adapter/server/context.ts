import type { Card } from "../../domain/card.ts";
import { CARDS } from "../../domain/cards/index.ts";
import type { Platform } from "../../domain/platform.ts";
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
  // 卡片依序排。「下一張」就是往這個陣列的下一格走。
  readonly cards: Card[];
  readonly probe: EnvProbe;
  readonly runner: ProcessRunner;
  readonly terminal: TerminalOpener;
  readonly store: StateStore;
  readonly bus: EventBus;
  readonly clock: Clock;
  // 「怎麼做」那些 JSON 的所在。路徑從外面帶進來，這一層不自己算——算路徑要知道
  // 自己被裝在哪，那是 main 的事。
  readonly contentRoot: string;
  // 要發給學生的那些檔案（規則檔、hook 腳本）的所在。
  readonly materialsRoot: string;
  // 這台機器實際是什麼。教學內容的 only: "mac"/"win" 靠它過濾。
  readonly platform: Platform;
}

// 所有「碰得到外面世界」的東西在這裡一次接好。usecase 與 domain 只認介面，
// 換成假的（測試）或換成別的平台實作都不用動它們。
export function createServerContext(
  contentRoot: string,
  materialsRoot: string,
): ServerContext {
  const fake = createFakeEnv(process.env.JR_FAKE_ENV);

  if (fake !== null) {
    console.log(`⚠️  假環境已啟用（JR_FAKE_ENV=${process.env.JR_FAKE_ENV}）`);
  }

  return {
    cards: [...CARDS],
    probe: createEnvProbe(fake, materialsRoot),
    runner: createProcessRunner(fake, materialsRoot),
    terminal: createTerminalOpener(fake),
    store: createStateStore(),
    bus: createEventBus(),
    clock: { now: () => Date.now() },
    contentRoot,
    materialsRoot,
    platform:
      process.platform === "darwin" ? "mac" : process.platform === "win32" ? "win" : "other",
  };
}
