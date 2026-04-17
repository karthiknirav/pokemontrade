import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { PriceChart } from "@/components/price-chart";
import { RecentSales } from "@/components/recent-sales";
import { RecommendationPill } from "@/components/recommendation-pill";
import { ScoreBadge } from "@/components/score-badge";
import { SourceBadge } from "@/components/source-badge";
import { requireSession } from "@/lib/auth/guard";
import { getMarketIntelligenceForItem } from "@/lib/services/market-intelligence";
import { applyRecommendationGuardrails } from "@/lib/services/recommendation-guardrails";
import { getActionableListings, getDataFreshnessLabel, getLastThreeSales } from "@/lib/services/market";
import { getCardBySlug } from "@/lib/services/products";
import { formatAud } from "@/lib/utils";

export default async function CardDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession();
  const { slug } = await params;
  const card = await getCardBySlug(slug);
  if (!card) notFound();

  const recommendation = card.recommendations[0];
  const snapshot = card.scoreSnapshots[0];
  const liveListings = getActionableListings(card.listingSnapshots);
  const recentSales = getLastThreeSales(card.salesRecords);
  const intelligence = getMarketIntelligenceForItem(card);
  const guardedRecommendation = applyRecommendationGuardrails(
    {
      action: recommendation?.action,
      summary: recommendation?.summary,
      reasoning: recommendation?.reasoning,
      buyUnderPriceAud: Number(recommendation?.buyUnderPriceAud ?? card.currentMarketPrice)
    },
    intelligence
  );
  const lastThreeAverage = recentSales.length
    ? recentSales.reduce((sum, sale) => sum + Number(sale.normalizedPriceAud), 0) / recentSales.length
    : null;

  return (
    <AppShell title={`${card.name} ${card.number}`} subtitle={card.notes ?? "Card detail and profit outlook for the Australian market."}>
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-slate-500">{card.set.name}</div>
              <div className="mt-2 text-3xl font-semibold">{formatAud(Number(card.currentMarketPrice))}</div>
              <div className="mt-1 text-sm text-slate-500">PSA 10 {formatAud(Number(card.psa10Price ?? 0))}</div>
            </div>
            {recommendation ? <RecommendationPill action={guardedRecommendation.action} /> : null}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            <ScoreBadge label="Buy" score={snapshot?.buyScore ?? 0} />
            <ScoreBadge label="Flip" score={snapshot?.flipScore ?? 0} />
            <ScoreBadge label="Hold" score={snapshot?.longTermHoldScore ?? 0} />
            <ScoreBadge label="Rip" score={snapshot?.ripScore ?? 0} />
            <ScoreBadge label="Risk" score={snapshot?.riskScore ?? 0} />
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <div className="font-medium text-ink">{guardedRecommendation.summary}</div>
            <div className="mt-2 text-sm text-slate-600">{guardedRecommendation.reasoning}</div>
            <div className="mt-3 text-sm text-slate-700">
              Last 3 sales avg: {lastThreeAverage ? formatAud(lastThreeAverage) : "No sales stored"}
            </div>
            <div className="mt-2 text-sm text-slate-700">
              Market stance: {intelligence.listingVerdict} - {intelligence.shortTermTrend.toLowerCase()} short-term trend
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Historical price</h3>
          <div className="mt-4">
            <PriceChart
              data={card.priceHistory.map((point) => ({
                date: new Date(point.recordedAt).toLocaleDateString("en-AU", { month: "short", day: "numeric" }),
                price: Number(point.price)
              }))}
            />
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-3xl border border-mist bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Market intelligence</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Bargain buy</div>
            <div className="mt-1 font-semibold">{formatAud(intelligence.bargainBuyPrice)}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Strong buy</div>
            <div className="mt-1 font-semibold">{formatAud(intelligence.strongBuyPrice)}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Fair band</div>
            <div className="mt-1 font-semibold">
              {formatAud(intelligence.fairValueLow)} - {formatAud(intelligence.fairValueHigh)}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Pass above</div>
            <div className="mt-1 font-semibold">{formatAud(intelligence.passAbovePrice)}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Decision confidence</div>
            <div className="mt-1 font-semibold">{intelligence.confidence}</div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-amber-50 p-4">
          <div className="text-sm text-amber-800">Why the market looks this way</div>
          <ul className="mt-2 space-y-2 text-sm text-amber-950">
            {intelligence.movementReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-mist bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Live listings</h3>
        {intelligence.availabilityMode !== "IN_STOCK" ? (
          <div className="mt-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {intelligence.availabilityMode === "PREORDER_ONLY"
              ? "Only preorder pricing is currently available, so treat the visible market as hype-sensitive rather than a true in-stock floor."
              : "No actionable in-stock listings are stored right now, so recent sales are a better anchor than the displayed market price."}
          </div>
        ) : null}
        <div className="mt-4 space-y-3">
          {liveListings.map((listing) => (
            <div key={listing.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-100 p-4 md:flex-row md:items-center">
              <div>
                <SourceBadge name={listing.provider.name} logoLabel={listing.provider.logoLabel} />
                <div className="mt-2 text-sm text-slate-500">
                  {listing.stockStatus} - {getDataFreshnessLabel(listing.fetchedAt)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatAud(Number(listing.normalizedPriceAud))}</div>
                <a href={listing.sourceUrl} className="text-sm text-pine">
                  View listing
                </a>
              </div>
            </div>
          ))}
          {liveListings.length === 0 ? <div className="text-sm text-slate-500">No live listings stored yet.</div> : null}
        </div>
      </section>

      <div className="mt-8">
        <RecentSales sales={recentSales} />
      </div>
    </AppShell>
  );
}
