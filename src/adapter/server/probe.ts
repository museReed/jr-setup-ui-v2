import { execFile } from "node:child_process";

import type { CheckId, CheckStatus } from "../../domain/check.ts";
import type { EnvProbe } from "../../usecase/ports.ts";
import { checkAllowlist, checkHook } from "./config-check.ts";
import type { FakeEnv } from "./fake-env.ts";
import { spawnEnv } from "./spawn-env.ts";

// 每個 check 怎麼問「你在不在」。回 exit 0 就算結構齊全——行為有沒有生效是驗證那一
// 步的事，探測不負責（見 domain 的 effectiveStatus）。
const PROBES: Readonly<Record<CheckId, { cmd: string; args: string[] }>> = {
  claude: { cmd: "claude", args: ["--version"] },
  "claude-auth": { cmd: "claude", args: ["auth", "status"] },
  codex: { cmd: "codex", args: ["--version"] },
  "codex-auth": { cmd: "codex", args: ["login", "status"] },
};

// 設定檔類的格子不是「有沒有這個指令」，而是「檔案內容對不對、註冊上去沒有」。
const CONFIG_CHECKS: Readonly<
  Record<CheckId, (materials: { root: string }) => Promise<CheckStatus>>
> = {
  hook: checkHook,
  allowlist: checkAllowlist,
};

export function createEnvProbe(fake: FakeEnv | null, materialsRoot: string): EnvProbe {
  return {
    async probe(checkId) {
      const faked = fake?.status(checkId);

      // 假環境只蓋它被交代過的那幾格，其他的照樣走真的探測——設定檔那兩格是真的
      // 寫在磁碟上，假環境沒理由替它們回答。
      if (faked !== undefined) {
        return faked;
      }

      if (Object.hasOwn(CONFIG_CHECKS, checkId)) {
        return CONFIG_CHECKS[checkId]!({ root: materialsRoot });
      }

      const spec = Object.hasOwn(PROBES, checkId) ? PROBES[checkId] : undefined;

      if (spec === undefined) {
        return "missing";
      }

      return (await succeeds(spec.cmd, spec.args, await spawnEnv())) ? "ok" : "missing";
    },
  };
}

// ⚠️ env 一定要傳。用繼承的 process.env 的話，剛裝好的 CLI 探測不到——安裝器寫的是
// shell 設定檔／登錄檔，而嚮導這個行程的 PATH 是啟動當下的快照（見 spawn-env.ts）。
function succeeds(
  cmd: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
): Promise<boolean> {
  return new Promise((resolve) => {
    // 探測不該卡住開頁。逾時就當作沒有——寧可多顯示一顆安裝鍵，也不要讓學生
    // 對著「檢查中…」等一分鐘。
    execFile(cmd, [...args], { timeout: 10_000, env }, (error) => {
      resolve(error === null);
    });
  });
}
