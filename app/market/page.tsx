import { AppShell } from "@/components/app-shell";
import { EbayImportForm } from "@/components/ebay-import-form";
import { SalesImportForm } from "@/components/sales-import-form";
import { requireSession } from "@/lib/auth/guard";
import { getReleaseImpactReport, getReleaseImpactSummary } from "@/lib/services/release-impact";
import { getTrendingSets } from "@/lib/services/trending";
import { formatAud } from "@/lib/utils";

export default async function MarketPage() {
  await requireSession();
  const [report, trending7d, trending30d] = await Promise.all([
    getReleaseImpactReport(),
    getTrendingSets("7d", 8),
    getTrendingSets("30d", 5)
  ]);
  const summary = getReleaseImpactSummary(report);

  return (
    <AppShell
      title="Market Impact"
      subtitle="Track how items moved versus earlier history, see the likely reason, and bring in fresh sold comps when the market has moved faster than the seed data."
    >
      {trending7d.length > 0 && (
        <section className="mb-6 rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Trending sets this week</h3>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">7-day</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {trending7d.map((set) => {
              const cm = set.cardmarket;
              const isUp = cm?.price_change?.startsWith("+");
              return (
                <div key={set.set_code} className="rounded-2xl border border-slate-100 p-4">
                  <div className="text-sm font-semibold text-ink leading-tight">{set.set_name}</div>
                  <div className="mt-1 text-xs text-slate-400">{set.card_count} cards</div>
                  {cm && (
                    <>
                      <div className={`mt-2 text-xl font-bold ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
                        {cm.price_change}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        avg {cm.avg_price_previous != null ? `€${cm.avg_price_previous.toFixed(2)}` : "—"} → €{cm.avg_price_current.toFixed(2)}
                      </div>
                      {cm.top_movers.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {cm.top_movers.slice(0, 3).map((m) => (
                            <li key={m.name} className="flex items-center justify-between gap-2 text-xs">
                              <span className="min-w-0 truncate text-slate-600">{m.name}</span>
                              <span className={`shrink-0 font-semibold ${m.change.startsWith("+") ? "text-emerald-600" : "text-rose-600"}`}>
                                {m.change}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {trending30d.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-slate-500 hover:text-ink">30-day trending sets</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {trending30d.map((set) => {
                  const cm = set.cardmarket;
                  const isUp = cm?.price_change?.startsWith("+");
                  return (
                    <div key={set.set_code} className="rounded-2xl border border-slate-100 p-3">
                      <div className="text-xs font-semibold text-ink leading-tight">{set.set_name}</div>
                      {cm && (
                        <div className={`mt-1 text-base font-bold ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
                          {cm.price_change}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </section>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Release-cycle drops</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{summary.fallingCount}</div>
        </div>
        <div className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Above recent sales</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{summary.hypeRiskCount}</div>
        </div>
        <div className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Weak signal items</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{summary.weakSignalCount}</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Release-impact report</h3>
          <div className="mt-4 space-y-3">
            {report.map((row) => (
              <div key={`${row.itemType}-${row.slug}`} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-medium text-ink">{row.name}</div>
                    <div className="text-sm text-slate-500">{row.setName}</div>
                    <div className="mt-2 text-sm text-slate-600">{row.impactReason}</div>
                    <div className="mt-1 text-xs text-slate-500">{row.note}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold">{formatAud(row.currentMarketPrice)}</div>
                    <div className={row.changePct >= 0 ? "text-pine" : "text-clay"}>{row.changePct}% vs earliest tracked point</div>
                    <div className="text-slate-500">{row.availabilityMode} - {row.confidence}</div>
                    <div className="text-xs text-slate-500">
                      {row.currentVsSalesPct === null ? "No sales delta yet" : `${row.currentVsSalesPct > 0 ? "+" : ""}${row.currentVsSalesPct}% vs last 3 sales`}
                    </div>
                    <div className="text-xs text-slate-500">
                      {row.recentListingCount} recent listings / {row.suspiciousListingCount} suspicious / {row.staleListingCount} stale
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <div className="space-y-6">
          <EbayImportForm />
          <SalesImportForm />
        </div>
      </div>
    </AppShell>
  );
}
