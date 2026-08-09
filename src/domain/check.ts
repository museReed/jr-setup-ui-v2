export type CheckId = string;

export type CheckStatus =
  | "missing"
  | "unverified"
  | "ok"
  | "failed";

export interface Check {
  id: CheckId;
  label: string;
  status: CheckStatus;
}
