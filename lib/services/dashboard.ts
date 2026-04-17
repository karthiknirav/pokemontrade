import { AlertStatus, InventoryStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

export async function getDashboardData(userId?: string) {
  const [bestBuys, riskyProducts, stockAlerts, recentRetailerChanges, portfolioItems, products, cards, alerts] =
    await Promise.all([
      prisma.recommendation.findMany({
        where: { action: "BUY", productId: { not: null } },
        orderBy: [{ buyScore: "desc" }, { createdAt: "desc" }],
        take: 5
      }),
      prisma.recommendation.findMany({
        where: { productId: { not: null } },
        orderBy: [{ riskScore: "desc" }, { createdAt: "desc" }],
        take: 5
      }),
      prisma.listingSnapshot.findMany({
        where: { stockStatus: { in: [InventoryStatus.IN_STOCK, InventoryStatus.PREORDER] } },
        include: { provider: true, product: true, card: true },
        orderBy: { fetchedAt: "desc" },
        take: 6
      }),
      prisma.listingSnapshot.findMany({
        include: { provider: true, product: true, card: true },
        orderBy: { fetchedAt: "desc" },
        take: 8
      }),
      userId
        ? prisma.portfolioItem.findMany({
            where: { userId },
            include: { product: true, card: true },
            orderBy: { purchasedAt: "desc" }
          })
        : Promise.resolve([]),
      prisma.product.findMany({
        include: {
          set: true,
          listings: { include: { retailer: true } },
          listingSnapshots: { include: { provider: true }, orderBy: { normalizedPriceAud: "asc" } },
          salesRecords: { include: { provider: true }, orderBy: { soldAt: "desc" }, take: 3 },
          priceHistory: { orderBy: { recordedAt: "asc" } },
          recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
          scoreSnapshots: { orderBy: { createdAt: "desc" }, take: 1 }
        },
        take: 6
      }),
      prisma.card.findMany({
        include: {
          set: true,
          listings: { include: { retailer: true } },
          listingSnapshots: { include: { provider: true }, orderBy: { normalizedPriceAud: "asc" } },
          salesRecords: { include: { provider: true }, orderBy: { soldAt: "desc" }, take: 3 },
          priceHistory: { orderBy: { recordedAt: "asc" } },
          recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
          scoreSnapshots: { orderBy: { createdAt: "desc" }, take: 1 }
        },
        take: 6
      }),
      userId
        ? prisma.alert.findMany({
            where: { userId, status: { in: [AlertStatus.ACTIVE, AlertStatus.TRIGGERED] } },
            include: { product: true, card: true },
            orderBy: { createdAt: "desc" }
          })
        : Promise.resolve([])
    ]);

  return {
    bestBuys,
    riskyProducts,
    stockAlerts,
    recentRetailerChanges,
    portfolioItems,
    products,
    cards,
    alerts
  };
}
