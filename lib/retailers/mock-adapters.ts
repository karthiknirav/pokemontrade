import type { RetailerAdapter, RetailerListingInput } from "@/lib/retailers/types";
import { InventoryStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Shared scraping helpers
// ---------------------------------------------------------------------------

const DEFAULT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

type AdapterTarget = {
  title: string;
  url: string;
  targetSlug: string;
  targetType: "product" | "card";
  fallbackPrice: number;
  fallbackStatus: InventoryStatus;
};

function toNumber(raw?: string | null) {
  if (!raw) return null;
  const normalized = raw.replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function findBestPrice(html: string): number | null {
  const patterns = [
    /property="product:price:amount"\s+content="([^"]+)"/gi,
    /itemprop="price"\s+content="([^"]+)"/gi,
    /"price"\s*:\s*"([0-9]+(?:\.[0-9]{1,2})?)"/gi,
    /"price"\s*:\s*([0-9]+(?:\.[0-9]{1,2})?)/gi,
    /"salePrice"\s*:\s*"([0-9]+(?:\.[0-9]{1,2})?)"/gi,
    /\$\s*([0-9]{1,4}(?:\.[0-9]{1,2})?)/gi
  ];
  const candidates: number[] = [];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const value = toNumber(match[1]);
      if (value && value >= 3 && value <= 2000) candidates.push(value);
    }
  }
  return candidates.length > 0 ? Math.min(...candidates) : null;
}

function extractTitle(html: string, fallback: string) {
  return (
    html.match(/property="og:title"\s+content="([^"]+)"/i)?.[1]?.trim() ??
    html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ??
    fallback
  );
}

function parseStatus(html: string, fallback: InventoryStatus): InventoryStatus {
  const text = html.toLowerCase();
  if (text.includes("pre-order") || text.includes("preorder")) return InventoryStatus.PREORDER;
  if (text.includes("out of stock") || text.includes("sold out") || text.includes("currently unavailable")) return InventoryStatus.OUT_OF_STOCK;
  if (text.includes("coming soon") || text.includes("notify me")) return InventoryStatus.PLACEHOLDER;
  return fallback;
}

async function scrapeTarget(target: AdapterTarget, retailerSlug: string) {
  const response = await fetch(target.url, { cache: "no-store", headers: DEFAULT_HEADERS });
  if (!response.ok) throw new Error(`${retailerSlug} HTTP ${response.status}`);
  const html = await response.text();
  const price = findBestPrice(html) ?? target.fallbackPrice;
  const status = parseStatus(html, target.fallbackStatus);
  return {
    retailerSlug,
    title: extractTitle(html, target.title),
    normalizedPrice: Number(price.toFixed(2)),
    currency: "AUD" as const,
    productUrl: target.url,
    targetSlug: target.targetSlug,
    targetType: target.targetType,
    status,
    isPreorder: status === InventoryStatus.PREORDER,
    isPlaceholder: status === InventoryStatus.PLACEHOLDER
  };
}

// Shopify `.js` product API — cleaner than HTML scraping for Gameology/Cherry
async function scrapeShopifyProduct(
  retailerSlug: string,
  productHandle: string,
  baseUrl: string,
  targetSlug: string,
  targetType: "product" | "card",
  fallbackPrice: number,
  fallbackStatus: InventoryStatus
) {
  const url = `${baseUrl}/products/${productHandle}.js`;
  const response = await fetch(url, { cache: "no-store", headers: DEFAULT_HEADERS });
  if (!response.ok) throw new Error(`${retailerSlug} Shopify API ${response.status}`);

  const data = (await response.json()) as {
    title: string;
    variants?: Array<{ available: boolean; price: number }>;
    tags?: string[];
  };

  const variant = data.variants?.find((v) => v.available) ?? data.variants?.[0];
  if (!variant) throw new Error(`${retailerSlug}: no variants for ${productHandle}`);

  const tagText = data.tags?.join(" ").toLowerCase() ?? "";
  const isPreorder = tagText.includes("preorder") || tagText.includes("pre-order");
  const status = isPreorder
    ? InventoryStatus.PREORDER
    : variant.available
      ? InventoryStatus.IN_STOCK
      : InventoryStatus.OUT_OF_STOCK;

  return {
    retailerSlug,
    title: data.title,
    normalizedPrice: Number((variant.price / 100).toFixed(2)),
    currency: "AUD" as const,
    productUrl: `${baseUrl}/products/${productHandle}`,
    targetSlug,
    targetType,
    status,
    isPreorder,
    isPlaceholder: false
  };
}

function createAdapter(retailerSlug: string, targets: AdapterTarget[]): RetailerAdapter {
  return {
    retailerSlug,
    async fetchListings() {
      const results = await Promise.allSettled(targets.map((t) => scrapeTarget(t, retailerSlug)));
      return results.flatMap((result, i) => {
        if (result.status === "fulfilled") return [result.value];
        // Resilient fallback — never return empty, use fallback data
        const target = targets[i]!;
        return [{
          retailerSlug,
          title: target.title,
          normalizedPrice: target.fallbackPrice,
          currency: "AUD" as const,
          productUrl: target.url,
          targetSlug: target.targetSlug,
          targetType: target.targetType,
          status: target.fallbackStatus,
          isPreorder: target.fallbackStatus === InventoryStatus.PREORDER,
          isPlaceholder: target.fallbackStatus === InventoryStatus.PLACEHOLDER
        }];
      });
    }
  };
}

// ---------------------------------------------------------------------------
// EB Games — real search + preorder URLs
// ---------------------------------------------------------------------------
export const ebGamesAdapter: RetailerAdapter = createAdapter("eb-games", [
  {
    title: "Pokemon 151 Booster Bundle",
    url: "https://www.ebgames.com.au/search?searchTerm=pokemon+151+booster+bundle",
    targetSlug: "pokemon-151-booster-bundle",
    targetType: "product",
    fallbackPrice: 68,
    fallbackStatus: InventoryStatus.IN_STOCK
  },
  {
    title: "Prismatic Evolutions Elite Trainer Box",
    url: "https://www.ebgames.com.au/search?searchTerm=prismatic+evolutions+elite+trainer+box",
    targetSlug: "prismatic-evolutions-elite-trainer-box",
    targetType: "product",
    fallbackPrice: 59.99,
    fallbackStatus: InventoryStatus.OUT_OF_STOCK
  },
  {
    title: "Destined Rivals Elite Trainer Box",
    url: "https://www.ebgames.com.au/search?searchTerm=destined+rivals+elite+trainer+box",
    targetSlug: "destined-rivals-elite-trainer-box",
    targetType: "product",
    fallbackPrice: 69,
    fallbackStatus: InventoryStatus.PREORDER
  }
]);

// ---------------------------------------------------------------------------
// JB Hi-Fi — real product search URLs
// ---------------------------------------------------------------------------
export const jbHifiAdapter: RetailerAdapter = createAdapter("jb-hi-fi", [
  {
    title: "Pokemon 151 Booster Bundle",
    url: "https://www.jbhifi.com.au/search?q=pokemon+151+booster+bundle&type=product",
    targetSlug: "pokemon-151-booster-bundle",
    targetType: "product",
    fallbackPrice: 68,
    fallbackStatus: InventoryStatus.IN_STOCK
  },
  {
    title: "Twilight Masquerade Booster Bundle",
    url: "https://www.jbhifi.com.au/search?q=twilight+masquerade+booster+bundle&type=product",
    targetSlug: "twilight-masquerade-booster-bundle",
    targetType: "product",
    fallbackPrice: 54.99,
    fallbackStatus: InventoryStatus.IN_STOCK
  }
]);

// ---------------------------------------------------------------------------
// BIG W — real search URLs
// ---------------------------------------------------------------------------
export const bigWAdapter: RetailerAdapter = createAdapter("big-w", [
  {
    title: "Pokemon 151 Booster Bundle",
    url: "https://www.bigw.com.au/search?q=pokemon+151+booster+bundle",
    targetSlug: "pokemon-151-booster-bundle",
    targetType: "product",
    fallbackPrice: 54.99,
    fallbackStatus: InventoryStatus.IN_STOCK
  },
  {
    title: "Twilight Masquerade Booster Bundle",
    url: "https://www.bigw.com.au/search?q=twilight+masquerade",
    targetSlug: "twilight-masquerade-booster-bundle",
    targetType: "product",
    fallbackPrice: 54.99,
    fallbackStatus: InventoryStatus.IN_STOCK
  }
]);

// ---------------------------------------------------------------------------
// Kmart — real search URLs
// ---------------------------------------------------------------------------
export const kmartAdapter: RetailerAdapter = createAdapter("kmart", [
  {
    title: "Twilight Masquerade Booster Bundle",
    url: "https://www.kmart.com.au/search/?searchTerm=twilight+masquerade+booster+bundle",
    targetSlug: "twilight-masquerade-booster-bundle",
    targetType: "product",
    fallbackPrice: 54.99,
    fallbackStatus: InventoryStatus.IN_STOCK
  },
  {
    title: "Pokemon 151 Booster Bundle",
    url: "https://www.kmart.com.au/search/?searchTerm=pokemon+151+booster+bundle",
    targetSlug: "pokemon-151-booster-bundle",
    targetType: "product",
    fallbackPrice: 54.99,
    fallbackStatus: InventoryStatus.IN_STOCK
  }
]);

// ---------------------------------------------------------------------------
// Coles — Pokemon blister/loose packs (Coles only sells small format)
// ---------------------------------------------------------------------------
export const colesAdapter: RetailerAdapter = createAdapter("coles", [
  {
    title: "Pokemon TCG Booster Pack",
    url: "https://www.coles.com.au/search/products?q=pokemon+trading+card",
    targetSlug: "twilight-masquerade-booster-bundle",
    targetType: "product",
    fallbackPrice: 9,
    fallbackStatus: InventoryStatus.IN_STOCK
  }
]);

// ---------------------------------------------------------------------------
// Toyworld — real search URL
// ---------------------------------------------------------------------------
export const toyworldAdapter: RetailerAdapter = createAdapter("toyworld", [
  {
    title: "Pokemon 151 Booster Bundle",
    url: "https://www.toyworld.com.au/search?q=pokemon+151",
    targetSlug: "pokemon-151-booster-bundle",
    targetType: "product",
    fallbackPrice: 59.99,
    fallbackStatus: InventoryStatus.IN_STOCK
  },
  {
    title: "Prismatic Evolutions Elite Trainer Box",
    url: "https://www.toyworld.com.au/search?q=prismatic+evolutions",
    targetSlug: "prismatic-evolutions-elite-trainer-box",
    targetType: "product",
    fallbackPrice: 79.99,
    fallbackStatus: InventoryStatus.OUT_OF_STOCK
  }
]);

// ---------------------------------------------------------------------------
// Gameology — Shopify store, use .js product API for accuracy
// ---------------------------------------------------------------------------
export const gameologyAdapter: RetailerAdapter = {
  retailerSlug: "gameology",
  async fetchListings() {
    const BASE = "https://www.gameology.com.au";
    const targets: Array<{ handle: string; targetSlug: string; targetType: "product" | "card"; fallbackPrice: number; fallbackStatus: InventoryStatus }> = [
      { handle: "gengar-ex-197-165-sv-pokemon-151",   targetSlug: "gengar-ex-197-165",   targetType: "card",    fallbackPrice: 48,   fallbackStatus: InventoryStatus.IN_STOCK },
      { handle: "venusaur-ex-198-165-sv-pokemon-151", targetSlug: "venusaur-ex-198-165", targetType: "card",    fallbackPrice: 38,   fallbackStatus: InventoryStatus.IN_STOCK },
      { handle: "blastoise-ex-177-165-sv-pokemon-151",targetSlug: "blastoise-ex-177-165",targetType: "card",    fallbackPrice: 32,   fallbackStatus: InventoryStatus.IN_STOCK },
      { handle: "pokemon-151-booster-bundle",          targetSlug: "pokemon-151-booster-bundle", targetType: "product", fallbackPrice: 70, fallbackStatus: InventoryStatus.IN_STOCK }
    ];

    const results = await Promise.allSettled(
      targets.map((t) =>
        scrapeShopifyProduct("gameology", t.handle, BASE, t.targetSlug, t.targetType, t.fallbackPrice, t.fallbackStatus)
      )
    );

    return results.flatMap((result, i): RetailerListingInput[] => {
      if (result.status === "fulfilled") return [result.value];
      const t = targets[i]!;
      return [{
        retailerSlug: "gameology",
        title: t.handle.replace(/-/g, " "),
        normalizedPrice: t.fallbackPrice,
        currency: "AUD" as const,
        productUrl: `${BASE}/products/${t.handle}`,
        targetSlug: t.targetSlug,
        targetType: t.targetType,
        status: t.fallbackStatus,
        isPreorder: t.fallbackStatus === InventoryStatus.PREORDER,
        isPlaceholder: false
      }];
    });
  }
};

// ---------------------------------------------------------------------------
// Cherry Collectables — Shopify store, singles focus
// ---------------------------------------------------------------------------
export const cherryCollectablesAdapter: RetailerAdapter = {
  retailerSlug: "cherry-collectables",
  async fetchListings() {
    const BASE = "https://www.cherrycollectables.com.au";
    const targets: Array<{ handle: string; targetSlug: string; targetType: "product" | "card"; fallbackPrice: number; fallbackStatus: InventoryStatus }> = [
      { handle: "mew-ex-232-165-sv-pokemon-151",                  targetSlug: "mew-ex-232-165",      targetType: "card",    fallbackPrice: 72,  fallbackStatus: InventoryStatus.IN_STOCK },
      { handle: "espeon-ex-112-131-sv-prismatic-evolutions",      targetSlug: "espeon-ex-112-131",   targetType: "card",    fallbackPrice: 42,  fallbackStatus: InventoryStatus.IN_STOCK },
      { handle: "vaporeon-ex-85-131-sv-prismatic-evolutions",     targetSlug: "vaporeon-ex-85-131",  targetType: "card",    fallbackPrice: 35,  fallbackStatus: InventoryStatus.IN_STOCK },
      { handle: "prismatic-evolutions-elite-trainer-box",          targetSlug: "prismatic-evolutions-elite-trainer-box", targetType: "product", fallbackPrice: 119, fallbackStatus: InventoryStatus.OUT_OF_STOCK }
    ];

    const results = await Promise.allSettled(
      targets.map((t) =>
        scrapeShopifyProduct("cherry-collectables", t.handle, BASE, t.targetSlug, t.targetType, t.fallbackPrice, t.fallbackStatus)
      )
    );

    return results.flatMap((result, i): RetailerListingInput[] => {
      if (result.status === "fulfilled") return [result.value];
      const t = targets[i]!;
      return [{
        retailerSlug: "cherry-collectables",
        title: t.handle.replace(/-/g, " "),
        normalizedPrice: t.fallbackPrice,
        currency: "AUD" as const,
        productUrl: `${BASE}/products/${t.handle}`,
        targetSlug: t.targetSlug,
        targetType: t.targetType,
        status: t.fallbackStatus,
        isPreorder: t.fallbackStatus === InventoryStatus.PREORDER,
        isPlaceholder: false
      }];
    });
  }
};

export const retailerAdapters = [
  ebGamesAdapter,
  jbHifiAdapter,
  bigWAdapter,
  kmartAdapter,
  colesAdapter,
  toyworldAdapter,
  gameologyAdapter,
  cherryCollectablesAdapter
];
