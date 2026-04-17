"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PortfolioForm({ products }: { products: { id: string; name: string }[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: String(formData.get("productId") || ""),
        label: String(formData.get("label") || ""),
        buyPriceAud: Number(formData.get("buyPriceAud") || 0),
        quantity: Number(formData.get("quantity") || 1),
        store: String(formData.get("store") || ""),
        status: String(formData.get("status") || "HELD"),
        purchasedAt: String(formData.get("purchasedAt") || new Date().toISOString())
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
      <input name="label" placeholder="Label" className="rounded-2xl border border-mist px-4 py-3" />
      <input name="buyPriceAud" type="number" step="0.01" placeholder="Buy price AUD" className="rounded-2xl border border-mist px-4 py-3" />
      <input name="quantity" type="number" defaultValue="1" className="rounded-2xl border border-mist px-4 py-3" />
      <input name="store" placeholder="Store" className="rounded-2xl border border-mist px-4 py-3" />
      <select name="status" className="rounded-2xl border border-mist px-4 py-3">
        <option value="HELD">Held</option>
        <option value="SEALED">Sealed</option>
        <option value="RIPPED">Ripped</option>
        <option value="GRADED">Graded</option>
        <option value="SOLD">Sold</option>
      </select>
      <input name="purchasedAt" type="date" className="rounded-2xl border border-mist px-4 py-3" />
      <button type="submit" disabled={submitting} className="rounded-2xl bg-pine px-4 py-3 font-semibold text-white">
        {submitting ? "Saving..." : "Add to portfolio"}
      </button>
    </form>
  );
}
