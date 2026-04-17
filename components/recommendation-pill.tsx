import type { RecommendationAction } from "@prisma/client";

import { cn } from "@/lib/utils";

const actionStyles: Record<RecommendationAction, string> = {
  BUY: "bg-pine text-white",
  MAYBE: "bg-amber-100 text-amber-900",
  PASS: "bg-clay text-white",
  RIP: "bg-ink text-white",
  HOLD_SEALED: "bg-gold text-ink",
  BUY_SINGLES_INSTEAD: "bg-slate-200 text-slate-900"
};

export function RecommendationPill({ action }: { action: RecommendationAction }) {
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", actionStyles[action])}>{action}</span>;
}
