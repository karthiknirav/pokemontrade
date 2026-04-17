import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { formatAud } from "@/lib/utils";

export const revalidate = 3600;

const SET_ORDER = [
  "Ascended Heroes",
  "Chaos Rising",
  "Mega Evolution (XY)",
  "Scarlet & Violet",
  "Prismatic Evolutions",
  "Surging Sparks",
  "Stellar Crown",
  "Temporal Forces",
  "Obsidian Flames",
  "Hidden Fates",
  "Sun & Moon",
  "Black & White",
];

export default async function SinglesPage() {
  await requireSession();
  const items = await prisma.watchlistItem.findMany({ orderBy: [{ setCategory: "asc" }, { rank: "asc" }] });

  const bySet = new Map<string, typeof items>();
  for (const item of items) {
    const cat = item.setCategory ?? "Other";
    if (!bySet.has(cat)) bySet.set(cat, []);
    bySet.get(cat)!.push(item);
  }

  const orderedSets = [
    ...SET_ORDER.filter((s) => bySet.has(s)),
    ...[...bySet.keys()].filter((k) => !SET_ORDER.includes(k))
  ];

  return (
    <AppShell
      title="Top Singles Watchlist"
      subtitle="Up to 50 highest-value singles per set — ranked by live AUD price from PokeWallet."
    >
      <div className="space-y-8">
        {orderedSets.map((setName) => {
          const cards = bySet.get(setName)!;
          return (
            <section key={setName} className="rounded-3xl border border-mist bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="font-semibold text-ink">{setName}</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">{cards.length} cards</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-50 text-left text-xs text-slate-400">
                      <th className="px-4 py-2 font-medium">#</th>
                      <th className="px-4 py-2 font-medium">Card</th>
                      <th className="px-4 py-2 font-medium hidden md:table-cell">Set</th>
                      <th className="px-4 py-2 font-medium text-right">AUD</th>
                      <th className="px-4 py-2 font-medium text-right hidden sm:table-cell">USD</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((item) => (
                      <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2.5 text-slate-400 font-mono text-xs w-8">{item.rank}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="h-9 w-6 rounded object-contain shrink-0" loading="lazy" />
                            ) : (
                              <div className="flex h-9 w-6 items-center justify-center rounded bg-slate-100 text-sm shrink-0">🃏</div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-ink truncate">{item.name}</div>
                              <div className="text-xs text-slate-400">{item.cardNumber}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs hidden md:table-cell max-w-[160px] truncate">{item.setName}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-ink whitespace-nowrap">
                          {item.priceAud ? formatAud(Number(item.priceAud)) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-400 text-xs hidden sm:table-cell whitespace-nowrap">
                          {item.priceUsd ? `$${Number(item.priceUsd).toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {item.tcgplayerUrl ? (
                            <a href={item.tcgplayerUrl} target="_blank" rel="noopener noreferrer"
                              className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-200 transition whitespace-nowrap">
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
          );
        })}
      </div>
    </AppShell>
  );
}
