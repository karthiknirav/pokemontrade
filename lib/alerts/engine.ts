import { AlertStatus, AlertType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { sendTelegram } from "@/lib/services/notifier";

export async function evaluateAlerts() {
  const alerts = await prisma.alert.findMany({
    where: { status: AlertStatus.ACTIVE },
    include: {
      product: {
        include: { listings: true, recommendations: { orderBy: { createdAt: "desc" }, take: 1 } }
      }
    }
  });

  const triggered: string[] = [];

  for (const alert of alerts) {
    const product = alert.product;
    if (!product) continue;

    const lowestPrice = product.listings.reduce<number | null>((min, listing) => {
      const price = Number(listing.normalizedPrice);
      return min === null ? price : Math.min(min, price);
    }, null);

    const topRecommendation = product.recommendations[0];

    const shouldTriggerPrice =
      alert.type === AlertType.PRICE_DROP &&
      alert.targetPriceAud &&
      lowestPrice !== null &&
      lowestPrice <= Number(alert.targetPriceAud);

    const shouldTriggerValue =
      alert.type === AlertType.VALUE_BUY && topRecommendation?.action === "BUY";

    const shouldTriggerRestock =
      alert.type === AlertType.RESTOCK &&
      product.listings.some((listing) => listing.status === "IN_STOCK");

    if (shouldTriggerPrice || shouldTriggerValue || shouldTriggerRestock) {
      await prisma.alert.update({
        where: { id: alert.id },
        data: { status: AlertStatus.TRIGGERED, triggeredAt: new Date() }
      });
      triggered.push(alert.id);

      // Push Telegram notification for the triggered alert
      const name = product.name;
      const price = lowestPrice !== null ? `A$${lowestPrice.toFixed(2)}` : "price unknown";
      const reason = shouldTriggerRestock
        ? `Back in stock at ${price}`
        : shouldTriggerPrice
          ? `Price dropped to ${price} (target: A$${Number(alert.targetPriceAud).toFixed(2)})`
          : `Scored BUY — good entry at ${price}`;

      await sendTelegram({
        title: `Alert triggered: ${name}`,
        body: reason,
        urgency: shouldTriggerRestock ? "high" : "normal"
      });
    }
  }

  return { triggeredCount: triggered.length, ids: triggered };
}
