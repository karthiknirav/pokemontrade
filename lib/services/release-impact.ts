import { prisma } from "@/lib/db";
import { getMarketIntelligenceForItem } from "@/lib/services/market-intelligence";

type ReleaseImpactRow = {
  id: string;
  slug: string;
  name: string;
  itemType: "card" | "product";
  setName: string;
  currentMarketPrice: number;
  changePct: number;
  currentVsSalesPct: number | null;
  recentListingCount: number;
  availabilityMode: string;
  confidence: "High" | "Medium" | "Low";
  suspiciousListingCount: number;
  staleListingCount: number;
  impactReason: string;
  note: string;
};

type ReleaseImpactOptions = {
  limit?: number;
};

function inferReleaseReason(changePct: number, availabilityMode: string, staleCount: number, preorderCount: number) {
  if (availabilityMode === "PREORDER_ONLY") {
    return "Preorder-led market with thin real supply";
  }
  if (staleCount > 0) {
    return "Signal quality is weakened by stale listings";
  }
  if (changePct <= -0.1) {
    return preorderCount > 0 ? "Supply wave or preorder normalization" : "Fresh supply likely pushed the market down";
  }
  if (changePct >= 0.1) {
    return "Thin supply or renewed chase demand pushed prices higher";
  }
  return "Market is relatively stable versus recent history";
}

export async function getReleaseImpactReport(options?: ReleaseImpactOptions) {
  const [products, cards] = await Promise.all([
    prisma.product.findMany({
      include: {
        set: true,
        listingSnapshots: { include: { provider: true }, orderBy: { normalizedPriceAud: "asc" } },
        salesRecords: { include: { provider: true }, orderBy: { soldAt: "desc" }, take: 3 },
        priceHistory: { orderBy: { recordedAt: "asc" } }
      }
    }),
    prisma.card.findMany({
      include: {
        set: true,
        listingSnapshots: { include: { provider: true }, orderBy: { normalizedPriceAud: "asc" } },
        salesRecords: { include: { provider: true }, orderBy: { soldAt: "desc" }, take: 3 },
        priceHistory: { orderBy: { recordedAt: "asc" } }
      }
    })
  ]);

  const rows = [...products, ...cards].map<ReleaseImpactRow>((item) => {
    const points = item.priceHistory;
    const first = points[0] ? Number(points[0].price) : Number(item.currentMarketPrice);
    const last = points[points.length - 1] ? Number(points[points.length - 1].price) : Number(item.currentMarketPrice);
    const changePct = first > 0 ? (last - first) / first : 0;
    const intelligence = getMarketIntelligenceForItem(item);
    const currentVsSales =
      intelligence.recentSalesAverage !== null
        ? ((Number(item.currentMarketPrice) - intelligence.recentSalesAverage) / Math.max(intelligence.recentSalesAverage, 1)) * 100
        : null;
    const recentListings = item.listingSnapshots.filter(
      (listing) => Date.now() - new Date(listing.fetchedAt).getTime() < 1000 * 60 * 60 * 24 * 7
    );

    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      itemType: "number" in item ? "card" : "product",
      setName: item.set?.name ?? "Standalone",
      currentMarketPrice: Number(item.currentMarketPrice),
      changePct: Number((changePct * 100).toFixed(1)),
      currentVsSalesPct: currentVsSales === null ? null : Number(currentVsSales.toFixed(1)),
      recentListingCount: recentListings.length,
      availabilityMode: intelligence.availabilityMode,
      confidence: intelligence.confidence,
      suspiciousListingCount: intelligence.suspiciousListingCount,
      staleListingCount: intelligence.staleListingCount,
      impactReason: inferReleaseReason(
        changePct,
        intelligence.availabilityMode,
        intelligence.staleListingCount,
        item.listingSnapshots.filter((listing) => listing.stockStatus === "PREORDER").length
      ),
      note: intelligence.movementReasons[0] ?? intelligence.marketGuardrail.note
    };
  });

  const ranked = rows.sort((a, b) => {
    const aMagnitude = Math.max(Math.abs(a.changePct), Math.abs(a.currentVsSalesPct ?? 0));
    const bMagnitude = Math.max(Math.abs(b.changePct), Math.abs(b.currentVsSalesPct ?? 0));
    if (bMagnitude !== aMagnitude) return bMagnitude - aMagnitude;
    return b.recentListingCount - a.recentListingCount;
  });

  if (options?.limit && options.limit > 0) {
    return ranked.slice(0, options.limit);
  }

  return ranked;
}

export function getReleaseImpactSummary(rows: ReleaseImpactRow[]) {
  const fallingCount = rows.filter((row) => row.changePct <= -10).length;
  const risingCount = rows.filter((row) => row.changePct >= 10).length;
  const hypeRiskCount = rows.filter((row) => row.currentVsSalesPct !== null && row.currentVsSalesPct >= 8).length;
  const weakSignalCount = rows.filter((row) => row.suspiciousListingCount > 0 || row.staleListingCount > 0).length;
  const avgAbsoluteMovePct = rows.length
    ? Number((rows.reduce((sum, row) => sum + Math.abs(row.changePct), 0) / rows.length).toFixed(1))
    : 0;

  return {
    totalItems: rows.length,
    fallingCount,
    risingCount,
    hypeRiskCount,
    weakSignalCount,
    avgAbsoluteMovePct
  };
}
