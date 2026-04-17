"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const payload =
      mode === "signup"
        ? {
            name: String(formData.get("name") || ""),
            email: String(formData.get("email") || ""),
            password: String(formData.get("password") || "")
          }
        : {
            email: String(formData.get("email") || ""),
            password: String(formData.get("password") || "")
          };

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {mode === "signup" ? (
        <input
          name="name"
          placeholder="Collector name"
          className="w-full rounded-2xl border border-mist px-4 py-3 outline-none ring-0"
        />
      ) : null}
      <input
        name="email"
        type="email"
        placeholder="Email"
        className="w-full rounded-2xl border border-mist px-4 py-3 outline-none ring-0"
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        className="w-full rounded-2xl border border-mist px-4 py-3 outline-none ring-0"
      />
      {error ? <div className="text-sm text-clay">{error}</div> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine disabled:opacity-60"
      >
        {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
      </button>
    </form>
  );
}
