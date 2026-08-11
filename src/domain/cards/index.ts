import type { Card } from "../card.ts";
import { claudeCodeCard } from "./claude-code.ts";
import { codexCliCard } from "./codex-cli.ts";
import { guardrailsCard } from "./guardrails.ts";

// 這個陣列的順序就是學生走的順序；加卡片只需要 import，再放進這個陣列。
export const CARDS: readonly Card[] = [claudeCodeCard, codexCliCard, guardrailsCard];
