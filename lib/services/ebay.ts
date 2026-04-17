import { ProviderType } from "@prisma/client";

import { prisma } from "@/lib/db";

type EbayImportInput = {
  targetType: "product" | "card";
  slug: string;
  query?: string;
  limit?: number;
};

type EbaySoldComp = {
  title: string;
  saleUrl: string;
  priceAud: number;
  shippingAud?: number;
  soldAt: Date;
  condition?: string;
};

function getEbayAppId() {
  return process.env.EBAY_APP_ID?.trim() || null;
}

function buildDefaultQuery(target: { name: string; slug: string; number?: string | null; set?: { name?: string | null } | null }) {
  const numberSuffix = target.number ? ` ${target.number}` : "";
  const setName = target.set?.name ? ` ${target.set.name}` : "";
  return `${target.name}${numberSuffix}${setName}`.trim();
}

function parseAmount(value?: string) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getOrCreateEbayProvider() {
  const existing = await prisma.sourceProvider.findFirst({
    where: { slug: "ebay" }
  });
  if (existing) return existing;

  return prisma.sourceProvider.create({
    data: {
      slug: "ebay",
      name: "eBay",
      providerType: ProviderType.MARKETPLACE,
      websiteUrl: "https://www.ebay.com.au",
      logoLabel: "EB",
      trustScore: 68
    }
  });
}

export async function fetchEbaySoldComps(query: string, limit = 6): Promise<EbaySoldComp[]> {
  const appId = getEbayAppId();
  if (!appId) {
    throw new Error("EBAY_APP_ID is not configured.");
  }

  const url = new URL("https://svcs.ebay.com/services/search/FindingService/v1");
  url.searchParams.set("OPERATION-NAME", "findCompletedItems");
  url.searchParams.set("SERVICE-VERSION", "1.13.0");
  url.searchParams.set("SECURITY-APPNAME", appId);
  url.searchParams.set("RESPONSE-DATA-FORMAT", "JSON");
  url.searchParams.set("REST-PAYLOAD", "");
  url.searchParams.set("GLOBAL-ID", "EBAY-AU");
  url.searchParams.set("siteid", "15");
  url.searchParams.set("keywords", query);
  url.searchParams.set("paginationInput.entriesPerPage", String(Math.max(3, Math.min(limit, 10))));
  url.searchParams.set("itemFilter(0).name", "SoldItemsOnly");
  url.searchParams.set("itemFilter(0).value", "true");
  url.searchParams.set("sortOrder", "EndTimeSoonest");

  const response = await fetch(url, {
    headers: {
      "user-agent": "pokemon-profit-intelligence-au/1.0"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`eBay request failed with ${response.status}.`);
  }

  const data = (await response.json()) as {
    findCompletedItemsResponse?: Array<{
      ack?: string[];
      searchResult?: Array<{
        item?: Array<{
          title?: string[];
          viewItemURL?: string[];
          sellingStatus?: Array<{
            currentPrice?: Array<{ __value__?: string }>;
          }>;
          shippingInfo?: Array<{
            shippingServiceCost?: Array<{ __value__?: string }>;
          }>;
          listingInfo?: Array<{
            endTime?: string[];
          }>;
          condition?: Array<{
            conditionDisplayName?: string[];
          }>;
        }>;
      }>;
    }>;
  };

  const items = data.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item ?? [];

  return items
    .map<EbaySoldComp | null>((item) => {
      const title = item.title?.[0]?.trim();
      const saleUrl = item.viewItemURL?.[0]?.trim();
      const priceAud = parseAmount(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__);
      const shippingAud = parseAmount(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__);
      const soldAtRaw = item.listingInfo?.[0]?.endTime?.[0];
      const condition = item.condition?.[0]?.conditionDisplayName?.[0]?.trim();

      if (!title || !saleUrl || !priceAud || !soldAtRaw) {
        return null;
      }

      return {
        title,
        saleUrl,
        priceAud,
        ...(shippingAud > 0 ? { shippingAud } : {}),
        soldAt: new Date(soldAtRaw),
        ...(condition ? { condition } : {})
      };
    })
    .filter((item): item is EbaySoldComp => Boolean(item))
    .slice(0, limit);
}

export async function importEbaySoldComps(input: EbayImportInput) {
  const target =
    input.targetType === "product"
      ? await prisma.product.findUnique({
          where: { slug: input.slug },
          include: { set: true }
        })
      : await prisma.card.findUnique({
          where: { slug: input.slug },
          include: { set: true }
        });

  if (!target) {
    throw new Error(`Could not find ${input.targetType} with slug ${input.slug}.`);
  }

  const provider = await getOrCreateEbayProvider();
  const searchQuery = input.query?.trim() || buildDefaultQuery(target);
  const comps = await fetchEbaySoldComps(searchQuery, input.limit ?? 6);

  let imported = 0;
  let skipped = 0;

  for (const comp of comps) {
    const existing = await prisma.salesRecord.findFirst({
      where: {
        providerId: provider.id,
        ...(input.targetType === "product" ? { productId: target.id } : { cardId: target.id }),
        saleUrl: comp.saleUrl
      }
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.salesRecord.create({
      data: {
        providerId: provider.id,
        productId: input.targetType === "product" ? target.id : undefined,
        cardId: input.targetType === "card" ? target.id : undefined,
        sourceTitle: comp.title,
        saleUrl: comp.saleUrl,
        normalizedPriceAud: comp.priceAud,
        shippingAud: comp.shippingAud,
        condition: comp.condition,
        soldAt: comp.soldAt,
        sourceConfidence: 74
      }
    });

    imported += 1;
  }

  return {
    query: searchQuery,
    target: target.name,
    imported,
    skipped,
    fetched: comps.length
  };
}
