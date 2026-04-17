import { AppShell } from "@/components/app-shell";
import { AdminIngestButton } from "@/components/admin-ingest-button";
import { requireSession } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { getProviderHealth } from "@/lib/services/providers";
import type { ProviderHealth } from "@/lib/services/providers";

type SetRow = { id: string; name: string; notes: string | null };
type RetailerRow = { id: string; name: string; websiteUrl: string };
type CardRow = { id: string; name: string; number: string; notes: string | null };
type ProductRow = { id: string; name: string; notes: string | null };

export default async function AdminPage() {
  await requireSession();
  const [sets, cards, products, retailers, providerHealth] = await Promise.all([
    prisma.tcgSet.findMany({ orderBy: { releaseDate: "desc" } }),
    prisma.card.findMany({ take: 6, orderBy: { updatedAt: "desc" } }),
    prisma.product.findMany({ take: 6, orderBy: { updatedAt: "desc" } }),
    prisma.retailer.findMany({ orderBy: { name: "asc" } }),
    getProviderHealth()
  ]);

  return (
    <AppShell
      title="Admin"
      subtitle="MVP admin surface for reviewing sets, cards, products, retailers, and future score overrides or manual notes."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Sets</h3>
          <div className="mt-4 space-y-3">
            {sets.map((set: SetRow) => (
              <div key={set.id} className="rounded-2xl border border-slate-100 p-3">
                <div className="font-medium">{set.name}</div>
                <div className="text-sm text-slate-500">{set.notes}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Retailers</h3>
          <div className="mt-4 space-y-3">
            {retailers.map((retailer: RetailerRow) => (
              <div key={retailer.id} className="rounded-2xl border border-slate-100 p-3">
                <div className="font-medium">{retailer.name}</div>
                <div className="text-sm text-slate-500">{retailer.websiteUrl}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Provider sync</h3>
          <div className="mt-4 space-y-3">
            {providerHealth.map((provider: ProviderHealth) => {
              const healthTone =
                provider.healthLabel === "Healthy"
                  ? "bg-emerald-50 text-emerald-800"
                  : provider.healthLabel === "Watch"
                    ? "bg-amber-50 text-amber-800"
                    : "bg-rose-50 text-rose-800";
              return (
                <div key={provider.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{provider.name}</div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${healthTone}`}>{provider.healthLabel}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {provider.sourceLinkCount} links - trust {provider.trustScore}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Last run: {provider.lastRunSummary}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">{provider.healthNote}</div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>{provider.actionableCount} in stock</span>
                        <span>{provider.preorderCount} preorder</span>
                        <span>{provider.staleCount} stale</span>
                        <span>{provider.suspiciousCount} suspicious</span>
                        <span>{provider.placeholderCount} soft / placeholder</span>
                      </div>
                    </div>
                    <AdminIngestButton providerSlug={provider.slug} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Cards</h3>
          <div className="mt-4 space-y-3">
            {cards.map((card: CardRow) => (
              <div key={card.id} className="rounded-2xl border border-slate-100 p-3">
                <div className="font-medium">
                  {card.name} {card.number}
                </div>
                <div className="text-sm text-slate-500">{card.notes}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Products</h3>
          <div className="mt-4 space-y-3">
            {products.map((product: ProductRow) => (
              <div key={product.id} className="rounded-2xl border border-slate-100 p-3">
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-slate-500">{product.notes}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
