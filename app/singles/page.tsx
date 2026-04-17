import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { formatAud } from "@/lib/utils";

export const revalidate = 3600;

export default async function SinglesPage() {
  await requireSession();
  const items = await prisma.watchlistItem.findMany({ orderBy: { rank: "asc" } });

  return (
    <AppShell
      title="Top 50 Singles Watchlist"
      subtitle="Highest-value singles across Ascended Heroes, Chaos Rising, Scarlet &amp; Violet, Hidden Fates, Sun &amp; Moon, and Black &amp; White — ranked by live AUD price."
    >
      <section className="rounded-3xl border border-mist bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Card</th>
                <th className="px-4 py-3 font-medium">Set</th>
                <th className="px-4 py-3 font-medium text-right">Price AUD</th>
                <th className="px-4 py-3 font-medium text-right">Price USD</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{item.rank}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-10 w-7 rounded object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-10 w-7 items-center justify-center rounded bg-slate-100 text-base">🃏</div>
                      )}
                      <div>
                        <div className="font-medium text-ink">{item.name}</div>
                        <div className="text-xs text-slate-400">{item.cardNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{item.setName}</td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">
                    {item.priceAud ? formatAud(Number(item.priceAud)) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {item.priceUsd ? `$${Number(item.priceUsd).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {item.tcgplayerUrl ? (
                      <a
                        href={item.tcgplayerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition"
                      >
                        TCGPlayer
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
