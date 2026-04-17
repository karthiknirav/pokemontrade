import { prisma } from "@/lib/db";

export async function getProducts() {
  return prisma.product.findMany({
    include: {
      set: true,
      listings: { include: { retailer: true }, orderBy: { normalizedPrice: "asc" } },
      listingSnapshots: { include: { provider: true }, orderBy: { normalizedPriceAud: "asc" } },
      salesRecords: { include: { provider: true }, orderBy: { soldAt: "desc" }, take: 3 },
      sourceLinks: { include: { provider: true }, orderBy: { createdAt: "desc" } },
      priceHistory: { orderBy: { recordedAt: "asc" } },
      recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
      scoreSnapshots: { orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: { releaseDate: "desc" }
  });
}

export async function getPreorderProducts() {
  const now = new Date();
  const recentCutoff = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 45);

  return prisma.product.findMany({
    where: {
      OR: [
        {
          AND: [{ isPreorder: true }, { releaseDate: { gte: now } }]
        },
        {
          listings: {
            some: {
              OR: [{ isPreorder: true }, { status: "PREORDER" }],
              detectedAt: { gte: recentCutoff }
            }
          }
        },
        {
          listingSnapshots: {
            some: {
              stockStatus: "PREORDER",
              fetchedAt: { gte: recentCutoff }
            }
          }
        }
      ]
    },
    include: {
      set: true,
      listings: { include: { retailer: true }, orderBy: [{ isPreorder: "desc" }, { normalizedPrice: "asc" }] },
      listingSnapshots: { include: { provider: true }, orderBy: [{ isPreorder: "desc" }, { normalizedPriceAud: "asc" }] },
      salesRecords: { include: { provider: true }, orderBy: { soldAt: "desc" }, take: 3 },
      sourceLinks: { include: { provider: true }, orderBy: { createdAt: "desc" } },
      priceHistory: { orderBy: { recordedAt: "asc" } },
      recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
      scoreSnapshots: { orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: [{ releaseDate: "asc" }, { popularityScore: "desc" }]
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      set: true,
      listings: { include: { retailer: true }, orderBy: { normalizedPrice: "asc" } },
      listingSnapshots: { include: { provider: true }, orderBy: { normalizedPriceAud: "asc" } },
      salesRecords: { include: { provider: true }, orderBy: { soldAt: "desc" }, take: 3 },
      sourceLinks: { include: { provider: true }, orderBy: { createdAt: "desc" } },
      priceHistory: { orderBy: { recordedAt: "asc" } },
      recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
      scoreSnapshots: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });
}

export async function getCards() {
  return prisma.card.findMany({
    include: {
      set: true,
      listings: { include: { retailer: true }, orderBy: { normalizedPrice: "asc" } },
      listingSnapshots: { include: { provider: true }, orderBy: { normalizedPriceAud: "asc" } },
      salesRecords: { include: { provider: true }, orderBy: { soldAt: "desc" }, take: 3 },
      sourceLinks: { include: { provider: true }, orderBy: { createdAt: "desc" } },
      priceHistory: { orderBy: { recordedAt: "asc" } },
      recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
      scoreSnapshots: { orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: { currentMarketPrice: "desc" }
  });
}

export async function getCardBySlug(slug: string) {
  return prisma.card.findUnique({
    where: { slug },
    include: {
      set: true,
      listings: { include: { retailer: true }, orderBy: { normalizedPrice: "asc" } },
      listingSnapshots: { include: { provider: true }, orderBy: { normalizedPriceAud: "asc" } },
      salesRecords: { include: { provider: true }, orderBy: { soldAt: "desc" }, take: 3 },
      sourceLinks: { include: { provider: true }, orderBy: { createdAt: "desc" } },
      priceHistory: { orderBy: { recordedAt: "asc" } },
      recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
      scoreSnapshots: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });
}
