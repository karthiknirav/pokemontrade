import type { RecentSale } from "@/lib/services/market";
import { formatAud } from "@/lib/utils";
import { SourceBadge } from "@/components/source-badge";

export function RecentSales({ sales }: { sales: RecentSale[] }) {
  return (
    <section className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold">Last 3 sales</h3>
      <div className="mt-4 space-y-3">
        {sales.map((sale) => (
          <div key={sale.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-100 p-4 md:flex-row md:items-center">
            <div className="space-y-2">
              <SourceBadge name={sale.provider.name} logoLabel={sale.provider.logoLabel} tone="muted" />
              <div className="text-sm text-slate-500">
                {new Date(sale.soldAt).toLocaleDateString("en-AU")} {sale.condition ? `- ${sale.condition}` : ""}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-ink">{formatAud(Number(sale.normalizedPriceAud))}</div>
              <div className="text-sm text-slate-500">{sale.sourceTitle}</div>
            </div>
          </div>
        ))}
        {sales.length === 0 ? <div className="text-sm text-slate-500">No recent sales stored yet.</div> : null}
      </div>
    </section>
  );
}
