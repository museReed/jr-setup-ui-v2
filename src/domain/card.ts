import type { CheckId } from "./check.ts";
import type { MessageKey } from "./copy-keys.ts";

export type CardId = string;
export type SectionId = string;

export type Capability =
  // startKey：按下去的那一刻，終端要先講的那句白話。由能力自己宣告——放在別的
  // 地方就要維護一張 action→訊息 的對照表，而那張表遲早會跟能力清單對不上。
  | { kind: "install"; action: string; startKey: MessageKey }
  | { kind: "verify"; via: "auto" | "terminal"; action: string }
  | { kind: "login"; action: string; startKey: MessageKey }
  | {
      kind: "manual-step";
      id: string;
      titleKey: MessageKey;
      action: string;
      buttonKey: MessageKey;
    }
  // walkthrough：這一格有沒有編過「怎麼做」的教學。明寫在卡片定義裡而不是靠 id
  // 對應猜——沒編過的格子不該畫按鈕，按出一個空彈窗比沒有按鈕更讓人困惑。
  | {
      kind: "eye-check";
      id: string;
      promptKey: MessageKey;
      // 舊版原本畫成「三格 + 兩顆不知道對應誰的按鈕」，學生得自己配對哪顆
      // 按鈕帶他做哪一格（Reed 實測）；stepId 把它們綁回去。
      stepId?: string;
      detailKey?: MessageKey;
      walkthrough?: string;
    }
  | {
      kind: "paste-proof";
      id: string;
      stepId: string;
      promptKey: MessageKey;
      detailKey?: MessageKey;
      walkthrough?: string;
      expected: string;
    }
  | { kind: "recheck" };

// 一張卡上的一格。
//
// ⚠️ 能力掛在**格**上，不掛在卡上。按鈕要畫在它負責的那一格旁邊——掛在卡上的話
// 「這顆按鈕是在幫我做哪一格」就變成學生要自己配對的事；前一代合併卡的第二個驗證
// 甚至完全沒有入口，而那一列還寫著「按下面的重跑驗證」（指向一顆會開錯終端的按鈕）。
export interface CardCheck {
  id: CheckId;
  // 代號不是文字——domain 不知道畫面上寫什麼，只知道要指哪一句。
  labelKey: MessageKey;
  // 這一格「還沒完成」時要說什麼。
  //
  // ⚠️ 不能只有一句共用的。missing 對不同的格意思不一樣：CLI 那格是「還沒安裝」，
  // 登入那格是「還沒登入」——共用一句的話，乾淨機器上登入那格會寫「還沒安裝」，
  // 而學生剛剛才親眼看著它裝完（Mac VM 實測）。沒填就用預設那句。
  missingKey?: MessageKey;
  capabilities: Capability[];
}

export interface Card {
  id: CardId;
  sectionId: SectionId;
  labelKey: MessageKey;
  checks: CardCheck[];
  // 卡片級的能力：整張卡重新檢查、以及沒有對應某一格的人工勾選。
  capabilities: Capability[];
}

export type CapabilityKind = Capability["kind"];
export type CapabilityOfKind<K extends CapabilityKind> = Extract<
  Capability,
  { kind: K }
>;

// 卡與格都只是「有 capabilities 的東西」，同一組查詢函式兩邊都能用。
interface HasCapabilities {
  readonly capabilities: readonly Capability[];
}

export function findCapability<K extends CapabilityKind>(
  owner: HasCapabilities,
  kind: K,
): CapabilityOfKind<K> | undefined {
  return owner.capabilities.find(
    (capability): capability is CapabilityOfKind<K> => capability.kind === kind,
  );
}

export function findCapabilities<K extends CapabilityKind>(
  owner: HasCapabilities,
  kind: K,
): CapabilityOfKind<K>[] {
  return owner.capabilities.filter(
    (capability): capability is CapabilityOfKind<K> => capability.kind === kind,
  );
}
