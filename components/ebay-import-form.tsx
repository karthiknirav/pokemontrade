"use client";

import { useState } from "react";

export function EbayImportForm() {
  const [targetType, setTargetType] = useState<"product" | "card">("card");
  const [slug, setSlug] = useState("umbreon-ex-161-131");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleImport() {
    setError(null);
    setResult(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/sales/ebay-import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetType,
          slug,
          query: query.trim() || undefined,
          limit: 6
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "eBay import failed");
      }
      setResult(`Fetched ${data.fetched} comps for ${data.target}; imported ${data.imported}, skipped ${data.skipped}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "eBay import failed");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold">eBay sold comps</h3>
      <p className="mt-2 text-sm text-slate-600">
        Pull recent Australian sold comps straight into the database. If you leave the query blank, the app will build one from the item name and set.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <select className="rounded-2xl border border-slate-200 px-4 py-3" onChange={(e) => setTargetType(e.target.value as "product" | "card")} value={targetType}>
          <option value="card">Card</option>
          <option value="product">Product</option>
        </select>
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3"
          onChange={(e) => setSlug(e.target.value)}
          placeholder="Item slug"
          value={slug}
        />
      </div>
      <input
        className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3"
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Optional eBay search query override"
        value={query}
      />
      <div className="mt-4 flex items-center gap-3">
        <button className="rounded-2xl bg-pine px-4 py-3 text-white disabled:opacity-60" disabled={isPending} onClick={handleImport} type="button">
          {isPending ? "Importing..." : "Import eBay sales"}
        </button>
        {result ? <div className="text-sm text-pine">{result}</div> : null}
        {error ? <div className="text-sm text-rose-700">{error}</div> : null}
      </div>
    </div>
  );
}
