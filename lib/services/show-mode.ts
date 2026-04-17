import { liveCardLookup, cachedCardLookup } from "@/lib/services/pokewallet";

type AnalyzeInput = {
  entries: Array<{ label: string; askingPriceAud?: number | null }>;
  totalAskingPriceAud?: number | null;
  useCached?: boolean;
};

type MatchedRow = {
  input: string;
  matchType: "matched";
  name: string;
  setName: string;
  cardNumber: string;
  askingPriceAud: number | null;
  marketPriceAud: number;
  bargainBuyPrice: number;
  negotiationTarget: number;
  askingDeltaPct: number | null;
  action: string;
  tcgplayerUrl: string | null;
  fromCache: boolean;
  cachedAt: Date | null;
};

type UnmatchedRow = {
  input: string;
  matchType: "unmatched";
  reason?: string;
};

type Row = MatchedRow | UnmatchedRow;

function deriveAction(askingPrice: number | null, marketPrice: number): string {
  if (!askingPrice) return "Check price";
  const ratio = askingPrice / marketPrice;
  if (ratio <= 0.85) return "BUY";
  if (ratio <= 0.95) return "Negotiate";
  if (ratio <= 1.05) return "Fair — your call";
  return "Pass";
}

export async function analyzeShowLot(input: AnalyzeInput) {
  const rows: Row[] = await Promise.all(
    input.entries.map(async (entry): Promise<Row> => {
      const live = input.useCached
        ? (await cachedCardLookup(entry.label)) ?? await liveCardLookup(entry.label)
        : await liveCardLookup(entry.label);

      if (!live.found || !live.priceAud) {
        return { input: entry.label, matchType: "unmatched", reason: "not-found" };
      }

      const marketPrice = live.priceAud;
      const bargainBuyPrice = Number((marketPrice * 0.88).toFixed(2));
      const negotiationTarget = Number((marketPrice * 0.92).toFixed(2));
      const askingPrice = entry.askingPriceAud ?? null;
      const askingDeltaPct = askingPrice
        ? Number((((askingPrice - marketPrice) / marketPrice) * 100).toFixed(1))
        : null;

      return {
        input: entry.label,
        matchType: "matched",
        name: live.name,
        setName: live.setName,
        cardNumber: live.cardNumber,
        askingPriceAud: askingPrice,
        marketPriceAud: marketPrice,
        bargainBuyPrice,
        negotiationTarget,
        askingDeltaPct,
        action: deriveAction(askingPrice, marketPrice),
        tcgplayerUrl: live.tcgplayerUrl,
        fromCache: live.fromCache,
        cachedAt: live.cachedAt
      };
    })
  );

  const matchedRows = rows.filter((r): r is MatchedRow => r.matchType === "matched");
  const totalFairValue = matchedRows.reduce((sum, r) => sum + r.marketPriceAud, 0);
  const totalAsk =
    input.totalAskingPriceAud ??
    matchedRows.reduce((sum, r) => sum + (r.askingPriceAud ?? r.marketPriceAud), 0);
  const totalNegotiation = matchedRows.reduce((sum, r) => sum + r.negotiationTarget, 0);
  const underMarketCount = matchedRows.filter(
    (r) => (r.askingPriceAud ?? r.marketPriceAud) <= r.bargainBuyPrice
  ).length;

  const decision =
    matchedRows.length === 0
      ? "No matches found"
      : totalAsk <= totalNegotiation
        ? "Buy the lot"
        : totalAsk <= totalFairValue
          ? "Negotiate"
          : "Pass or cherry-pick";

  return {
    rows,
    summary: {
      matchedCount: matchedRows.length,
      unmatchedCount: rows.length - matchedRows.length,
      totalFairValue: Number(totalFairValue.toFixed(2)),
      totalAskingPriceAud: Number(totalAsk.toFixed(2)),
      totalNegotiationTarget: Number(totalNegotiation.toFixed(2)),
      underMarketCount,
      decision
    }
  };
}
