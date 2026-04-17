"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminIngestButton({ providerSlug }: { providerSlug: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setIsPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: providerSlug, scope: "providers" })
      });
      const data = (await response.json()) as {
        error?: string;
        providerRuns?: Array<{ updated: number; created: number }>;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Sync failed");
      }

      const result = data.providerRuns?.[0];
      setMessage(`Synced ${result?.updated ?? 0} updated / ${result?.created ?? 0} new`);
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        className="rounded-xl bg-ink px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={handleClick}
        type="button"
      >
        {isPending ? "Syncing..." : "Sync now"}
      </button>
      {message ? <div className="text-xs text-slate-500">{message}</div> : null}
    </div>
  );
}
