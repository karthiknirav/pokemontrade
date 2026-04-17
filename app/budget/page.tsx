import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/guard";
import { getBudgetRecommendation } from "@/lib/services/budget";
import { formatAud } from "@/lib/utils";

type SearchParams = Promise<{
  budget?: string;
  strategy?: string;
}>;

export default async function BudgetPage({ searchParams }: { searchParams: SearchParams }) {
  await requireSession();
  const params = await searchParams;
  const budgetAud = Number(params.budget ?? 300);
  const strategy = params.strategy ?? "AUTO";
  const recommendation = await getBudgetRecommendation({ budgetAud, strategy });

  return (
    <AppShell
      title="Budget Planner"
      subtitle="Ask the app for one premium anchor, a balanced basket, or a spread of bargains instead of always defaulting to the most expensive card."
    >
      <section className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
        <form className="grid gap-4 md:grid-cols-[0.7fr_0.6fr_auto] md:items-end">
          <label className="block text-sm">
            <span className="mb-2 block text-slate-500">Budget in AUD</span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-0 transition focus:border-pine"
              defaultValue={budgetAud}
              min={20}
              name="budget"
              type="number"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-slate-500">How do you want to buy?</span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-pine"
              defaultValue={strategy}
              name="strategy"
            >
              <option value="AUTO">Auto choose the best plan</option>
              <option value="SINGLE">One premium card</option>
              <option value="BALANCED">2-4 balanced cards</option>
              <option value="BARGAINS">As many bargains as fit</option>
              <option value="MOMENTUM">Top 20 by price momentum</option>
            </select>
          </label>
          <button className="rounded-2xl bg-pine px-5 py-3 font-medium text-white transition hover:bg-pine/90" type="submit">
            Rebuild plan
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-3xl border border-mist bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm text-slate-500">Recommended plan</div>
            <h3 className="mt-1 text-2xl font-semibold text-ink">{recommendation.title}</h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{recommendation.rationale}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:min-w-[280px]">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-slate-500">Total spend</div>
              <div className="mt-1 font-semibold">{formatAud(recommendation.totalSpend)}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-slate-500">Leftover</div>
              <div className="mt-1 font-semibold">{formatAud(recommendation.leftover)}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {recommendation.picks.map((pick) => (
            <div key={pick.slug} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <a className="font-medium text-ink hover:text-pine" href={`/cards/${pick.slug}`}>
                    {pick.name}
                  </a>
                  <div className="mt-1 text-sm text-slate-500">{pick.setName}</div>
                  <div className="mt-2 text-sm text-slate-600">{pick.reason}</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-semibold">{formatAud(pick.price)}</span>
                    {pick.changePct != null ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${pick.changePct >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                      >
                        {pick.changePct >= 0 ? "+" : ""}
                        {pick.changePct}%
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm text-slate-500">
                    {pick.verdict} - {pick.confidence} confidence
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-slate-500">Bargain</div>
                  <div className="mt-1 font-medium">{formatAud(pick.bargainBuyPrice)}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-slate-500">Fair low</div>
                  <div className="mt-1 font-medium">{formatAud(pick.fairValueLow)}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-slate-500">Fair high</div>
                  <div className="mt-1 font-medium">{formatAud(pick.fairValueHigh)}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-slate-500">Live ask</div>
                  <div className="mt-1 font-medium">{formatAud(pick.price)}</div>
                </div>
              </div>
            </div>
          ))}
          {recommendation.picks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No singles fit this budget yet. Increase the budget or switch to a different strategy.
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
