// CardView 是 use case 交給網頁與 HTTP 的邊界，不是 domain 型別的別名。
//
// ⚠️ 不要順手改成 re-export domain 的 Capability。DTO 的目的就是讓 domain 能獨立
// 演進；re-export 會讓 domain 的改動再次炸穿前端與 wire format。短期兩邊長得很像，
// 是保住這條邊界刻意付出的代價。
//
// MessageKey 在這裡降成 string：代號是規則、字是呈現。DTO 送的是代號，但不該綁死
// domain 目前的 key 聯集型別。
import type { Capability, Card } from "../domain/card.ts";
import type { ProgressState } from "../domain/progress.ts";
import {
  canAdvance,
  canSkip,
  canVerifyYet,
  cardDisplayState,
  effectiveStatus,
  isComplete,
} from "../domain/progress.ts";

export type CardDisplay =
  | "untouched"
  | "visited-incomplete"
  | "complete"
  | "failed";
export type CheckDisplay = "ok" | "missing" | "failed" | "unverified";

export type ViewCapability =
  | { kind: "install"; action: string; startKey: string }
  | { kind: "verify"; via: "auto" | "terminal"; action: string }
  | { kind: "login"; action: string; startKey: string; linkKey?: string }
  | {
      kind: "manual-step";
      id: string;
      titleKey: string;
      action: string;
      buttonKey: string;
    }
  | {
      kind: "eye-check";
      id: string;
      promptKey: string;
      stepId?: string;
      detailKey?: string;
      walkthrough?: string;
      done: boolean;
    }
  | {
      kind: "paste-proof";
      id: string;
      stepId: string;
      promptKey: string;
      detailKey?: string;
      walkthrough?: string;
      expected: string;
      done: boolean;
    }
  | { kind: "recheck" };

export interface CheckView {
  id: string;
  labelKey: string;
  missingKey?: string;
  status: CheckDisplay;
  canVerify: boolean;
  capabilities: ViewCapability[];
}

export interface CardView {
  id: string;
  sectionId: string;
  labelKey: string;
  logoId: string;
  display: CardDisplay;
  complete: boolean;
  canAdvance: boolean;
  canSkip: boolean;
  visited: boolean;
  checks: CheckView[];
  capabilities: ViewCapability[];
}

export function findCapability<K extends ViewCapability["kind"]>(
  capabilities: readonly ViewCapability[],
  kind: K,
): Extract<ViewCapability, { kind: K }> | undefined {
  return capabilities.find(
    (capability): capability is Extract<ViewCapability, { kind: K }> =>
      capability.kind === kind,
  );
}

export function findCapabilities<K extends ViewCapability["kind"]>(
  capabilities: readonly ViewCapability[],
  kind: K,
): Extract<ViewCapability, { kind: K }>[] {
  return capabilities.filter(
    (capability): capability is Extract<ViewCapability, { kind: K }> =>
      capability.kind === kind,
  );
}

export function describeCards(
  cards: readonly Card[],
  progress: ProgressState,
): CardView[] {
  return cards.map((card) => ({
    id: card.id,
    sectionId: card.sectionId,
    labelKey: card.labelKey,
    logoId: card.logoId,
    display: cardDisplayState(card, progress),
    complete: isComplete(card, progress),
    canAdvance: canAdvance(card, progress),
    canSkip: canSkip(card, progress),
    visited: progress.visited.has(card.id),
    checks: card.checks.map((check) => ({
      id: check.id,
      labelKey: check.labelKey,
      ...(check.missingKey === undefined ? {} : { missingKey: check.missingKey }),
      status: effectiveStatus(check, progress),
      canVerify: canVerifyYet(check, progress),
      capabilities: check.capabilities.map((capability) =>
        describeCapability(capability, progress),
      ),
    })),
    capabilities: card.capabilities.map((capability) =>
      describeCapability(capability, progress),
    ),
  }));
}

function describeCapability(
  capability: Capability,
  progress: ProgressState,
): ViewCapability {
  switch (capability.kind) {
    case "install":
      return {
        kind: "install",
        action: capability.action,
        startKey: capability.startKey,
      };
    case "verify":
      return { kind: "verify", via: capability.via, action: capability.action };
    case "login":
      return {
        kind: "login",
        action: capability.action,
        startKey: capability.startKey,
        ...(capability.linkKey === undefined ? {} : { linkKey: capability.linkKey }),
      };
    case "manual-step":
      return {
        kind: "manual-step",
        id: capability.id,
        titleKey: capability.titleKey,
        action: capability.action,
        buttonKey: capability.buttonKey,
      };
    case "eye-check":
      return {
        kind: "eye-check",
        id: capability.id,
        promptKey: capability.promptKey,
        ...(capability.stepId === undefined ? {} : { stepId: capability.stepId }),
        ...(capability.detailKey === undefined
          ? {}
          : { detailKey: capability.detailKey }),
        ...(capability.walkthrough === undefined
          ? {}
          : { walkthrough: capability.walkthrough }),
        done: progress.eyeChecked.has(capability.id),
      };
    case "paste-proof":
      return {
        kind: "paste-proof",
        id: capability.id,
        stepId: capability.stepId,
        promptKey: capability.promptKey,
        ...(capability.detailKey === undefined
          ? {}
          : { detailKey: capability.detailKey }),
        ...(capability.walkthrough === undefined
          ? {}
          : { walkthrough: capability.walkthrough }),
        expected: capability.expected,
        done: progress.eyeChecked.has(capability.id),
      };
    case "recheck":
      return { kind: "recheck" };
  }
}
