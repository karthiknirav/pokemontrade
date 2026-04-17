import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/guard";
import { getRetailerTrackerData } from "@/lib/services/retailers";
import { formatAud } from "@/lib/utils";

export default async function RetailersPage() {
  await requireSession();
  const retailers = await getRetailerTrackerData();

  return (
    <AppShell
      title="Retailer Tracker"
      subtitle="Monitor Australian retailer pricing, restocks, and preorder signals with normalized AUD listings."
    >
      <div className="space-y-6">
        {retailers.map((retailer) => (
          <section key={retailer.id} className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{retailer.name}</h3>
                  {retailer.providerHealth ? (
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                        retailer.providerHealth.healthLabel === "Healthy"
                          ? "bg-emerald-50 text-emerald-800"
                          : retailer.providerHealth.healthLabel === "Watch"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-rose-50 text-rose-800"
                      }`}
                    >
                      {retailer.providerHealth.healthLabel}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-sm text-slate-500">{retailer.providerHealth?.healthNote ?? retailer.currency}</div>
                {retailer.providerHealth ? (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>{retailer.providerHealth.actionableCount} in stock</span>
                    <span>{retailer.providerHealth.preorderCount} preorder</span>
                    <span>{retailer.providerHealth.staleCount} stale</span>
                    <span>{retailer.providerHealth.suspiciousCount} suspicious</span>
                    <span>{retailer.providerHealth.placeholderCount} soft / placeholder</span>
                  </div>
                ) : null}
              </div>
              <div className="text-sm text-slate-500">{retailer.currency}</div>
            </div>
            <div className="mt-4 space-y-3">
              {retailer.listings.map((listing) => (
                <div key={listing.id} className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-100 p-4 md:flex-row md:items-center">
                  <div>
                    <div className="font-medium">{listing.product?.name ?? listing.card?.name}</div>
                    <div className="text-sm text-slate-500">{listing.status}</div>
                  </div>
                  <div className="font-semibold">{formatAud(Number(listing.normalizedPrice))}</div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
