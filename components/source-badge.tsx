import { cn } from "@/lib/utils";

export function SourceBadge({
  name,
  logoLabel,
  tone = "default"
}: {
  name: string;
  logoLabel?: string | null;
  tone?: "default" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        tone === "default" ? "border-mist bg-slate-50 text-ink" : "border-slate-200 bg-white text-slate-600"
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-white">
        {(logoLabel ?? name).slice(0, 2).toUpperCase()}
      </span>
      <span>{name}</span>
    </span>
  );
}
