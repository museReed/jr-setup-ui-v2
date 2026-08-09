export type CheckId = string;

export type CheckStatus =
  | "missing"
  | "unverified"
  | "ok"
  | "failed";

// 探測結果只有 id 與狀態。標籤是呈現的事——伺服器不必知道畫面上那一格叫什麼，
// 也就不必知道使用者用哪個語言。
export interface Check {
  id: CheckId;
  status: CheckStatus;
}
