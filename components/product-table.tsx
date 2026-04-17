import Link from "next/link";

import { formatAud } from "@/lib/utils";
import { RecommendationPill } from "@/components/recommendation-pill";

type Row = {
  name: string;
  slug: string;
  setName: string;
  marketPrice: number;
  buyUnder: number;
  marketGuardrail?: {
    label: string;
    tone: "safe" | "warning" | "danger";
    note: string;
  };
  recommendation: {
    action: "BUY" | "MAYBE" | "PASS" | "RIP" | "HOLD_SEALED" | "BUY_SINGLES_INSTEAD";
    summary: string;
  };
  hrefBase: "/products" | "/cards";
};

export function ProductTable({ rows }: { rows: Row[] }) {
  const toneClasses = {
    safe: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-amber-800",
    danger: "bg-rose-50 text-rose-800"
  } as const;

  return (
    <div className="overflow-hidden rounded-3xl border border-mist bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">Item</th>
              <th className="px-4 py-3 text-left">Set</th>
              <th className="px-4 py-3 text-left">Market</th>
              <th className="px-4 py-3 text-left">Buy Under</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.slug}>
                <td className="px-4 py-3">
                  <Link className="font-medium text-ink hover:text-pine" href={`${row.hrefBase}/${row.slug}`}>
                    {row.name}
                  </Link>
                  <div className="mt-1 text-xs text-slate-500">{row.recommendation.summary}</div>
                  {row.marketGuardrail ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${toneClasses[row.marketGuardrail.tone]}`}>
                        {row.marketGuardrail.label}
                      </span>
                      <span className="text-[11px] text-slate-500">{row.marketGuardrail.note}</span>
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-600">{row.setName}</td>
                <td className="px-4 py-3 font-medium">{formatAud(row.marketPrice)}</td>
                <td className="px-4 py-3">{formatAud(row.buyUnder)}</td>
                <td className="px-4 py-3">
                  <RecommendationPill action={row.recommendation.action} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
