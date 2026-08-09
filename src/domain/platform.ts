// 「去 Dock 找」與「看工作列在閃」是兩件不同的事，講錯等於沒講——所以教學內容
// 可以標 only: "mac" / "win"，不是給這台機器看的就不顯示。
//
// ⚠️ 平台由**伺服器**回報（process.platform），不是猜瀏覽器的 userAgent。
// 嚮導是跑在學生自己機器上的本機工具，伺服器看到的就是真的那一台。
export type Platform = "mac" | "win" | "other";

export function isPlatform(value: unknown): value is Platform {
  return value === "mac" || value === "win" || value === "other";
}
