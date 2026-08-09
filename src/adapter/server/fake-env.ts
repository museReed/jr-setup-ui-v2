import type { CheckId, CheckStatus } from "../../domain/check.ts";

// 開發用的假環境。理由：Reed 的機器上 Claude Code 已經裝好也登入了，「未安裝」那一
// 態在真機上看不到——而那正是學生第一次開頁時看到的畫面。
//
// ⚠️ 只有 JR_FAKE_ENV 明確設值時才啟用。沒設就是 null，所有路徑走真的探測；
// 發佈出去的套件裡沒有人會設它。
export interface FakeEnv {
  status(checkId: CheckId): CheckStatus;
  set(checkId: CheckId, status: CheckStatus): void;
}

export function createFakeEnv(raw: string | undefined): FakeEnv | null {
  if (raw === undefined || raw === "") {
    return null;
  }

  const statuses = new Map<CheckId, CheckStatus>(
    raw === "missing"
      ? [
          ["claude", "missing"],
          ["claude-auth", "missing"],
        ]
      : parsePairs(raw),
  );

  return {
    status(checkId) {
      return statuses.get(checkId) ?? "missing";
    },
    set(checkId, status) {
      statuses.set(checkId, status);
    },
  };
}

// 逐項指定：JR_FAKE_ENV="claude=ok,claude-auth=missing"
function parsePairs(raw: string): [CheckId, CheckStatus][] {
  return raw
    .split(",")
    .map((pair) => pair.split("="))
    .flatMap(([id, status]) =>
      id !== undefined && isStatus(status) ? [[id, status] as [CheckId, CheckStatus]] : [],
    );
}

function isStatus(value: string | undefined): value is CheckStatus {
  return (
    value === "missing" ||
    value === "unverified" ||
    value === "ok" ||
    value === "failed"
  );
}
