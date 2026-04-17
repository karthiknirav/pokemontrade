import { prisma } from "@/lib/db";

export async function getPortfolio(userId: string) {
  const items = await prisma.portfolioItem.findMany({
    where: { userId },
    include: { product: true, card: true },
    orderBy: { purchasedAt: "desc" }
  });

  const summary = items.reduce(
    (acc, item) => {
      const currentValue = Number(item.product?.currentMarketPrice ?? item.card?.currentMarketPrice ?? item.buyPriceAud);
      const cost = Number(item.buyPriceAud) * item.quantity;
      const value = currentValue * item.quantity;
      acc.costBasis += cost;
      acc.marketValue += value;
      acc.unrealized += value - cost;
      return acc;
    },
    { costBasis: 0, marketValue: 0, unrealized: 0 }
  );

  return { items, summary };
}
