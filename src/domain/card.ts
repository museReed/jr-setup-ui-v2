import type { CheckId } from "./check.ts";

export type CardId = string;
export type SectionId = string;

export type Capability =
  | { kind: "install"; action: string }
  | { kind: "verify"; via: "auto" | "terminal"; action: string }
  | { kind: "login"; action: string }
  | { kind: "eye-check"; id: string; prompt: string }
  | { kind: "recheck" };

export interface Card {
  id: CardId;
  sectionId: SectionId;
  label: string;
  checkIds: CheckId[];
  capabilities: Capability[];
}

export type CapabilityKind = Capability["kind"];
export type CapabilityOfKind<K extends CapabilityKind> = Extract<
  Capability,
  { kind: K }
>;

export function findCapability<K extends CapabilityKind>(
  card: Card,
  kind: K,
): CapabilityOfKind<K> | undefined {
  return card.capabilities.find(
    (capability): capability is CapabilityOfKind<K> =>
      capability.kind === kind,
  );
}

export function findCapabilities<K extends CapabilityKind>(
  card: Card,
  kind: K,
): CapabilityOfKind<K>[] {
  return card.capabilities.filter(
    (capability): capability is CapabilityOfKind<K> =>
      capability.kind === kind,
  );
}
