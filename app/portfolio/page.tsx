import { AppShell } from "@/components/app-shell";
import { PortfolioForm } from "@/components/portfolio-form";
import { StatCard } from "@/components/stat-card";
import { requireSession } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { getPortfolio } from "@/lib/services/portfolio";
import { formatAud } from "@/lib/utils";

export default async function PortfolioPage() {
  const session = await requireSession();
  const { items, summary } = await getPortfolio(session.userId);
  const products = await prisma.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  return (
    <AppShell title="Portfolio" subtitle="Track entries, cost basis, and current AUD mark-to-market performance across your holdings.">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Cost basis" value={summary.costBasis} currency />
        <StatCard label="Market value" value={summary.marketValue} currency />
        <StatCard label="Unrealized P/L" value={summary.unrealized} currency />
      </div>

      <div className="mt-8">
        <PortfolioForm products={products} />
      </div>

      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
              <div>
                <div className="font-medium">{item.label}</div>
                <div className="text-sm text-slate-500">
                  {item.status} · Qty {item.quantity} · {item.store}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatAud(Number(item.buyPriceAud) * item.quantity)}</div>
                <div className="text-sm text-slate-500">Bought {new Date(item.purchasedAt).toLocaleDateString("en-AU")}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
