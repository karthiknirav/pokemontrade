"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Wifi, Database } from "lucide-react";

type MatchedRow = {
  input: string;
  matchType: "matched";
  name: string;
  setName: string;
  cardNumber: string;
  askingPriceAud: number | null;
  marketPriceAud: number;
  bargainBuyPrice: number;
  negotiationTarget: number;
  askingDeltaPct: number | null;
  action: string;
  tcgplayerUrl: string | null;
  fromCache: boolean;
  cachedAt: string | null;
};

type UnmatchedRow = {
  input: string;
  matchType: "unmatched";
  reason?: string;
};

type Result = {
  rows: Array<UnmatchedRow | MatchedRow>;
  summary: {
    matchedCount: number;
    unmatchedCount: number;
    totalFairValue: number;
    totalAskingPriceAud: number;
    totalNegotiationTarget: number;
    underMarketCount: number;
    decision: string;
  };
} | null;

const actionColor: Record<string, string> = {
  BUY: "text-pine font-bold",
  Negotiate: "text-amber-600 font-semibold",
  "Fair — your call": "text-slate-600",
  Pass: "text-rose-600 font-semibold",
  "Check price": "text-slate-400"
};

function timeAgo(date: Date | string | null): string {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function ShowModeForm() {
  const [entries, setEntries] = useState("Mega Venusaur ex 003/132,45\nCharizard ex 199/165,180");
  const [lotTotal, setLotTotal] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [useCached, setUseCached] = useState(false);

  useEffect(() => {
    const applyDraft = () => {
      const draft = localStorage.getItem("showModeDraftEntries");
      if (draft?.trim()) setEntries(draft);
    };
    applyDraft();
    window.addEventListener("showModeDraftUpdated", applyDraft);
    return () => window.removeEventListener("showModeDraftUpdated", applyDraft);
  }, []);

  async function handleSubmit() {
    setIsPending(true);
    setError(null);
    try {
      const rows = entries
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const lastComma = line.lastIndexOf(",");
          const label = lastComma > 0 ? line.slice(0, lastComma).trim() : line.trim();
          const price = lastComma > 0 ? line.slice(lastComma + 1).trim() : "";
          return { label, askingPriceAud: price ? Number(price) : null };
        });

      const response = await fetch("/api/show-mode/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries: rows, totalAskingPriceAud: lotTotal ? Number(lotTotal) : null, useCached })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to analyze lot");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze lot");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1fr_0.4fr]">
        <label className="block">
          <span className="mb-2 block text-sm text-slate-500">One per line: <code>Card Name,asking price</code></span>
          <textarea
            className="min-h-[180px] w-full rounded-3xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none transition focus:border-pine"
            onChange={(e) => setEntries(e.target.value)}
            value={entries}
          />
        </label>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-500">Seller lot total (optional)</span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-pine"
              onChange={(e) => setLotTotal(e.target.value)}
              placeholder="e.g. 250"
              value={lotTotal}
            />
          </label>
          {/* Live / Cached toggle */}
          <div className="flex rounded-2xl border border-slate-200 overflow-hidden text-sm font-medium">
            <button
              type="button"
              onClick={() => setUseCached(false)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 transition ${!useCached ? "bg-ink text-white" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <Wifi className="h-4 w-4" /> Live
            </button>
            <button
              type="button"
              onClick={() => setUseCached(true)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 transition ${useCached ? "bg-ink text-white" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <Database className="h-4 w-4" /> Cached
            </button>
          </div>
          <button
            className="w-full rounded-2xl bg-ember px-4 py-4 text-base font-semibold text-white transition active:scale-95 hover:bg-orange-600 disabled:opacity-60"
            disabled={isPending}
            onClick={handleSubmit}
            type="button"
          >
            {isPending ? "Looking up prices…" : useCached ? "Get cached prices" : "Get live prices"}
          </button>
          {error ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        </div>
      </div>

      {result ? (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="rounded-3xl border border-mist bg-white p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-center">
              <div>
                <div className="text-xs text-slate-500">Decision</div>
                <div className="mt-1 text-lg font-bold text-ink">{result.summary.decision}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Market total</div>
                <div className="mt-1 text-lg font-semibold text-ink">A${result.summary.totalFairValue.toFixed(0)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Seller asks</div>
                <div className="mt-1 text-lg font-semibold text-ink">A${result.summary.totalAskingPriceAud.toFixed(0)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Offer target</div>
                <div className="mt-1 text-lg font-bold text-pine">A${result.summary.totalNegotiationTarget.toFixed(0)}</div>
              </div>
            </div>
          </div>

          {/* Card rows */}
          <div className="space-y-3">
            {result.rows.map((row, i) =>
              row.matchType === "unmatched" ? (
                <div key={i} className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  <span>Not found on PokeWallet: <span className="font-medium text-ink">{row.input}</span></span>
                </div>
              ) : (
                <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-ink">{row.name}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{row.setName}{row.cardNumber ? ` · ${row.cardNumber}` : ""}</span>
                        {row.fromCache ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                            <Database className="h-3 w-3" /> cached {timeAgo(row.cachedAt)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-pine/10 px-2 py-0.5 text-pine">
                            <Wifi className="h-3 w-3" /> live
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`shrink-0 text-right text-sm ${actionColor[row.action] ?? ""}`}>
                      {row.action}
                      {row.askingDeltaPct !== null ? (
                        <div className="text-xs font-normal text-slate-500">
                          {row.askingDeltaPct > 0 ? "+" : ""}{row.askingDeltaPct}% vs market
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-xl bg-slate-50 p-2">
                      <div className="text-xs text-slate-400">Market</div>
                      <div className="font-semibold text-ink">A${row.marketPriceAud.toFixed(0)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">
                      <div className="text-xs text-slate-400">Bargain</div>
                      <div className="font-semibold text-ink">A${row.bargainBuyPrice.toFixed(0)}</div>
                    </div>
                    <div className="rounded-xl bg-pine/10 p-2">
                      <div className="text-xs text-pine">Offer</div>
                      <div className="font-bold text-pine">A${row.negotiationTarget.toFixed(0)}</div>
                    </div>
                  </div>

                  {row.askingPriceAud !== null ? (
                    <div className="mt-2 text-center text-sm">
                      Seller: <span className="font-semibold">A${row.askingPriceAud.toFixed(0)}</span>
                    </div>
                  ) : null}

                  {row.tcgplayerUrl ? (
                    <a
                      href={row.tcgplayerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-pine"
                    >
                      <ExternalLink className="h-3 w-3" /> TCGPlayer
                    </a>
                  ) : null}
                </div>
              )
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
