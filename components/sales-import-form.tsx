"use client";

import { useState } from "react";

export function SalesImportForm() {
  const [targetType, setTargetType] = useState<"product" | "card">("card");
  const [slug, setSlug] = useState("umbreon-ex-161-131");
  const [providerSlug, setProviderSlug] = useState("ebay");
  const [raw, setRaw] = useState("Umbreon ex sold comp,224,2026-04-14,https://example.com/sale-1,Near Mint,0");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    setError(null);
    setResult(null);
    const response = await fetch("/api/sales/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        providerSlug,
        targetType,
        slug,
        raw,
        format: "auto"
      })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Import failed");
      return;
    }
    setResult(`Imported ${data.imported} sold comps for ${data.target}${data.skipped ? `, skipped ${data.skipped} duplicates` : ""}.`);
  }

  return (
    <div className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold">Sold comps import</h3>
      <p className="mt-2 text-sm text-slate-600">
        Paste recent sold comps as CSV or JSON. CSV format: `title,price,soldAt,url,condition,shippingAud`
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <select className="rounded-2xl border border-slate-200 px-4 py-3" onChange={(e) => setTargetType(e.target.value as "product" | "card")} value={targetType}>
          <option value="card">Card</option>
          <option value="product">Product</option>
        </select>
        <input className="rounded-2xl border border-slate-200 px-4 py-3" onChange={(e) => setSlug(e.target.value)} value={slug} />
      </div>
      <input
        className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3"
        onChange={(e) => setProviderSlug(e.target.value)}
        placeholder="Provider slug"
        value={providerSlug}
      />
      <textarea className="mt-4 min-h-[160px] w-full rounded-3xl border border-slate-200 px-4 py-3" onChange={(e) => setRaw(e.target.value)} value={raw} />
      <div className="mt-4 flex items-center gap-3">
        <button className="rounded-2xl bg-ink px-4 py-3 text-white" onClick={handleImport} type="button">
          Import sales
        </button>
        {result ? <div className="text-sm text-pine">{result}</div> : null}
        {error ? <div className="text-sm text-rose-700">{error}</div> : null}
      </div>
    </div>
  );
}
