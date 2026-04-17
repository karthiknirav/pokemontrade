import { InventoryStatus, Prisma, ProviderType } from "@prisma/client";
import { slugify } from "@/lib/utils";

import { prisma } from "@/lib/db";

type PokewalletPrice = {
  sub_type_name?: string;
  low_price?: number | null;
  mid_price?: number | null;
  high_price?: number | null;
  market_price?: number | null;
  direct_low_price?: number | null;
  updated_at?: string | null;
};

type CardmarketPrice = {
  variant_type?: string;
  avg?: number | null;
  low?: number | null;
  trend?: number | null;
  avg1?: number | null;
  avg7?: number | null;
  avg30?: number | null;
  updated_at?: string | null;
};

type PokewalletSearchResult = {
  id: string;
  card_info?: {
    name?: string;
    clean_name?: string;
    set_name?: string;
    set_code?: string;
    set_id?: string;
    card_number?: string;
    rarity?: string;
  };
  tcgplayer?: {
    url?: string;
    prices?: PokewalletPrice[];
  } | null;
  cardmarket?: {
    product_name?: string;
    product_url?: string;
    prices?: CardmarketPrice[];
  } | null;
};

type PokewalletSearchResponse = {
  results?: PokewalletSearchResult[];
  pagination?: {
    page?: number;
    total_pages?: number;
  };
};

type SyncInput = {
  limit?: number;
  offset?: number;
  rolling?: {
    enabled?: boolean;
    batchSize?: number;
    intervalMinutes?: number;
    now?: Date;
  };
};

function getPokewalletApiKey() {
  return process.env.POKEWALLET_API_KEY?.trim() || null;
}

function getPokewalletBaseUrl() {
  return process.env.POKEWALLET_BASE_URL?.trim() || "https://api.pokewallet.io";
}

function getUsdToAudRate() {
  const parsed = Number(process.env.POKEWALLET_USD_TO_AUD || "1.53");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1.53;
}

function getEurToAudRate() {
  const parsed = Number(process.env.POKEWALLET_EUR_TO_AUD || "1.66");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1.66;
}

function getRollingBatchSize() {
  const parsed = Number(process.env.POKEWALLET_BATCH_SIZE || "60");
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(500, parsed) : 60;
}

function getRollingIntervalMinutes() {
  const parsed = Number(process.env.POKEWALLET_BATCH_INTERVAL_MINUTES || "20");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function chooseBestSearchMatch(targetName: string, targetNumber: string, rows: PokewalletSearchResult[]) {
  const wantedName = normalize(targetName);
  const wantedNumber = normalize(targetNumber);

  const scored = rows
    .map((row) => {
      const rowName = normalize(row.card_info?.name ?? row.card_info?.clean_name ?? "");
      const rowNumber = normalize(row.card_info?.card_number ?? "");
      let score = 0;
      if (rowNumber === wantedNumber) score += 6;
      if (rowNumber.includes(wantedNumber) || wantedNumber.includes(rowNumber)) score += 3;
      if (rowName === wantedName) score += 4;
      if (rowName.includes(wantedName) || wantedName.includes(rowName)) score += 2;
      if (row.tcgplayer?.prices?.length || row.cardmarket?.prices?.length) score += 1;
      return { row, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.score ? scored[0].row : null;
}

function chooseUsdPrice(tcg?: { prices?: PokewalletPrice[] } | null) {
  const prices = tcg?.prices ?? [];
  for (const price of prices) {
    const candidate = price.market_price ?? price.mid_price ?? price.low_price ?? price.direct_low_price;
    // Ignore junk prices under $1 USD — likely a bad match
    if (typeof candidate === "number" && candidate >= 1) {
      return candidate;
    }
  }
  return null;
}

function chooseEurPrice(cardmarket?: { prices?: CardmarketPrice[] } | null) {
  const prices = cardmarket?.prices ?? [];
  for (const price of prices) {
    const candidate = price.avg7 ?? price.avg30 ?? price.avg ?? price.trend ?? price.low;
    if (typeof candidate === "number" && candidate > 0) {
      return candidate;
    }
  }
  return null;
}

async function pokewalletFetch(path: string, searchParams?: Record<string, string | number | undefined>) {
  const apiKey = getPokewalletApiKey();
  if (!apiKey) {
    throw new Error("POKEWALLET_API_KEY is not configured.");
  }

  const url = new URL(path, getPokewalletBaseUrl());
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      "X-API-Key": apiKey,
      "user-agent": "pokemon-profit-intelligence-au/1.0"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Pokewallet request failed (${response.status}): ${body.slice(0, 200)}`);
  }

  return response.json();
}

async function searchPokewalletCards(query: string, limit = 6) {
  const payload = (await pokewalletFetch("/search", {
    q: query,
    limit
  })) as PokewalletSearchResponse;
  return payload.results ?? [];
}

async function getOrCreatePokewalletProvider() {
  const existing = await prisma.sourceProvider.findUnique({
    where: { slug: "pokewallet" }
  });
  if (existing) return existing;

  return prisma.sourceProvider.create({
    data: {
      slug: "pokewallet",
      name: "Pokewallet",
      providerType: ProviderType.API,
      websiteUrl: "https://www.pokewallet.io",
      logoLabel: "PW",
      trustScore: 74,
      refreshMinutes: 180
    }
  });
}

function toAudPrices(row: PokewalletSearchResult) {
  const usd = chooseUsdPrice(row.tcgplayer);
  const eur = chooseEurPrice(row.cardmarket);
  const usdAud = usd ? Number((usd * getUsdToAudRate()).toFixed(2)) : null;
  const eurAud = eur ? Number((eur * getEurToAudRate()).toFixed(2)) : null;
  const aud = [usdAud, eurAud].filter((value): value is number => typeof value === "number").sort((a, b) => a - b)[0] ?? null;

  return { aud, usd, eur };
}

function getRollingWindow(input: {
  totalCards: number;
  batchSize: number;
  intervalMinutes: number;
  now?: Date;
}) {
  if (input.totalCards <= 0) {
    return {
      totalWindows: 0,
      windowIndex: 0,
      offset: 0,
      limit: 0
    };
  }

  const batchSize = Math.max(1, Math.min(input.batchSize, input.totalCards));
  const totalWindows = Math.max(1, Math.ceil(input.totalCards / batchSize));
  const now = input.now ?? new Date();
  const minutes = Math.floor(now.getTime() / (1000 * 60));
  const slot = Math.floor(minutes / Math.max(1, input.intervalMinutes));
  const windowIndex = slot % totalWindows;
  const offset = windowIndex * batchSize;
  const limit = Math.min(batchSize, input.totalCards - offset);

  return {
    totalWindows,
    windowIndex,
    offset,
    limit
  };
}

export type LiveCardPrice = {
  found: boolean;
  name: string;
  setName: string;
  cardNumber: string;
  priceAud: number | null;
  tcgplayerUrl: string | null;
  fromCache: boolean;
  cachedAt: Date | null;
};

function normalizeQuery(query: string) {
  return slugify(query.trim().toLowerCase());
}

export async function cachedCardLookup(query: string): Promise<LiveCardPrice | null> {
  const key = normalizeQuery(query);
  const cached = await prisma.showModeCache.findUnique({ where: { query: key } });
  if (!cached) return null;
  return {
    found: true,
    name: cached.name,
    setName: cached.setName,
    cardNumber: cached.cardNumber,
    priceAud: Number(cached.priceAud),
    tcgplayerUrl: cached.tcgplayerUrl ?? null,
    fromCache: true,
    cachedAt: cached.cachedAt
  };
}

async function saveToCacheIfFound(query: string, result: Omit<LiveCardPrice, "fromCache" | "cachedAt">) {
  if (!result.found || !result.priceAud) return;
  const key = normalizeQuery(query);
  await prisma.showModeCache.upsert({
    where: { query: key },
    create: {
      query: key,
      name: result.name,
      setName: result.setName,
      cardNumber: result.cardNumber,
      priceAud: result.priceAud,
      tcgplayerUrl: result.tcgplayerUrl,
      cachedAt: new Date()
    },
    update: {
      name: result.name,
      setName: result.setName,
      cardNumber: result.cardNumber,
      priceAud: result.priceAud,
      tcgplayerUrl: result.tcgplayerUrl,
      cachedAt: new Date()
    }
  });
}

export type CardVariant = {
  id: string;
  name: string;
  setName: string;
  cardNumber: string;
  rarity: string;
  priceAud: number | null;
  tcgplayerUrl: string | null;
  imageUrl: string | null;
  setCode: string;
};

// Module-level cache: PokeWallet set_code (PTCGO code) → Pokemon TCG API set.id
const setIdCache = new Map<string, string>();

async function resolvePokemonTcgSetId(ptcgoCode: string): Promise<string | null> {
  if (setIdCache.has(ptcgoCode)) return setIdCache.get(ptcgoCode)!;
  try {
    const res = await fetch(`https://api.pokemontcg.io/v2/sets?q=ptcgoCode:${ptcgoCode}&select=id,ptcgoCode`, {
      headers: { "user-agent": "pokemon-profit-intelligence-au/1.0" },
      next: { revalidate: 86400 }
    });
    const data = await res.json();
    const id: string | null = data.data?.[0]?.id ?? null;
    if (id) setIdCache.set(ptcgoCode, id);
    return id;
  } catch {
    return null;
  }
}

function buildImageUrl(setId: string | null, cardNumber: string): string | null {
  if (!setId || !cardNumber) return null;
  const num = cardNumber.split("/")[0];
  if (!num) return null;
  return `https://images.pokemontcg.io/${setId}/${num}.png`;
}

function setIdSortKey(setId: string): number {
  // Scarlet & Violet: sv1, sv2 … sv8, sv8pt5 → sort descending (higher = newer)
  const m = setId.match(/^([a-z]+)(\d+)(pt(\d+))?/i);
  if (!m) return 0;
  const major = parseInt(m[2], 10) || 0;
  const minor = m[4] ? parseInt(m[4], 10) : 0;
  // Newer series prefix gets a generation bonus
  const series = m[1].toLowerCase();
  const seriesBonus = series === "sv" ? 10000 : series === "swsh" ? 5000 : series === "sm" ? 2000 : 0;
  return seriesBonus + major * 100 + minor;
}

export async function searchCardVariants(query: string): Promise<CardVariant[]> {
  const hasCardNumber = /\d+\/\d+/.test(query);
  const limit = hasCardNumber ? 12 : 30;
  const results = await searchPokewalletCards(query, limit);

  return results
    .map((r) => {
      const pricing = toAudPrices(r);
      const setId = r.card_info?.set_id ?? null;
      const cardNumber = r.card_info?.card_number ?? "";
      return {
        id: r.id,
        name: r.card_info?.clean_name ?? r.card_info?.name ?? query,
        setName: r.card_info?.set_name ?? "",
        cardNumber,
        rarity: r.card_info?.rarity ?? "",
        priceAud: pricing.aud,
        tcgplayerUrl: r.tcgplayer?.url ?? null,
        // Build image URL directly from set_id — no extra API call needed
        imageUrl: buildImageUrl(setId, cardNumber),
        setCode: r.card_info?.set_code ?? "",
        _setId: setId ?? ""
      };
    })
    .filter((v) => v.priceAud !== null && v.priceAud >= 1)
    .sort((a, b) => setIdSortKey(b._setId) - setIdSortKey(a._setId))
    .slice(0, 20)
    .map(({ _setId: _dropped, ...v }) => v);
}

export async function liveCardLookup(query: string): Promise<LiveCardPrice> {
  try {
    const results = await searchPokewalletCards(query, 12);
    const namePart = query.replace(/\s+\d+\/\d+\s*$/, "").trim();
    const numberPart = query.match(/(\d+\/\d+)/)?.[1] ?? "";
    const best = chooseBestSearchMatch(namePart, numberPart, results);
    if (!best) return { found: false, name: query, setName: "", cardNumber: "", priceAud: null, tcgplayerUrl: null, fromCache: false, cachedAt: null };

    const pricing = toAudPrices(best);
    const result: LiveCardPrice = {
      found: true,
      name: best.card_info?.clean_name ?? best.card_info?.name ?? query,
      setName: best.card_info?.set_name ?? "",
      cardNumber: best.card_info?.card_number ?? "",
      priceAud: pricing.aud,
      tcgplayerUrl: best.tcgplayer?.url ?? null,
      fromCache: false,
      cachedAt: null
    };
    // Fire-and-forget cache write
    saveToCacheIfFound(query, result).catch(() => null);
    return result;
  } catch {
    return { found: false, name: query, setName: "", cardNumber: "", priceAud: null, tcgplayerUrl: null, fromCache: false, cachedAt: null };
  }
}

export async function syncPokewalletCardSnapshots(input?: SyncInput) {
  const apiKey = getPokewalletApiKey();
  if (!apiKey) {
    return {
      skipped: true,
      reason: "POKEWALLET_API_KEY is missing",
      checked: 0,
      updated: 0,
      errors: [] as string[]
    };
  }

  const provider = await getOrCreatePokewalletProvider();
  const totalCards = await prisma.card.count();
  const rollingEnabled = input?.rolling?.enabled ?? false;
  const rollingBatchSize = Math.max(1, Math.min(500, input?.rolling?.batchSize ?? getRollingBatchSize()));
  const rollingIntervalMinutes = Math.max(1, input?.rolling?.intervalMinutes ?? getRollingIntervalMinutes());
  const rollingWindow = rollingEnabled
    ? getRollingWindow({
        totalCards,
        batchSize: rollingBatchSize,
        intervalMinutes: rollingIntervalMinutes,
        now: input?.rolling?.now
      })
    : null;
  const computedOffset = rollingWindow ? rollingWindow.offset : Math.max(0, input?.offset ?? 0);
  const computedLimit = rollingWindow ? rollingWindow.limit : Math.min(500, Math.max(1, input?.limit ?? 150));
  const cards = await prisma.card.findMany({
    orderBy: { name: "asc" },
    skip: computedOffset,
    take: computedLimit
  });

  const ingestRun = await prisma.ingestRun.create({
    data: {
      providerId: provider.id,
      status: "RUNNING"
    }
  });

  const errors: string[] = [];
  let updated = 0;
  let checked = 0;
  let matched = 0;

  for (const card of cards) {
    checked += 1;

    try {
      const query = `${card.name} ${card.number}`.trim();
      const matches = await searchPokewalletCards(query, 6);
      const best = chooseBestSearchMatch(card.name, card.number, matches);
      if (!best) continue;

      matched += 1;
      const pricing = toAudPrices(best);
      if (!pricing.aud) continue;

      const sourceUrl = `https://api.pokewallet.io/cards/${best.id}`;
      const sourceLink =
        (await prisma.sourceLink.findFirst({
          where: {
            providerId: provider.id,
            cardId: card.id
          }
        })) ??
        (await prisma.sourceLink.create({
          data: {
            providerId: provider.id,
            cardId: card.id,
            label: best.card_info?.name ?? card.name,
            sourceUrl,
            providerItemId: best.id
          }
        }));

      await prisma.rawSourceRecord.create({
        data: {
          providerId: provider.id,
          ingestRunId: ingestRun.id,
          sourceLinkId: sourceLink.id,
          sourceUrl,
          sourceTitle: best.card_info?.name ?? card.name,
          priceText: pricing.aud.toString(),
          stockText: "In stock",
          payload: best as Prisma.InputJsonValue,
          matchedCardId: card.id
        }
      });

      await prisma.listingSnapshot.upsert({
        where: { sourceLinkId: sourceLink.id },
        create: {
          providerId: provider.id,
          sourceLinkId: sourceLink.id,
          cardId: card.id,
          sourceUrl,
          sourceTitle: best.card_info?.name ?? card.name,
          providerItemId: best.id,
          normalizedPriceAud: pricing.aud,
          currency: "AUD",
          stockStatus: InventoryStatus.IN_STOCK,
          isPreorder: false,
          isPlaceholder: false,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          fetchedAt: new Date(),
          sourceConfidence: 72
        },
        update: {
          sourceUrl,
          sourceTitle: best.card_info?.name ?? card.name,
          providerItemId: best.id,
          normalizedPriceAud: pricing.aud,
          stockStatus: InventoryStatus.IN_STOCK,
          lastSeenAt: new Date(),
          fetchedAt: new Date(),
          sourceConfidence: 72
        }
      });

      await prisma.card.update({
        where: { id: card.id },
        data: {
          currentMarketPrice: pricing.aud
        }
      });

      await prisma.priceHistory.create({
        data: {
          cardId: card.id,
          price: pricing.aud,
          source: "Pokewallet"
        }
      });

      updated += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Pokewallet sync error";
      errors.push(`${card.slug}: ${message}`);
    }
  }

  await prisma.ingestRun.update({
    where: { id: ingestRun.id },
    data: {
      status: errors.length === 0 ? "SUCCESS" : updated > 0 ? "PARTIAL" : "FAILED",
      completedAt: new Date(),
      fetchedCount: checked,
      matchedCount: matched,
      createdCount: 0,
      updatedCount: updated,
      errorSummary: errors.join(" | ").slice(0, 1000) || null
    }
  });

  return {
    skipped: false,
    rolling: rollingWindow
      ? {
          enabled: true,
          batchSize: rollingBatchSize,
          intervalMinutes: rollingIntervalMinutes,
          totalCards,
          totalWindows: rollingWindow.totalWindows,
          windowIndex: rollingWindow.windowIndex,
          offset: computedOffset,
          limit: computedLimit
        }
      : {
          enabled: false,
          offset: computedOffset,
          limit: computedLimit
        },
    checked,
    matched,
    updated,
    errors
  };
}
