import {
  getActionableListings,
  getAvailabilityMode,
  getLastThreeSales,
  getMinutesSince,
  getRecentSalesAverage,
  getSuspiciousListings,
  type LiveListing,
  type RecentSale
} from "@/lib/services/market";

type IntelligenceInput = {
  currentMarketPrice: number;
  lastSoldPrice: number;
  releaseDate?: Date | null;
  isPreorder?: boolean;
  listings: LiveListing[];
  sales: RecentSale[];
};

export type MarketIntelligence = {
  bestListing: LiveListing | null;
  availabilityMode: "IN_STOCK" | "PREORDER_ONLY" | "UNAVAILABLE";
  marketGuardrail: {
    label: "In Stock" | "Preorder Only" | "Unavailable";
    tone: "safe" | "warning" | "danger";
    note: string;
  };
  staleListingCount: number;
  placeholderListingCount: number;
  suspiciousListingCount: number;
  recentSales: RecentSale[];
  recentSalesAverage: number | null;
  fairValueLow: number;
  fairValueHigh: number;
  bargainBuyPrice: number;
  strongBuyPrice: number;
  passAbovePrice: number;
  listingVerdict: "UNDERVALUED" | "FAIR" | "OVERPRICED";
  shortTermTrend: "RISING" | "FLAT" | "FALLING" | "UNKNOWN";
  confidence: "High" | "Medium" | "Low";
  movementReasons: string[];
};

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function getMonthsSince(date?: Date | null) {
  if (!date) return null;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 30);
}

function deriveTrend(sales: RecentSale[]) {
  if (sales.length < 2) return "UNKNOWN" as const;

  const latest = Number(sales[0].normalizedPriceAud);
  const oldest = Number(sales[sales.length - 1].normalizedPriceAud);
  const change = (latest - oldest) / Math.max(oldest, 1);

  if (change >= 0.05) return "RISING" as const;
  if (change <= -0.05) return "FALLING" as const;
  return "FLAT" as const;
}

export function buildMarketIntelligence(input: IntelligenceInput): MarketIntelligence {
  const listings = getActionableListings(input.listings);
  const recentSales = getLastThreeSales(input.sales);
  const recentSalesAverage = getRecentSalesAverage(input.sales);
  const bestListing = listings[0] ?? null;
  const availabilityMode = getAvailabilityMode(input.listings);
  const monthsSinceRelease = getMonthsSince(input.releaseDate);
  const baseMarketAnchor = recentSalesAverage ?? input.lastSoldPrice ?? input.currentMarketPrice;
  const fairValueLow = roundCurrency(baseMarketAnchor * 0.96);
  const fairValueHigh = roundCurrency(baseMarketAnchor * 1.04);
  const bargainBuyPrice = roundCurrency(baseMarketAnchor * (input.isPreorder ? 0.97 : 0.92));
  const strongBuyPrice = roundCurrency(baseMarketAnchor * (input.isPreorder ? 1 : 0.96));
  const passAbovePrice = roundCurrency(baseMarketAnchor * (input.isPreorder ? 1.08 : 1.12));
  const activeListingCount = listings.length;
  const staleListingCount = listings.filter((listing) => getMinutesSince(listing.fetchedAt) > 60 * 24).length;
  const placeholderListingCount = input.listings.filter((listing) => listing.isPlaceholder || listing.stockStatus === "PLACEHOLDER").length;
  const suspiciousListingCount = getSuspiciousListings(input.listings).length;
  const listingSpread =
    listings.length >= 2
      ? (Number(listings[listings.length - 1].normalizedPriceAud) - Number(listings[0].normalizedPriceAud)) /
        Math.max(Number(listings[0].normalizedPriceAud), 1)
      : 0;
  const bestListingPrice = bestListing ? Number(bestListing.normalizedPriceAud) : input.currentMarketPrice;
  const listingVerdict =
    bestListingPrice <= fairValueLow
      ? "UNDERVALUED"
      : bestListingPrice >= fairValueHigh
        ? "OVERPRICED"
        : "FAIR";
  const shortTermTrend = deriveTrend(recentSales);
  const hasFreshListing = listings.some((listing) => Date.now() - new Date(listing.fetchedAt).getTime() < 1000 * 60 * 60 * 6);
  let confidence: "High" | "Medium" | "Low" =
    recentSales.length >= 3 && activeListingCount >= 2 && hasFreshListing
      ? "High"
      : recentSales.length >= 2 || activeListingCount >= 1
        ? "Medium"
        : "Low";
  if (staleListingCount > 0 && confidence === "High") confidence = "Medium";
  if ((availabilityMode !== "IN_STOCK" && activeListingCount <= 1) || staleListingCount >= 2 || suspiciousListingCount >= 2) {
    confidence = "Low";
  }

  const reasons: string[] = [];

  if (availabilityMode === "PREORDER_ONLY") {
    reasons.push("There are no real in-stock listings right now, so the visible market is being led by preorder pricing and can look artificially inflated.");
  }
  if (availabilityMode === "UNAVAILABLE") {
    reasons.push("There are no actionable live listings right now, so recent sales matter more than the displayed market price.");
  }
  if (staleListingCount > 0) {
    reasons.push("One or more live listings are stale, so treat the displayed market with extra caution until a fresh check confirms it.");
  }
  if (placeholderListingCount > 0) {
    reasons.push("Some tracked retailer rows look like placeholder-style listings, so they should not be treated as true supply.");
  }
  if (suspiciousListingCount > 0 && availabilityMode === "UNAVAILABLE") {
    reasons.push("Some rows still exist, but they look like search pages, placeholders, or stale soft stock rather than real buyable supply.");
  }
  if (input.isPreorder) {
    reasons.push("Preorder pricing is still moving, so patience matters more than tiny price differences.");
  }
  if (shortTermTrend === "FALLING" && listingSpread >= 0.08) {
    reasons.push("Recent sales are slipping while fresh listings are spreading wider, which usually means new supply is undercutting older asks.");
  }
  if (shortTermTrend === "FALLING" && monthsSinceRelease !== null && monthsSinceRelease <= 3) {
    reasons.push("This looks like a normal post-release supply wave rather than a long-term collapse.");
  }
  if (shortTermTrend === "RISING" && activeListingCount <= 1) {
    reasons.push("Thin live supply is letting the market drift higher, so this is a worse entry than it looks at first glance.");
  }
  if (bestListingPrice > passAbovePrice) {
    reasons.push("Current asks are well above the recent market reality, so waiting for a dip is safer.");
  }
  if (bestListingPrice <= bargainBuyPrice) {
    reasons.push("The cheapest live listing is below the recent value band, which makes this a genuine bargain rather than just a fair buy.");
  }
  if (activeListingCount >= 3 && listingSpread <= 0.05) {
    reasons.push("Multiple sellers are clustered tightly in price, which usually means the market is finding a fair level.");
  }
  if (reasons.length === 0) {
    reasons.push("The latest sales and current listings are fairly aligned, so the decision mostly comes down to your strategy and patience.");
  }

  const marketGuardrail =
    availabilityMode === "IN_STOCK"
      ? {
          label: "In Stock" as const,
          tone: staleListingCount > 0 || placeholderListingCount > 0 ? ("warning" as const) : ("safe" as const),
          note:
            suspiciousListingCount > 0
              ? "In-stock pricing exists, but at least one listing looks soft, stale, or indirect, so confirm the source before trusting the market."
              : staleListingCount > 0
                ? "In-stock pricing exists, but at least one listing is stale and needs fresh confirmation."
              : placeholderListingCount > 0
                ? "In-stock pricing exists, but some tracked rows look soft or placeholder-like."
                : "Market price is anchored by real in-stock listings."
        }
      : availabilityMode === "PREORDER_ONLY"
        ? {
            label: "Preorder Only" as const,
            tone: "warning" as const,
            note: "Treat this market as hype-sensitive until real in-stock supply appears."
          }
        : {
            label: "Unavailable" as const,
            tone: "danger" as const,
            note: "No actionable listings are live, so recent sales matter more than the shown market price."
          };

  return {
    bestListing,
    availabilityMode,
    marketGuardrail,
    staleListingCount,
    placeholderListingCount,
    suspiciousListingCount,
    recentSales,
    recentSalesAverage: recentSalesAverage ? roundCurrency(recentSalesAverage) : null,
    fairValueLow,
    fairValueHigh,
    bargainBuyPrice,
    strongBuyPrice,
    passAbovePrice,
    listingVerdict,
    shortTermTrend,
    confidence,
    movementReasons: reasons
  };
}

type IntelligenceItemLike = {
  currentMarketPrice: number | { toString(): string };
  lastSoldPrice?: number | { toString(): string } | null;
  releaseDate?: Date | null;
  isPreorder?: boolean;
  set?: {
    releaseDate?: Date | null;
  } | null;
  listingSnapshots: LiveListing[];
  salesRecords: RecentSale[];
};

export function getMarketIntelligenceForItem(item: IntelligenceItemLike) {
  const releaseDate = "releaseDate" in item ? item.releaseDate : item.set?.releaseDate;
  const isUpcomingRelease = releaseDate ? new Date(releaseDate).getTime() > Date.now() : false;
  const hasLivePreorderSignal = item.listingSnapshots.some((listing) => listing.stockStatus === "PREORDER");
  const isPreorderFlag = "isPreorder" in item ? Boolean(item.isPreorder) : false;

  return buildMarketIntelligence({
    currentMarketPrice: Number(item.currentMarketPrice),
    lastSoldPrice: Number(item.lastSoldPrice ?? item.currentMarketPrice),
    releaseDate,
    isPreorder: (isPreorderFlag && isUpcomingRelease) || hasLivePreorderSignal,
    listings: item.listingSnapshots,
    sales: item.salesRecords
  });
}
