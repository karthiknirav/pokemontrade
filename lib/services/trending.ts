type TopMover = {
  name: string;
  change: string;
};

type TrendingSetCardmarket = {
  price_change: string;
  avg_price_current: number;
  avg_price_previous: number;
  top_movers: TopMover[];
};

type TrendingSet = {
  set_name: string;
  set_code: string;
  card_count: number;
  cardmarket: TrendingSetCardmarket | null;
  tcgplayer: { status?: string; message?: string } | null;
};

type TrendingResponse = {
  period: string;
  trending_sets: TrendingSet[];
};

export type { TrendingSet, TopMover };

export async function getTrendingSets(period: "7d" | "30d" = "7d", limit = 10): Promise<TrendingSet[]> {
  const apiKey = process.env.POKEWALLET_API_KEY?.trim();
  if (!apiKey) return [];

  const base = process.env.POKEWALLET_BASE_URL?.trim() || "https://api.pokewallet.io";
  try {
    const res = await fetch(`${base}/sets/trending?period=${period}&limit=${limit}`, {
      headers: {
        "X-API-Key": apiKey,
        "user-agent": "pokemon-profit-intelligence-au/1.0"
      },
      next: { revalidate: 3600 }
    });
    if (!res.ok) return [];
    const data = (await res.json()) as TrendingResponse;
    return data.trending_sets ?? [];
  } catch {
    return [];
  }
}
