import { getMarketIntelligenceForItem } from "@/lib/services/market-intelligence";

type ItemWithMarket = {
  id: string;
  slug: string;
  name: string;
  currentMarketPrice: number | { toString(): string };
  lastSoldPrice?: number | { toString(): string } | null;
  releaseDate?: Date | null;
  isPreorder?: boolean;
  set?: {
    name?: string | null;
    releaseDate?: Date | null;
  } | null;
  listingSnapshots: any[];
  salesRecords: any[];
};

export function attachMarketIntelligence<T extends ItemWithMarket>(item: T) {
  const intelligence = getMarketIntelligenceForItem(item);

  return {
    ...item,
    marketIntelligence: {
      availabilityMode: intelligence.availabilityMode,
      marketGuardrail: intelligence.marketGuardrail,
      confidence: intelligence.confidence,
      bargainBuyPrice: intelligence.bargainBuyPrice,
      strongBuyPrice: intelligence.strongBuyPrice,
      passAbovePrice: intelligence.passAbovePrice,
      fairValueLow: intelligence.fairValueLow,
      fairValueHigh: intelligence.fairValueHigh,
      recentSalesAverage: intelligence.recentSalesAverage,
      shortTermTrend: intelligence.shortTermTrend,
      staleListingCount: intelligence.staleListingCount,
      placeholderListingCount: intelligence.placeholderListingCount,
      suspiciousListingCount: intelligence.suspiciousListingCount,
      listingVerdict: intelligence.listingVerdict,
      movementReasons: intelligence.movementReasons
    }
  };
}

export function attachMarketIntelligenceList<T extends ItemWithMarket>(items: T[]) {
  return items.map(attachMarketIntelligence);
}
