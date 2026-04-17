import type { RecommendationAction } from "@prisma/client";

import type { MarketIntelligence } from "@/lib/services/market-intelligence";

type GuardrailRecommendationInput = {
  action?: RecommendationAction | null;
  summary?: string | null;
  reasoning?: string | null;
  buyUnderPriceAud?: number | null;
};

export type GuardedRecommendation = {
  action: RecommendationAction;
  summary: string;
  reasoning: string;
  buyUnderPriceAud: number | null;
};

export function applyRecommendationGuardrails(
  input: GuardrailRecommendationInput,
  intelligence: MarketIntelligence
): GuardedRecommendation {
  let action = input.action ?? "MAYBE";
  let summary = input.summary ?? "No recommendation yet.";
  let reasoning = input.reasoning ?? intelligence.marketGuardrail.note;
  let buyUnderPriceAud = input.buyUnderPriceAud ?? null;

  if (intelligence.availabilityMode === "PREORDER_ONLY" && action === "BUY") {
    action = "MAYBE";
    summary = "Interesting, but the visible market is preorder-led rather than truly in stock.";
    reasoning = `${reasoning} ${intelligence.marketGuardrail.note}`.trim();
    if (buyUnderPriceAud) {
      buyUnderPriceAud = Math.min(buyUnderPriceAud, intelligence.bargainBuyPrice);
    }
  }

  if (intelligence.availabilityMode === "UNAVAILABLE") {
    action = action === "PASS" ? "PASS" : "MAYBE";
    summary = "No reliable in-stock market is visible right now, so this should not be treated as a clean live buy.";
    reasoning = `${reasoning} ${intelligence.marketGuardrail.note}`.trim();
    if (buyUnderPriceAud) {
      buyUnderPriceAud = Math.min(buyUnderPriceAud, intelligence.bargainBuyPrice);
    }
  }

  if (intelligence.staleListingCount > 0 || intelligence.placeholderListingCount > 0) {
    if (action === "BUY") {
      action = "MAYBE";
    }
    summary =
      action === "PASS"
        ? summary
        : "Market looks actionable, but listing quality is soft enough that you should confirm stock before treating this as a true buy.";
    reasoning = `${reasoning} ${intelligence.marketGuardrail.note}`.trim();
    if (buyUnderPriceAud) {
      buyUnderPriceAud = Math.min(buyUnderPriceAud, intelligence.strongBuyPrice);
    }
  }

  return {
    action,
    summary,
    reasoning,
    buyUnderPriceAud
  };
}
