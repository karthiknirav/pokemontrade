import type { Card, Product, RecommendationAction, TcgSet } from "@prisma/client";
import { POPULAR_POKEMON } from "@/lib/constants";

type ScoreInput = {
  item: Product | Card;
  set?: TcgSet | null;
  isSealed: boolean;
  language: "ENGLISH" | "JAPANESE";
  productType?: string | null;
  releaseDate?: Date;
  isPreorder?: boolean;
  popularityName?: string | null;
  rarity?: string | null;
  marketPrice: number;
  lastSoldPrice: number;
  psa10Price?: number | null;
  liquidityScore: number;
  popularityScore: number;
  // Price trend data (from PokeWallet avg1/avg7/avg30)
  avg1?: number | null;
  avg7?: number | null;
  avg30?: number | null;
  // Budget context
  budgetAud?: number;
};

export type ScoreResult = {
  buyScore: number;
  flipScore: number;
  longTermHoldScore: number;
  ripScore: number;
  riskScore: number;
  estimated3m: number;
  estimated1y: number;
  estimated3y: number;
  action: RecommendationAction;
  confidenceBand: string;
  buyUnderPriceAud: number;
  budgetTier: string;
  trendDirection: "rising" | "falling" | "stable";
  summary: string;
  reasoning: string;
};

function clampScore(value: number) {
  return Math.max(5, Math.min(95, Math.round(value)));
}

function monthDiffFromNow(date?: Date) {
  if (!date) return 0;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30);
}

function getBudgetTier(price: number, budget: number): string {
  const ratio = price / budget;
  if (ratio <= 0.05) return "Budget buy";
  if (ratio <= 0.15) return "Mid-range";
  if (ratio <= 0.30) return "Premium";
  if (ratio <= 0.60) return "Stretch buy";
  return "Out of reach";
}

function getTrendDirection(avg1?: number | null, avg7?: number | null, avg30?: number | null, lastSold?: number, market?: number): "rising" | "falling" | "stable" {
  // Use PokeWallet trend data if available
  if (avg1 && avg7 && avg30) {
    if (avg1 > avg7 && avg7 > avg30) return "rising";
    if (avg1 < avg7 && avg7 < avg30) return "falling";
    return "stable";
  }
  // Fall back to market vs lastSold comparison
  if (!lastSold || !market) return "stable";
  const ratio = market / lastSold;
  if (ratio > 1.08) return "rising";
  if (ratio < 0.92) return "falling";
  return "stable";
}

export function scoreItem(input: ScoreInput): ScoreResult {
  const budget = input.budgetAud ?? 500;
  const ratio = input.lastSoldPrice > 0 ? input.marketPrice / input.lastSoldPrice : 1;

  // --- Popularity ---
  const isPopularPokemon = POPULAR_POKEMON.includes(input.popularityName ?? "");
  const popularityBoost = isPopularPokemon ? 8 : 0;
  const liquidity = input.liquidityScore / 10;
  const popularity = input.popularityScore / 10;

  // --- Rarity: value-adjusted, not flat boost ---
  // High rarity only scores well if PSA spread justifies the price
  const psaSpread = input.psa10Price
    ? (input.psa10Price - input.marketPrice) / Math.max(input.marketPrice, 1)
    : 0;
  const isHighRarity = input.rarity?.includes("SIR") || input.rarity?.includes("SAR");
  // Rarity boost is now tied to PSA upside, not just the rarity label
  const rarityBoost = isHighRarity
    ? Math.min(psaSpread * 15, 12)   // max +12, only if PSA spread is real
    : input.rarity?.includes("Illustration") ? 5 : 0;

  // --- Budget awareness ---
  const budgetRatio = input.marketPrice / budget;
  // Cards over 60% of total budget are a stretch — penalise
  const budgetPenalty = budgetRatio > 0.6 ? (budgetRatio - 0.6) * 50 : 0;
  // Cards under 15% of budget get an affordability boost (easy to buy multiples, low risk)
  const affordabilityBoost = budgetRatio <= 0.15 ? 10 : budgetRatio <= 0.30 ? 5 : 0;

  // --- Price trend ---
  const trendDirection = getTrendDirection(input.avg1, input.avg7, input.avg30, input.lastSoldPrice, input.marketPrice);
  const trendBoost = trendDirection === "rising" ? 8 : trendDirection === "falling" ? -10 : 0;

  // --- Overpriced vs sold comps penalty ---
  const overPricePenalty = ratio > 1.12 ? (ratio - 1.12) * 70 : 0;

  // --- Product/format modifiers ---
  const englishBoost = input.language === "ENGLISH" ? 8 : -5;
  const sealedBoost = input.isSealed ? 8 : -2;
  const loosePackPenalty = input.productType === "LOOSE_PACK" ? 18 : 0;
  const preorderBoost = input.isPreorder ? 6 : 0;
  const monthsSinceRelease = monthDiffFromNow(input.releaseDate);
  const postHypeWindowBoost = !input.isPreorder && monthsSinceRelease > 1 && monthsSinceRelease < 6 ? 5 : 0;

  // -------------------------------------------------------------------------
  // Score calculations
  // -------------------------------------------------------------------------
  const buyScore = clampScore(
    46
    - overPricePenalty
    - budgetPenalty
    + affordabilityBoost
    + trendBoost
    + preorderBoost
    + postHypeWindowBoost
    + englishBoost
    + rarityBoost
    + liquidity
    + popularity
    + popularityBoost
  );

  const flipScore = clampScore(
    42
    - overPricePenalty / 2
    - budgetPenalty / 2
    + trendBoost
    + englishBoost
    + rarityBoost
    + popularityBoost
    + liquidity
    + psaSpread * 15
    - (input.isSealed ? 3 : 0)
  );

  const longTermHoldScore = clampScore(
    40
    + sealedBoost
    + englishBoost
    + rarityBoost / 2
    + (monthsSinceRelease < 2 ? 6 : 0)
    + popularityBoost
    + liquidity
    - loosePackPenalty
    - budgetPenalty / 3
  );

  const ripScore = clampScore(
    33
    + (!input.isSealed ? 0 : 8)
    + rarityBoost / 2
    + popularityBoost
    + psaSpread * 10
    - overPricePenalty
    - budgetPenalty / 2
    - (input.productType === "BOOSTER_BOX" ? 6 : 0)
  );

  const riskScore = clampScore(
    36
    + overPricePenalty
    + budgetPenalty
    + (input.language === "JAPANESE" ? 6 : 0)
    + (input.isPreorder ? 8 : 0)
    + (input.productType === "LOOSE_PACK" ? 14 : 0)
    + (trendDirection === "falling" ? 8 : 0)
    - liquidity
    - affordabilityBoost / 2
  );

  // -------------------------------------------------------------------------
  // Price estimates
  // -------------------------------------------------------------------------
  const estimated3m = Number((input.marketPrice * (1 + (buyScore - riskScore) / 380)).toFixed(2));
  const estimated1y  = Number((input.marketPrice * (1 + (longTermHoldScore - riskScore) / 180)).toFixed(2));
  const estimated3y  = Number((input.marketPrice * (1 + (longTermHoldScore - riskScore) / 100)).toFixed(2));

  // -------------------------------------------------------------------------
  // Action — budget-aware thresholds
  // -------------------------------------------------------------------------
  let action: RecommendationAction = "MAYBE";
  if (budgetRatio > 1.0) {
    // Over total budget — always PASS regardless of scores
    action = "PASS";
  } else if (buyScore >= 70 && riskScore <= 55) {
    action = "BUY";
  } else if (longTermHoldScore >= 72 && input.isSealed) {
    action = "HOLD_SEALED";
  } else if (ripScore >= 68 && input.isSealed) {
    action = "RIP";
  } else if (buyScore <= 40 || riskScore >= 72) {
    action = "PASS";
  } else if (input.isSealed && longTermHoldScore < 52 && flipScore < 52) {
    action = "BUY_SINGLES_INSTEAD";
  }

  // -------------------------------------------------------------------------
  // Buy-under price — meaningful target based on sold comps + safety margin
  // -------------------------------------------------------------------------
  const buyUnderPriceAud = Number((input.lastSoldPrice * 0.90).toFixed(2));

  const budgetTier = getBudgetTier(input.marketPrice, budget);

  const confidenceBand =
    buyScore >= 72 ? "High" : buyScore >= 56 ? "Medium" : "Low";

  // -------------------------------------------------------------------------
  // Summary + reasoning
  // -------------------------------------------------------------------------
  const summaryMap: Record<RecommendationAction, string> = {
    BUY:                 "Good AU entry. Price, trend, and budget all align.",
    MAYBE:               "Interesting but wait for a cleaner entry or better stock.",
    PASS:                "Too expensive or too risky for the expected return.",
    RIP:                 "Fine for fun — not strong enough as a sealed investment hold.",
    HOLD_SEALED:         "Better held sealed long-term than flipped quickly.",
    BUY_SINGLES_INSTEAD: "Sealed product looks weak — targeted singles give better value."
  };

  const reasons = [
    budgetRatio > 0.6 ? `At A$${input.marketPrice} this takes up ${Math.round(budgetRatio * 100)}% of your $${budget} budget — consider spreading across cheaper cards.` : null,
    trendDirection === "rising"  ? "Price trending up across recent sold data — momentum is positive." : null,
    trendDirection === "falling" ? "Price trending down — wait for the floor before buying." : null,
    overPricePenalty > 8         ? "Currently priced above recent sold comps — overpay risk." : null,
    input.productType === "LOOSE_PACK" ? "Loose packs have poor expected value vs sealed bundles or boxes." : null,
    psaSpread > 0.8              ? `Strong PSA 10 upside (A$${input.psa10Price}) if raw condition is clean.` : null,
    isPopularPokemon && flipScore < 55 ? "Popular Pokemon but flip margin is thin at current price." : null,
    input.language === "JAPANESE"? "Japanese cards sell slower in AU — tighter local exit paths." : null,
    input.isPreorder             ? "Preorder pricing — value depends on print run and AU retail availability." : null,
    affordabilityBoost > 0       ? `Good budget fit at A$${input.marketPrice} — easy to buy multiples.` : null
  ]
    .filter(Boolean)
    .join(" ");

  return {
    buyScore,
    flipScore,
    longTermHoldScore,
    ripScore,
    riskScore,
    estimated3m,
    estimated1y,
    estimated3y,
    action,
    confidenceBand,
    buyUnderPriceAud,
    budgetTier,
    trendDirection,
    summary: summaryMap[action],
    reasoning: reasons || "Balanced setup with moderate upside and manageable risk."
  };
}
