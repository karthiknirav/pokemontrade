import { AppShell } from "@/components/app-shell";
import { EbayImportForm } from "@/components/ebay-import-form";
import { SalesImportForm } from "@/components/sales-import-form";
import { requireSession } from "@/lib/auth/guard";
import { getReleaseImpactReport, getReleaseImpactSummary } from "@/lib/services/release-impact";
import { formatAud } from "@/lib/utils";

export default async function MarketPage() {
  await requireSession();
  const report = await getReleaseImpactReport();
  const summary = getReleaseImpactSummary(report);

  return (
    <AppShell
      title="Market Impact"
      subtitle="Track how items moved versus earlier history, see the likely reason, and bring in fresh sold comps when the market has moved faster than the seed data."
    >
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
