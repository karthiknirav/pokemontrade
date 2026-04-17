import { AppShell } from "@/components/app-shell";
import { RecommendationPill } from "@/components/recommendation-pill";
import { ScoreBadge } from "@/components/score-badge";
import { requireSession } from "@/lib/auth/guard";
import { getMarketIntelligenceForItem } from "@/lib/services/market-intelligence";
import { applyRecommendationGuardrails } from "@/lib/services/recommendation-guardrails";
import { getPreorderProducts } from "@/lib/services/products";
import { formatAud } from "@/lib/utils";

export default async function PreordersPage() {
  await requireSession();
  const products = (await getPreorderProducts()).sort(
    (a, b) =>
      (b.recommendations[0]?.buyScore ?? 0) - (a.recommendations[0]?.buyScore ?? 0) ||
      Number(a.currentMarketPrice) - Number(b.currentMarketPrice)
  );
  const bestEntryProduct = products[0];
  const highestConviction = products.find((product) => (product.recommendations[0]?.buyScore ?? 0) >= 70);
  const waitForDip = products.find((product) => (product.scoreSnapshots[0]?.riskScore ?? 0) >= 55);

  return (
    <AppShell
      title="Preorders"
      subtitle="Scan upcoming Australian preorder opportunities, compare store entries, and decide whether to lock in early, wait, or pass."
    >
      <div className="rounded-[28px] border border-gold/40 bg-gradient-to-r from-ink via-pine to-ink p-6 text-white shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold">Preorder Radar</div>
            <h3 className="mt-3 text-3xl font-semibold">Use preorder pricing as your first edge, not your last resort.</h3>
            <p className="mt-3 max-w-2xl text-sm text-slate-200">
              This view ranks sealed releases by Australian preorder quality, risk, and resale potential so you can decide
              whether to lock in now, scale in later, or skip the hype entirely.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-200">Best Current Entry</div>
              <div className="mt-2 font-semibold">{bestEntryProduct?.name ?? "None"}</div>
              <div className="mt-1 text-sm text-slate-200">
                {bestEntryProduct
                  ? formatAud(
                      Number(
                        [...bestEntryProduct.listings]
                          .filter((listing) => listing.isPreorder || listing.status === "PREORDER")
                          .sort((a, b) => Number(a.normalizedPrice) - Number(b.normalizedPrice))[0]?.normalizedPrice ??
                          bestEntryProduct.currentMarketPrice
                      )
                    )
                  : "No listings"}
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-200">High Conviction</div>
              <div className="mt-2 font-semibold">{highestConviction?.name ?? "None yet"}</div>
              <div className="mt-1 text-sm text-slate-200">Buy score {highestConviction?.recommendations[0]?.buyScore ?? "-"}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-200">Likely Wait Candidate</div>
              <div className="mt-2 font-semibold">{waitForDip?.name ?? "None yet"}</div>
              <div className="mt-1 text-sm text-slate-200">Risk score {waitForDip?.scoreSnapshots[0]?.riskScore ?? "-"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Live preorder products</div>
          <div className="mt-3 text-3xl font-semibold text-ink">{products.length}</div>
        </div>
        <div className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Strong preorder setups</div>
          <div className="mt-3 text-3xl font-semibold text-pine">
            {products.filter((product) => (product.recommendations[0]?.buyScore ?? 0) >= 70).length}
          </div>
        </div>
        <div className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Average risk score</div>
          <div className="mt-3 text-3xl font-semibold text-ink">
            {products.length
              ? Math.round(
                  products.reduce((sum, product) => sum + (product.scoreSnapshots[0]?.riskScore ?? 0), 0) / products.length
                )
              : 0}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        {products.map((product) => {
          const recommendation = product.recommendations[0];
          const snapshot = product.scoreSnapshots[0];
          const intelligence = getMarketIntelligenceForItem(product);
          const guardedRecommendation = applyRecommendationGuardrails(
            {
              action: recommendation?.action,
              summary: recommendation?.summary,
              reasoning: recommendation?.reasoning,
              buyUnderPriceAud: Number(recommendation?.buyUnderPriceAud ?? product.currentMarketPrice)
            },
            intelligence
          );
          const preorderListings = product.listings
            .filter((listing) => listing.isPreorder || listing.status === "PREORDER")
            .sort((a, b) => Number(a.normalizedPrice) - Number(b.normalizedPrice));
          const lowestPreorder = preorderListings[0];
          const launchPremium =
            Number(product.currentMarketPrice) > 0 && lowestPreorder
              ? Math.round((1 - Number(lowestPreorder.normalizedPrice) / Number(product.currentMarketPrice)) * 100)
              : 0;
          const stance =
            (recommendation?.action === "BUY" || recommendation?.action === "HOLD_SEALED") && (snapshot?.riskScore ?? 0) <= 55
              ? "Lock in early"
              : (snapshot?.riskScore ?? 0) >= 60
                ? "Wait for a dip"
                : "Watch closely";

          return (
            <section key={product.id} className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-sm text-slate-500">{product.set?.name ?? "Standalone"}</div>
                  <h3 className="mt-1 text-2xl font-semibold text-ink">{product.name}</h3>
                  <p className="mt-2 max-w-3xl text-sm text-slate-600">
                    {guardedRecommendation.reasoning}
                  </p>
                </div>
                {recommendation ? <RecommendationPill action={guardedRecommendation.action} /> : null}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <ScoreBadge label="Buy" score={snapshot?.buyScore ?? 0} />
                <ScoreBadge label="Flip" score={snapshot?.flipScore ?? 0} />
                <ScoreBadge label="Hold" score={snapshot?.longTermHoldScore ?? 0} />
                <ScoreBadge label="Risk" score={snapshot?.riskScore ?? 0} />
                <div className="rounded-2xl border border-mist bg-slate-50 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Best Entry</div>
                  <div className="mt-1 text-lg font-semibold text-ink">
                    {lowestPreorder ? formatAud(Number(lowestPreorder.normalizedPrice)) : formatAud(Number(product.currentMarketPrice))}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">Preorder outlook</div>
                  <div className="mt-2 text-base font-semibold text-ink">{stance}</div>
                  <div className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-950">{intelligence.marketGuardrail.note}</div>
                  <div className="mt-2 text-sm text-slate-700">
                    Buy under {formatAud(Number(guardedRecommendation.buyUnderPriceAud ?? product.currentMarketPrice))}
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    Release date {new Date(product.releaseDate).toLocaleDateString("en-AU")}
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    1-year target {formatAud(Number(snapshot?.estimated1y ?? product.currentMarketPrice))}
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    Preorder edge {lowestPreorder ? `${launchPremium}% under current market` : "No direct preorder delta yet"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="text-sm font-medium text-ink">Australian preorder listings</div>
                  <div className="mt-3 space-y-3">
                    {preorderListings.map((listing) => (
                      <div key={listing.id} className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-100 p-3 md:flex-row md:items-center">
                        <div>
                          <div className="font-medium text-ink">{listing.retailer.name}</div>
                          <div className="text-sm text-slate-500">
                            {listing.status}
                            {listing.id === lowestPreorder?.id ? " - cheapest current entry" : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-ink">{formatAud(Number(listing.normalizedPrice))}</div>
                          <a href={listing.productUrl} className="text-sm text-pine">
                            View listing
                          </a>
                        </div>
                      </div>
                    ))}
                    {preorderListings.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                        No explicit preorder retailer rows yet. This product is still flagged as a preorder at the product level.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
