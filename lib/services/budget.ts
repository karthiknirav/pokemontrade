import { getCards } from "@/lib/services/products";
import { getMarketIntelligenceForItem } from "@/lib/services/market-intelligence";

type StrategyMode = "AUTO" | "SINGLE" | "BALANCED" | "BARGAINS" | "MOMENTUM";

export type BudgetRecommendation = {
  strategy: StrategyMode;
  title: string;
  totalSpend: number;
  leftover: number;
  rationale: string;
  picks: Array<{
    slug: string;
    name: string;
    setName: string;
    price: number;
    bargainBuyPrice: number;
    fairValueLow: number;
    fairValueHigh: number;
    verdict: string;
    confidence: string;
    reason: string;
    changePct?: number | null;
  }>;
};

function normalizeStrategy(value?: string): StrategyMode {
  switch (value) {
    case "SINGLE":
    case "BALANCED":
    case "BARGAINS":
    case "MOMENTUM":
      return value;
    default:
      return "AUTO";
  }
}

function buildCardScore(params: {
  buyScore: number;
  flipScore: number;
  holdScore: number;
  riskScore: number;
  verdict: string;
  trend: string;
}) {
  let score = params.buyScore * 1.4 + params.flipScore * 0.8 + params.holdScore * 0.6 - params.riskScore * 1.1;
  if (params.verdict === "UNDERVALUED") score += 20;
  if (params.verdict === "OVERPRICED") score -= 25;
  if (params.trend === "FALLING") score += 4;
  if (params.trend === "RISING") score -= 8;
  return score;
}

function calcPriceChangePct(priceHistory: Array<{ price: unknown }>): number | null {
  if (priceHistory.length < 2) return null;
  const oldest = Number(priceHistory[0]?.price ?? 0);
  const newest = Number(priceHistory[priceHistory.length - 1]?.price ?? 0);
  if (oldest <= 0) return null;
  return Math.round(((newest - oldest) / oldest) * 100);
}

function buildRecommendation(
  strategy: StrategyMode,
  budgetAud: number,
  cards: Awaited<ReturnType<typeof getCards>>
): BudgetRecommendation {
  const candidates = cards
    .map((card) => {
      const recommendation = card.recommendations[0];
      const snapshot = card.scoreSnapshots[0];
      const intelligence = getMarketIntelligenceForItem(card);
      const price = Number(card.currentMarketPrice);
      const changePct = calcPriceChangePct(card.priceHistory);
      return {
        card,
        price,
        changePct,
        recommendation,
        intelligence,
        score: buildCardScore({
          buyScore: recommendation?.buyScore ?? snapshot?.buyScore ?? 50,
          flipScore: recommendation?.flipScore ?? snapshot?.flipScore ?? 50,
          holdScore: recommendation?.longTermHoldScore ?? snapshot?.longTermHoldScore ?? 50,
          riskScore: recommendation?.riskScore ?? snapshot?.riskScore ?? 50,
          verdict: intelligence.listingVerdict,
          trend: intelligence.shortTermTrend
        })
      };
    })
    .filter((candidate) => candidate.price > 0 && candidate.price <= budgetAud);

  const makePick = (candidate: (typeof candidates)[number]) => ({
    slug: candidate.card.slug,
    name: `${candidate.card.name} ${candidate.card.number}`,
    setName: candidate.card.set.name,
    price: candidate.price,
    bargainBuyPrice: candidate.intelligence.bargainBuyPrice,
    fairValueLow: candidate.intelligence.fairValueLow,
    fairValueHigh: candidate.intelligence.fairValueHigh,
    verdict: candidate.intelligence.listingVerdict,
    confidence: candidate.intelligence.confidence,
    reason: candidate.intelligence.movementReasons[0] ?? candidate.recommendation?.summary ?? "Clean setup.",
    changePct: candidate.changePct
  });

  if (strategy === "SINGLE") {
    const pick = [...candidates].sort((a, b) => b.score - a.score)[0];
    return {
      strategy,
      title: "One premium anchor card",
      totalSpend: pick?.price ?? 0,
      leftover: Math.max(0, budgetAud - (pick?.price ?? 0)),
      rationale: "Concentrates the budget into the strongest current conviction rather than spreading across weaker mid-tier cards.",
      picks: pick ? [makePick(pick)] : []
    };
  }

  if (strategy === "MOMENTUM") {
    const sorted = [...candidates].sort((a, b) => {
      if (a.changePct !== null && b.changePct !== null) return b.changePct - a.changePct;
      if (a.changePct !== null) return -1;
      if (b.changePct !== null) return 1;
      return b.score - a.score;
    });

    const picks: ReturnType<typeof makePick>[] = [];
    let totalSpend = 0;
    for (const candidate of sorted) {
      if (picks.length >= 20) break;
      if (totalSpend + candidate.price > budgetAud) continue;
      picks.push(makePick(candidate));
      totalSpend += candidate.price;
    }

    return {
      strategy,
      title: "Top 20 by price momentum",
      totalSpend,
      leftover: Math.max(0, budgetAud - totalSpend),
      rationale: "Ranks every card by historical price increase %. Cards that have already moved big tend to have proven collector demand — not a guarantee, but a real signal.",
      picks
    };
  }

  if (strategy === "BARGAINS") {
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const picks: ReturnType<typeof makePick>[] = [];
    let totalSpend = 0;
    for (const candidate of sorted.filter((c) => c.intelligence.listingVerdict !== "OVERPRICED")) {
      if (picks.length >= 20) break;
      if (totalSpend + candidate.price > budgetAud) continue;
      picks.push(makePick(candidate));
      totalSpend += candidate.price;
    }

    return {
      strategy,
      title: "Spread across multiple bargain entries",
      totalSpend,
      leftover: Math.max(0, budgetAud - totalSpend),
      rationale: "Prioritizes more entries and cleaner bargain bands so you are not forced into one oversized bet.",
      picks
    };
  }

  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const balancedPicks: ReturnType<typeof makePick>[] = [];
  let balancedSpend = 0;
  for (const candidate of sorted) {
    if (balancedPicks.length >= 4) break;
    if (balancedSpend + candidate.price > budgetAud) continue;
    balancedPicks.push(makePick(candidate));
    balancedSpend += candidate.price;
  }

  const balancedRecommendation: BudgetRecommendation = {
    strategy: "BALANCED",
    title: "Balanced basket",
    totalSpend: balancedSpend,
    leftover: Math.max(0, budgetAud - balancedSpend),
    rationale: "Mixes liquidity and upside so you can hold more than one position without drifting into bulk junk.",
    picks: balancedPicks
  };

  if (strategy === "BALANCED") return balancedRecommendation;

  const singleRecommendation = buildRecommendation("SINGLE", budgetAud, cards);
  const bargainRecommendation = buildRecommendation("BARGAINS", budgetAud, cards);
  const options = [singleRecommendation, balancedRecommendation, bargainRecommendation].filter((o) => o.picks.length > 0);
  return (
    options.sort((a, b) => {
      const aScore = a.picks.reduce((sum, p) => sum + (p.verdict === "UNDERVALUED" ? 2 : 1), 0) + a.totalSpend / Math.max(budgetAud, 1);
      const bScore = b.picks.reduce((sum, p) => sum + (p.verdict === "UNDERVALUED" ? 2 : 1), 0) + b.totalSpend / Math.max(budgetAud, 1);
      return bScore - aScore;
    })[0] ?? balancedRecommendation
  );
}

export async function getBudgetRecommendation(input: { budgetAud: number; strategy?: string }) {
  const budgetAud = Number.isFinite(input.budgetAud) ? Math.max(20, input.budgetAud) : 300;
  const strategy = normalizeStrategy(input.strategy);
  const cards = await getCards();
  return buildRecommendation(strategy, budgetAud, cards);
}
