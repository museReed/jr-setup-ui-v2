import type { CardId } from "../../domain/card.ts";
import type { CheckId, CheckStatus } from "../../domain/check.ts";
import type { ProgressState } from "../../domain/progress.ts";

// 伺服器持有的是**事實**（哪一格是什麼狀態、學生勾了什麼），不是結論。
// 「這張卡完成了嗎」由 domain 的 isComplete 回答，前後端 import 同一份程式碼——
// 前一代前後端各自實作一次那個判斷，7 條不一致就是這麼長出來的。
export interface StateStore {
  snapshot(): ProgressState;
  wire(): WireProgress;
  setStatus(checkId: CheckId, status: CheckStatus): void;
  markAttempted(checkId: CheckId): void;
  markVerified(checkId: CheckId, passed: boolean): void;
  setEyeChecked(id: string, checked: boolean): void;
  visit(cardId: CardId): void;
  skip(cardId: CardId): void;
}

export interface WireProgress {
  statuses: [CheckId, CheckStatus][];
  verified: CheckId[];
  attempted: CheckId[];
  eyeChecked: string[];
  visited: CardId[];
  skipped: CardId[];
}

export function createStateStore(): StateStore {
  const statuses = new Map<CheckId, CheckStatus>();
  const verified = new Set<CheckId>();
  const attempted = new Set<CheckId>();
  const eyeChecked = new Set<string>();
  const visited = new Set<CardId>();
  const skipped = new Set<CardId>();

  return {
    snapshot: () => ({ statuses, verified, attempted, eyeChecked, visited, skipped }),

    wire: () => ({
      statuses: [...statuses],
      verified: [...verified],
      attempted: [...attempted],
      eyeChecked: [...eyeChecked],
      visited: [...visited],
      skipped: [...skipped],
    }),

    setStatus(checkId, status) {
      statuses.set(checkId, status);

      // 探測說這一格不見了，就把「驗過」忘掉。留著的話同一格會同時是「已驗證」
      // 與「未安裝」——前一代 Windows VM 上的實測畫面。
      if (status === "missing") {
        verified.delete(checkId);
      }
    },

    markAttempted(checkId) {
      attempted.add(checkId);
    },

    markVerified(checkId, passed) {
      attempted.add(checkId);

      if (passed) {
        verified.add(checkId);
        statuses.set(checkId, "ok");
        return;
      }

      verified.delete(checkId);
      statuses.set(checkId, "failed");
    },

    setEyeChecked(id, checked) {
      if (checked) {
        eyeChecked.add(id);
      } else {
        eyeChecked.delete(id);
      }
    },

    visit(cardId) {
      visited.add(cardId);
    },

    // 逆口只放行前進，不算完成——skipped 進不了 verified，徽章與進度條照樣顯示失敗。
    skip(cardId) {
      skipped.add(cardId);
    },
  };
}
