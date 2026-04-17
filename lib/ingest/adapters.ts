import { InventoryStatus, type SourceLink } from "@prisma/client";

export type IngestedListing = {
  sourceTitle: string;
  sourceUrl: string;
  providerItemId?: string | null;
  normalizedPriceAud: number;
  currency: string;
  stockStatus: InventoryStatus;
  isPreorder: boolean;
  isPlaceholder: boolean;
  sourceConfidence: number;
  priceText?: string | null;
  stockText?: string | null;
  payload?: unknown;
};

export interface ProviderAdapter {
  providerSlug: string;
  ingestLink(sourceLink: SourceLink): Promise<IngestedListing>;
}

function parseInventoryStatus(text?: string | null) {
  const value = text?.toLowerCase() ?? "";
  if (value.includes("preorder") || value.includes("pre-order")) return InventoryStatus.PREORDER;
  if (value.includes("out of stock") || value.includes("sold out") || value.includes("unavailable")) {
    return InventoryStatus.OUT_OF_STOCK;
  }
  if (value.includes("placeholder")) return InventoryStatus.PLACEHOLDER;
  return InventoryStatus.IN_STOCK;
}

function normalizeAvailability(value?: string | null) {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("preorder")) return "Preorder";
  if (normalized.includes("instock")) return "In stock";
  if (normalized.includes("outofstock")) return "Out of stock";
  return value ?? null;
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Fetch failed with ${response.status} for ${url}`);
  }
  return response.text();
}

function extractJsonLd(html: string) {
  const matches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of matches) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      continue;
    }
  }
  return null;
}

function extractTitle(html: string) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  return titleMatch?.[1]?.trim() ?? "Unknown listing";
}

function normalizeSchemaValue(value?: string | null) {
  if (!value) return null;
  return value.split("/").pop()?.replace(/[^a-z]/gi, "").toLowerCase() ?? value.toLowerCase();
}

function extractMetaPrice(html: string) {
  const priceMatch =
    html.match(/property="product:price:amount"\s+content="([^"]+)"/i) ??
    html.match(/"price"\s*:\s*"([^"]+)"/i) ??
    html.match(/"price":\s*([0-9]+(?:\.[0-9]+)?)/i);
  return priceMatch?.[1] ? Number(priceMatch[1]) : null;
}

function parseStatusFromSchemaAvailability(value?: string | null) {
  const normalized = normalizeSchemaValue(value);
  if (!normalized) return null;
  if (normalized.includes("preorder")) return InventoryStatus.PREORDER;
  if (normalized.includes("outofstock") || normalized.includes("soldout") || normalized.includes("discontinued")) {
    return InventoryStatus.OUT_OF_STOCK;
  }
  if (normalized.includes("instock") || normalized.includes("limitedavailability")) return InventoryStatus.IN_STOCK;
  return null;
}

function extractJsonLdOffer(jsonLd: unknown) {
  if (!jsonLd || typeof jsonLd !== "object") return null;

  const graphValue = (jsonLd as { "@graph"?: unknown[] })["@graph"];
  const graph = Array.isArray(graphValue) ? graphValue : [jsonLd];

  for (const node of graph) {
    if (!node || typeof node !== "object") continue;
    const typedNode = node as {
      "@type"?: string | string[];
      name?: string;
      offers?: { price?: string | number; priceCurrency?: string; availability?: string };
    };
    const types = Array.isArray(typedNode["@type"]) ? typedNode["@type"] : [typedNode["@type"]];
    if (types.some((type) => String(type).toLowerCase().includes("product")) && typedNode.offers) {
      return {
        name: typedNode.name,
        price: typedNode.offers.price,
        priceCurrency: typedNode.offers.priceCurrency,
        availability: typedNode.offers.availability
      };
    }
  }

  return null;
}

const genericHtmlAdapter: ProviderAdapter = {
  providerSlug: "generic-html",
  async ingestLink(sourceLink) {
    const html = await fetchHtml(sourceLink.sourceUrl);
    const jsonLd = extractJsonLd(html) as
      | {
          name?: string;
          offers?: { price?: string; availability?: string; priceCurrency?: string };
        }
      | null;
    const price = Number(jsonLd?.offers?.price ?? extractMetaPrice(html) ?? 0);
    const stockText = normalizeAvailability(jsonLd?.offers?.availability);
    const stockStatus = parseInventoryStatus(stockText);

    if (!price) {
      throw new Error(`No price found for ${sourceLink.sourceUrl}`);
    }

    return {
      sourceTitle: jsonLd?.name ?? extractTitle(html),
      sourceUrl: sourceLink.sourceUrl,
      providerItemId: sourceLink.providerItemId,
      normalizedPriceAud: price,
      currency: jsonLd?.offers?.priceCurrency ?? "AUD",
      stockStatus,
      isPreorder: stockStatus === InventoryStatus.PREORDER,
      isPlaceholder: stockStatus === InventoryStatus.PLACEHOLDER,
      sourceConfidence: 62,
      priceText: String(price),
      stockText,
      payload: { title: extractTitle(html), jsonLd }
    };
  }
};

const gameologyAdapter: ProviderAdapter = {
  providerSlug: "gameology",
  async ingestLink(sourceLink) {
    const productUrl = sourceLink.sourceUrl.replace(/\/$/, "");
    const jsonUrl = productUrl.endsWith(".js") ? productUrl : `${productUrl}.js`;
    const response = await fetch(jsonUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Gameology fetch failed with ${response.status} for ${jsonUrl}`);
    }

    const payload = (await response.json()) as {
      title: string;
      handle?: string;
      variants?: Array<{ id: number; available: boolean; price: number; compare_at_price?: number | null }>;
      tags?: string[];
    };

    const firstAvailableVariant = payload.variants?.find((variant) => variant.available) ?? payload.variants?.[0];
    if (!firstAvailableVariant) {
      throw new Error(`No variants found for ${jsonUrl}`);
    }

    const tagText = payload.tags?.join(" ").toLowerCase() ?? "";
    const isPreorder = tagText.includes("preorder") || tagText.includes("pre-order");
    const stockStatus = isPreorder
      ? InventoryStatus.PREORDER
      : firstAvailableVariant.available
        ? InventoryStatus.IN_STOCK
        : InventoryStatus.OUT_OF_STOCK;

    return {
      sourceTitle: payload.title,
      sourceUrl: sourceLink.sourceUrl,
      providerItemId: String(firstAvailableVariant.id),
      normalizedPriceAud: Number((firstAvailableVariant.price / 100).toFixed(2)),
      currency: "AUD",
      stockStatus,
      isPreorder,
      isPlaceholder: false,
      sourceConfidence: 88,
      priceText: String(firstAvailableVariant.price / 100),
      stockText: stockStatus,
      payload
    };
  }
};

const jbHifiAdapter: ProviderAdapter = {
  providerSlug: "jb-hi-fi",
  async ingestLink(sourceLink) {
    const html = await fetchHtml(sourceLink.sourceUrl);
    const jsonLd = extractJsonLd(html);
    const offer = extractJsonLdOffer(jsonLd);
    const price = Number(offer?.price ?? extractMetaPrice(html) ?? 0);
    if (!price) {
      throw new Error(`No JB Hi-Fi price found for ${sourceLink.sourceUrl}`);
    }

    const stockStatus =
      parseStatusFromSchemaAvailability(offer?.availability) ??
      parseInventoryStatus(
        html.includes("sold out") || html.includes("out of stock")
          ? "Out of stock"
          : html.includes("pre-order") || html.includes("preorder")
            ? "Preorder"
            : "In stock"
      );

    return {
      sourceTitle: offer?.name ?? extractTitle(html),
      sourceUrl: sourceLink.sourceUrl,
      providerItemId: sourceLink.providerItemId,
      normalizedPriceAud: price,
      currency: offer?.priceCurrency ?? "AUD",
      stockStatus,
      isPreorder: stockStatus === InventoryStatus.PREORDER,
      isPlaceholder: html.toLowerCase().includes("notify me") || sourceLink.sourceUrl.toLowerCase().includes("/search"),
      sourceConfidence: sourceLink.sourceUrl.toLowerCase().includes("/search") ? 54 : 78,
      priceText: String(price),
      stockText: stockStatus,
      payload: { title: extractTitle(html), jsonLd }
    };
  }
};

const bigWAdapter: ProviderAdapter = {
  providerSlug: "big-w",
  async ingestLink(sourceLink) {
    const html = await fetchHtml(sourceLink.sourceUrl);
    const jsonLd = extractJsonLd(html);
    const offer = extractJsonLdOffer(jsonLd);
    const price = Number(offer?.price ?? extractMetaPrice(html) ?? 0);
    if (!price) {
      throw new Error(`No BIG W price found for ${sourceLink.sourceUrl}`);
    }

    const stockStatus =
      parseStatusFromSchemaAvailability(offer?.availability) ??
      parseInventoryStatus(
        html.includes("currently unavailable") || html.includes("out of stock")
          ? "Out of stock"
          : html.includes("pre-order") || html.includes("preorder")
            ? "Preorder"
            : "In stock"
      );

    return {
      sourceTitle: offer?.name ?? extractTitle(html),
      sourceUrl: sourceLink.sourceUrl,
      providerItemId: sourceLink.providerItemId,
      normalizedPriceAud: price,
      currency: offer?.priceCurrency ?? "AUD",
      stockStatus,
      isPreorder: stockStatus === InventoryStatus.PREORDER,
      isPlaceholder:
        html.toLowerCase().includes("check in-store") ||
        html.toLowerCase().includes("assorted") ||
        sourceLink.sourceUrl.toLowerCase().includes("/search"),
      sourceConfidence: sourceLink.sourceUrl.toLowerCase().includes("/search") ? 52 : 74,
      priceText: String(price),
      stockText: stockStatus,
      payload: { title: extractTitle(html), jsonLd }
    };
  }
};

const ebGamesAdapter: ProviderAdapter = {
  providerSlug: "eb-games",
  async ingestLink(sourceLink) {
    const html = await fetchHtml(sourceLink.sourceUrl);
    const jsonLd = extractJsonLd(html);
    const offer = extractJsonLdOffer(jsonLd);
    const price = Number(offer?.price ?? extractMetaPrice(html) ?? 0);
    if (!price) {
      throw new Error(`No EB Games price found for ${sourceLink.sourceUrl}`);
    }

    const stockStatus =
      parseStatusFromSchemaAvailability(offer?.availability) ??
      parseInventoryStatus(
        html.includes("sold out") || html.includes("out of stock") || html.includes("currently unavailable")
          ? "Out of stock"
          : html.includes("pre-order") || html.includes("preorder")
            ? "Preorder"
            : "In stock"
      );

    return {
      sourceTitle: offer?.name ?? extractTitle(html),
      sourceUrl: sourceLink.sourceUrl,
      providerItemId: sourceLink.providerItemId,
      normalizedPriceAud: price,
      currency: offer?.priceCurrency ?? "AUD",
      stockStatus,
      isPreorder: stockStatus === InventoryStatus.PREORDER,
      isPlaceholder: sourceLink.sourceUrl.toLowerCase().includes("/search"),
      sourceConfidence: sourceLink.sourceUrl.toLowerCase().includes("/search") ? 58 : 80,
      priceText: String(price),
      stockText: stockStatus,
      payload: { title: extractTitle(html), jsonLd }
    };
  }
};

const kmartAdapter: ProviderAdapter = {
  providerSlug: "kmart",
  async ingestLink(sourceLink) {
    const html = await fetchHtml(sourceLink.sourceUrl);
    const jsonLd = extractJsonLd(html);
    const offer = extractJsonLdOffer(jsonLd);
    const price = Number(offer?.price ?? extractMetaPrice(html) ?? 0);
    if (!price) {
      throw new Error(`No Kmart price found for ${sourceLink.sourceUrl}`);
    }

    const stockStatus =
      parseStatusFromSchemaAvailability(offer?.availability) ??
      parseInventoryStatus(
        html.includes("sold out") || html.includes("out of stock") || html.includes("currently unavailable")
          ? "Out of stock"
          : html.includes("pre-order") || html.includes("preorder")
            ? "Preorder"
            : "In stock"
      );

    return {
      sourceTitle: offer?.name ?? extractTitle(html),
      sourceUrl: sourceLink.sourceUrl,
      providerItemId: sourceLink.providerItemId,
      normalizedPriceAud: price,
      currency: offer?.priceCurrency ?? "AUD",
      stockStatus,
      isPreorder: stockStatus === InventoryStatus.PREORDER,
      isPlaceholder: sourceLink.sourceUrl.toLowerCase().includes("/search"),
      sourceConfidence: sourceLink.sourceUrl.toLowerCase().includes("/search") ? 56 : 76,
      priceText: String(price),
      stockText: stockStatus,
      payload: { title: extractTitle(html), jsonLd }
    };
  }
};

const colesAdapter: ProviderAdapter = {
  providerSlug: "coles",
  async ingestLink(sourceLink) {
    const html = await fetchHtml(sourceLink.sourceUrl);
    const jsonLd = extractJsonLd(html);
    const offer = extractJsonLdOffer(jsonLd);
    const price = Number(offer?.price ?? extractMetaPrice(html) ?? 0);
    if (!price) {
      throw new Error(`No Coles price found for ${sourceLink.sourceUrl}`);
    }

    const stockStatus =
      parseStatusFromSchemaAvailability(offer?.availability) ??
      parseInventoryStatus(
        html.includes("out of stock") || html.includes("currently unavailable") || html.includes("sold out")
          ? "Out of stock"
          : html.includes("pre-order") || html.includes("preorder")
            ? "Preorder"
            : "In stock"
      );

    return {
      sourceTitle: offer?.name ?? extractTitle(html),
      sourceUrl: sourceLink.sourceUrl,
      providerItemId: sourceLink.providerItemId,
      normalizedPriceAud: price,
      currency: offer?.priceCurrency ?? "AUD",
      stockStatus,
      isPreorder: stockStatus === InventoryStatus.PREORDER,
      isPlaceholder: sourceLink.sourceUrl.toLowerCase().includes("/search"),
      sourceConfidence: sourceLink.sourceUrl.toLowerCase().includes("/search") ? 54 : 74,
      priceText: String(price),
      stockText: stockStatus,
      payload: { title: extractTitle(html), jsonLd }
    };
  }
};

export const providerAdapters: ProviderAdapter[] = [
  gameologyAdapter,
  jbHifiAdapter,
  bigWAdapter,
  ebGamesAdapter,
  kmartAdapter,
  colesAdapter
];

export function getAdapterForProvider(slug: string) {
  return providerAdapters.find((adapter) => adapter.providerSlug === slug) ?? genericHtmlAdapter;
}
