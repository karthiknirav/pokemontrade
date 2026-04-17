import { cn } from "@/lib/utils";

export function ScoreBadge({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-2xl border border-mist bg-slate-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div
        className={cn(
          "mt-1 text-lg font-semibold",
          score >= 75 ? "text-pine" : score <= 45 ? "text-clay" : "text-amber-600"
        )}
      >
        {score}
      </div>
    </div>
  );
}
