import { AppShell } from "@/components/app-shell";
import { ProductTable } from "@/components/product-table";
import { RecommendationPill } from "@/components/recommendation-pill";
import { StatCard } from "@/components/stat-card";
import { requireSession } from "@/lib/auth/guard";
import { getDashboardData } from "@/lib/services/dashboard";
import { getMarketIntelligenceForItem } from "@/lib/services/market-intelligence";
import { applyRecommendationGuardrails } from "@/lib/services/recommendation-guardrails";
import { getReleaseImpactReport } from "@/lib/services/release-impact";
import { formatAud } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await requireSession();
  const [data, releaseImpact] = await Promise.all([getDashboardData(session.userId), getReleaseImpactReport()]);
  const portfolioValue = data.portfolioItems.reduce((sum, item) => {
    return sum + Number(item.buyPriceAud) * item.quantity;
  }, 0);
  const preorderProducts = data.products
    .filter(
      (product) =>
        product.isPreorder ||
        product.listingSnapshots.some((listing) => listing.isPreorder || listing.stockStatus === "PREORDER") ||
        product.listings.some((listing) => listing.isPreorder || listing.status === "PREORDER")
    )
    .sort((a, b) => (b.recommendations[0]?.buyScore ?? 0) - (a.recommendations[0]?.buyScore ?? 0))
    .slice(0, 3);
  const guardedBestBuys = data.products
    .filter((product) => product.recommendations[0])
    .map((product) => ({
      product,
      intelligence: getMarketIntelligenceForItem(product)
    }))
    .sort((a, b) => {
      const aPenalty = a.intelligence.availabilityMode === "IN_STOCK" ? 0 : a.intelligence.availabilityMode === "PREORDER_ONLY" ? 12 : 20;
      const bPenalty = b.intelligence.availabilityMode === "IN_STOCK" ? 0 : b.intelligence.availabilityMode === "PREORDER_ONLY" ? 12 : 20;
      return (b.product.recommendations[0]?.buyScore ?? 0) - bPenalty - ((a.product.recommendations[0]?.buyScore ?? 0) - aPenalty);
    });
  const inStockAnchoredCount = guardedBestBuys.filter(({ intelligence }) => intelligence.availabilityMode === "IN_STOCK").length;
  const preorderOnlyCount = guardedBestBuys.filter(({ intelligence }) => intelligence.availabilityMode === "PREORDER_ONLY").length;
  const releaseWatch = releaseImpact
    .filter((row) => row.changePct <= -8 || (row.currentVsSalesPct ?? 0) >= 8 || row.suspiciousListingCount > 0)
    .slice(0, 4);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Daily buying intel for sealed products and singles, tuned for AUD pricing, retailer movement, and explainable profit scores."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Best buys tracked" value={data.bestBuys.length} />
        <StatCard label="Live stock alerts" value={data.stockAlerts.length} />
        <StatCard label="In-stock anchored" value={inStockAnchoredCount} />
        <StatCard label="Preorder-only markets" value={preorderOnlyCount} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <StatCard label="Portfolio cost basis" value={portfolioValue} currency />
        <StatCard label="Active alerts" value={data.alerts.length} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section>
          <h3 className="mb-3 text-lg font-semibold">Best buys today</h3>
          <ProductTable
            rows={guardedBestBuys.map(({ product, intelligence }) => {
              const guarded = applyRecommendationGuardrails(
                {
                  action: product.recommendations[0]?.action,
                  summary: product.recommendations[0]?.summary,
                  reasoning: product.recommendations[0]?.reasoning,
                  buyUnderPriceAud: Number(product.recommendations[0]?.buyUnderPriceAud ?? product.currentMarketPrice)
                },
                intelligence
              );
              return {
                name: product.name,
                slug: product.slug,
                setName: product.set?.name ?? "Standalone",
                marketPrice: Number(product.currentMarketPrice),
                buyUnder: Number(guarded.buyUnderPriceAud ?? product.currentMarketPrice),
                marketGuardrail: intelligence.marketGuardrail,
                recommendation: {
                  action: guarded.action,
                  summary: guarded.summary
                },
                hrefBase: "/products" as const
              };
            })}
          />
        </section>

        <section className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Recent retailer changes</h3>
          <div className="mt-4 space-y-3">
            {data.recentRetailerChanges.map((listing) => (
              <div key={listing.id} className="rounded-2xl border border-slate-100 p-3">
                <div className="font-medium text-ink">{listing.product?.name ?? listing.card?.name}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {listing.provider.name} - {listing.stockStatus} - AUD {Number(listing.normalizedPriceAud).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold">Best preorder deals</h3>
            <a href="/preorders" className="text-sm font-medium text-pine">
              View all preorders
            </a>
          </div>
          <div className="mt-4 space-y-3">
            {preorderProducts.map((product) => {
              const recommendation = product.recommendations[0];
              const intelligence = getMarketIntelligenceForItem(product);
              const bestLiveListing = [...product.listingSnapshots]
                .filter((listing) => listing.isPreorder || listing.stockStatus === "PREORDER")
                .sort((a, b) => Number(a.normalizedPriceAud) - Number(b.normalizedPriceAud))[0];
              const bestLegacyListing = [...product.listings]
                .filter((listing) => listing.isPreorder || listing.status === "PREORDER")
                .sort((a, b) => Number(a.normalizedPrice) - Number(b.normalizedPrice))[0];
              const bestEntryPrice = bestLiveListing
                ? Number(bestLiveListing.normalizedPriceAud)
                : bestLegacyListing
                  ? Number(bestLegacyListing.normalizedPrice)
                  : Number(product.currentMarketPrice);

              return (
                <div key={product.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-medium text-ink">{product.name}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {product.set?.name ?? "Standalone"} - Release {new Date(product.releaseDate).toLocaleDateString("en-AU")}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">{recommendation?.reasoning ?? "No preorder reasoning yet."}</div>
                    </div>
                    {recommendation ? <RecommendationPill action={recommendation.action} /> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
                    <div>Best entry {formatAud(bestEntryPrice)}</div>
                    <div>Buy under {formatAud(Number(recommendation?.buyUnderPriceAud ?? product.currentMarketPrice))}</div>
                    <div>Buy score {recommendation?.buyScore ?? "-"}</div>
                  </div>
                  <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-950">{intelligence.marketGuardrail.note}</div>
                </div>
              );
            })}
            {preorderProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No preorder products are currently surfaced in the seeded data.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">High-profit singles</h3>
          <div className="mt-4 space-y-3">
            {data.cards.map((card) => (
              <div key={card.id} className="rounded-2xl border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-ink">{card.name}</div>
                    <div className="text-sm text-slate-500">{card.set.name}</div>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    <div>AUD {Number(card.currentMarketPrice).toFixed(2)}</div>
                    <div>Buy score {card.recommendations[0]?.buyScore ?? "-"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8">
        <section className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Risky overpriced products</h3>
          <div className="mt-4 space-y-3">
            {data.riskyProducts.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 p-3">
                <div className="font-medium text-ink">{item.summary}</div>
                <div className="mt-1 text-sm text-slate-500">
                  Risk {item.riskScore} - Buy score {item.buyScore} - {item.reasoning}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8">
        <section className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold">Release-impact watchlist</h3>
            <a href="/market" className="text-sm font-medium text-pine">
              Open market report
            </a>
          </div>
          <div className="mt-4 space-y-3">
            {releaseWatch.map((row) => (
              <div key={`${row.itemType}-${row.slug}`} className="rounded-2xl border border-slate-100 p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-medium text-ink">{row.name}</div>
                    <div className="text-sm text-slate-500">{row.impactReason}</div>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    <div>{row.changePct}% tracked move</div>
                    <div>{row.currentVsSalesPct === null ? "No recent sales delta" : `${row.currentVsSalesPct > 0 ? "+" : ""}${row.currentVsSalesPct}% vs sales`}</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {row.availabilityMode} / {row.confidence} / {row.suspiciousListingCount} suspicious / {row.staleListingCount} stale
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
