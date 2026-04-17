import { formatAud, formatPercent } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  currency
}: {
  label: string;
  value: number;
  delta?: number;
  currency?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-ink">{currency ? formatAud(value) : value.toFixed(0)}</div>
      {delta !== undefined ? (
        <div className={`mt-2 text-sm ${delta >= 0 ? "text-pine" : "text-clay"}`}>{formatPercent(delta)}</div>
      ) : null}
    </div>
  );
}
