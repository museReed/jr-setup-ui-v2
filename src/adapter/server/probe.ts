import { execFile } from "node:child_process";

import type { CheckId, CheckStatus } from "../../domain/check.ts";
import type { EnvProbe } from "../../usecase/ports.ts";
import type { FakeEnv } from "./fake-env.ts";

// 每個 check 怎麼問「你在不在」。回 exit 0 就算結構齊全——行為有沒有生效是驗證那一
// 步的事，探測不負責（見 domain 的 effectiveStatus）。
const PROBES: Readonly<Record<CheckId, { cmd: string; args: string[] }>> = {
  claude: { cmd: "claude", args: ["--version"] },
  "claude-auth": { cmd: "claude", args: ["auth", "status"] },
};

export function createEnvProbe(fake: FakeEnv | null): EnvProbe {
  return {
    async probe(checkId) {
      if (fake !== null) {
        return fake.status(checkId);
      }

      const spec = Object.hasOwn(PROBES, checkId) ? PROBES[checkId] : undefined;

      if (spec === undefined) {
        return "missing";
      }

      return (await succeeds(spec.cmd, spec.args)) ? "ok" : "missing";
    },
  };
}

function succeeds(cmd: string, args: readonly string[]): Promise<boolean> {
  return new Promise((resolve) => {
    // 探測不該卡住開頁。逾時就當作沒有——寧可多顯示一顆安裝鍵，也不要讓學生
    // 對著「檢查中…」等一分鐘。
    execFile(cmd, [...args], { timeout: 10_000 }, (error) => {
      resolve(error === null);
    });
  });
}
