"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Wifi, Database, Search, ChevronRight, X } from "lucide-react";

type CardVariant = {
  id: string;
  name: string;
  setName: string;
  cardNumber: string;
  rarity: string;
  priceAud: number | null;
  tcgplayerUrl: string | null;
  imageUrl: string | null;
};

type LockedCard = {
  label: string;
  askingPriceAud: number | null;
  variant: CardVariant;
};

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

type Result = {
  rows: Array<{ input: string; matchType: "unmatched"; reason?: string } | MatchedRow>;
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

function timeAgo(date: string | null): string {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ── Single card search + variant picker ──────────────────────────────────────
function CardSearch({ onAdd }: { onAdd: (card: LockedCard) => void }) {
  const [query, setQuery] = useState("");
  const [price, setPrice] = useState("");
  const [variants, setVariants] = useState<CardVariant[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setVariants([]);
    try {
      const res = await fetch(`/api/show-mode/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setVariants(data.data ?? []);
      if ((data.data ?? []).length === 0) setError("No results — try adding card number e.g. 003/132");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function pick(variant: CardVariant) {
    onAdd({ label: query, askingPriceAud: price ? Number(price) : null, variant });
    setQuery("");
    setPrice("");
    setVariants([]);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div className="rounded-3xl border border-mist bg-white p-4">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-pine"
          placeholder="Card name e.g. Charizard ex 199/165"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <input
          className="w-20 shrink-0 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-pine"
          placeholder="A$ ask"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button
          type="button"
          onClick={search}
          disabled={searching}
          className="shrink-0 rounded-2xl bg-ink px-3 py-2.5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-60"
        >
          {searching ? "…" : <Search className="h-4 w-4" />}
        </button>
      </div>

      {/* Variant picker */}
      {variants.length > 0 ? (
        <div className="mt-3 space-y-2">
          <div className="text-xs text-slate-500">Pick the exact card:</div>
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => pick(v)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-left text-sm transition hover:border-pine hover:bg-pine/5 active:scale-95"
            >
              {/* Card thumbnail */}
              <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                {v.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.imageUrl}
                    alt={v.name}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-ink">{v.name}</div>
                <div className="truncate text-xs text-slate-500">{v.setName}{v.cardNumber ? ` · ${v.cardNumber}` : ""}{v.rarity ? ` · ${v.rarity}` : ""}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {v.priceAud ? <span className="font-semibold text-pine">A${v.priceAud.toFixed(0)}</span> : null}
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {error ? <div className="mt-2 text-xs text-rose-600">{error}</div> : null}
    </div>
  );
}

// ── Main form ────────────────────────────────────────────────────────────────
export function ShowModeForm() {
  const [lockedCards, setLockedCards] = useState<LockedCard[]>([]);
  const [lotTotal, setLotTotal] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [useCached, setUseCached] = useState(false);

  useEffect(() => {
    const applyDraft = () => {
      const draft = localStorage.getItem("showModeDraftEntries");
      if (!draft?.trim()) return;
      // Draft format: "name,price" lines — add as unlocked entries
      const lines = draft.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      // Can't auto-lock without variant selection, just pre-fill query isn't possible here
      // Clear draft
      localStorage.removeItem("showModeDraftEntries");
    };
    applyDraft();
    window.addEventListener("showModeDraftUpdated", applyDraft);
    return () => window.removeEventListener("showModeDraftUpdated", applyDraft);
  }, []);

  function removeCard(index: number) {
    setLockedCards((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  }

  async function handleAnalyze() {
    if (lockedCards.length === 0) return;
    setIsPending(true);
    setError(null);
    try {
      const entries = lockedCards.map((c) => ({
        label: `${c.variant.name} ${c.variant.cardNumber}`.trim(),
        askingPriceAud: c.askingPriceAud
      }));
      const response = await fetch("/api/show-mode/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries, totalAskingPriceAud: lotTotal ? Number(lotTotal) : null, useCached })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to analyze lot");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Card search */}
      <CardSearch onAdd={(card) => { setLockedCards((prev) => [...prev, card]); setResult(null); }} />

      {/* Locked cards */}
      {lockedCards.length > 0 ? (
        <div className="rounded-3xl border border-mist bg-white p-4">
          <div className="text-sm font-medium text-ink mb-2">Cards to analyze ({lockedCards.length})</div>
          <div className="space-y-2">
            {lockedCards.map((c, i) => (
              <div key={i} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                {c.variant.imageUrl ? (
                  <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded bg-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.variant.imageUrl} alt={c.variant.name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink">{c.variant.name}</div>
                  <div className="truncate text-xs text-slate-500">{c.variant.setName} · {c.variant.cardNumber}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {c.askingPriceAud ? <span className="text-slate-600">A${c.askingPriceAud}</span> : null}
                  <button type="button" onClick={() => removeCard(i)} className="text-slate-400 hover:text-rose-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <input
                className="w-28 shrink-0 rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pine"
                placeholder="Lot total A$"
                value={lotTotal}
                onChange={(e) => setLotTotal(e.target.value)}
              />
              <div className="flex overflow-hidden rounded-2xl border border-slate-200 text-xs font-medium">
                <button type="button" onClick={() => setUseCached(false)} className={`flex items-center gap-1 px-3 py-2 transition ${!useCached ? "bg-ink text-white" : "text-slate-500"}`}>
                  <Wifi className="h-3 w-3" /> Live
                </button>
                <button type="button" onClick={() => setUseCached(true)} className={`flex items-center gap-1 px-3 py-2 transition ${useCached ? "bg-ink text-white" : "text-slate-500"}`}>
                  <Database className="h-3 w-3" /> Cached
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isPending}
              className="w-full rounded-2xl bg-ember py-3 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-60"
            >
              {isPending ? "Getting prices…" : "Get prices"}
            </button>
          </div>
          {error ? <div className="mt-2 text-xs text-rose-600">{error}</div> : null}
        </div>
      ) : null}

      {/* Results */}
      {result ? (
        <div className="space-y-3">
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

          {result.rows.map((row, i) =>
            row.matchType === "unmatched" ? (
              <div key={i} className="rounded-2xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                Not found: <span className="font-medium text-ink">{row.input}</span>
              </div>
            ) : (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-ink">{row.name}</div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span className="truncate">{row.setName}{row.cardNumber ? ` · ${row.cardNumber}` : ""}</span>
                      {row.fromCache ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                          <Database className="h-3 w-3" /> {timeAgo(row.cachedAt)}
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
                  <div className="mt-2 text-center text-sm text-slate-600">
                    Seller: <span className="font-semibold">A${row.askingPriceAud.toFixed(0)}</span>
                  </div>
                ) : null}
                {row.tcgplayerUrl ? (
                  <a href={row.tcgplayerUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-pine">
                    <ExternalLink className="h-3 w-3" /> TCGPlayer
                  </a>
                ) : null}
              </div>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
