"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AlertForm({ products }: { products: { id: string; name: string }[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: String(formData.get("productId") || ""),
        type: String(formData.get("type") || "PRICE_DROP"),
        targetPriceAud: Number(formData.get("targetPriceAud") || 0),
        notes: String(formData.get("notes") || "")
      })
    });
    router.refresh();
    setSubmitting(false);
  }

  return (
    <form action={handleSubmit} className="grid gap-3 rounded-3xl border border-mist bg-white p-5 shadow-sm md:grid-cols-2">
      <select name="productId" className="rounded-2xl border border-mist px-4 py-3">
        <option value="">Select product</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>
      <select name="type" className="rounded-2xl border border-mist px-4 py-3">
        <option value="PRICE_DROP">Price drop</option>
        <option value="RESTOCK">Restock</option>
        <option value="VALUE_BUY">Value buy</option>
      </select>
      <input name="targetPriceAud" type="number" step="0.01" placeholder="Target price AUD" className="rounded-2xl border border-mist px-4 py-3" />
      <input name="notes" placeholder="Notes" className="rounded-2xl border border-mist px-4 py-3" />
      <button type="submit" disabled={submitting} className="rounded-2xl bg-ink px-4 py-3 font-semibold text-white">
        {submitting ? "Saving..." : "Create alert"}
      </button>
    </form>
  );
}
