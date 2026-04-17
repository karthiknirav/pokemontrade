"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DemoLoginButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enter() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@profitintel.au", password: "password123" })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }
    router.push("/show-mode");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={enter}
        disabled={loading}
        className="w-full rounded-2xl bg-ink px-6 py-4 text-base font-semibold text-white transition hover:bg-pine active:scale-95 disabled:opacity-60"
      >
        {loading ? "Entering…" : "Enter the app →"}
      </button>
      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
    </div>
  );
}
