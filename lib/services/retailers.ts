import { prisma } from "@/lib/db";
import { retailerAdapters } from "@/lib/retailers/mock-adapters";
import { getProviderHealth } from "@/lib/services/providers";

export async function getRetailerTrackerData() {
  const [retailers, providerHealth] = await Promise.all([
    prisma.retailer.findMany({
      include: {
        listings: {
          include: { product: true, card: true },
          orderBy: { detectedAt: "desc" }
        }
      },
      orderBy: { name: "asc" }
    }),
    getProviderHealth()
  ]);

  return retailers.map((retailer) => ({
    ...retailer,
    providerHealth:
      providerHealth.find((provider) => provider.slug === retailer.slug) ?? null
  }));
}

export async function runRetailerIngestion() {
  const retailers = await prisma.retailer.findMany();
  const products = await prisma.product.findMany();
  const cards = await prisma.card.findMany();
  const errors: string[] = [];
  let totalCreated = 0;

  for (const adapter of retailerAdapters) {
    const matchedRetailer = retailers.find((retailer) => retailer.slug === adapter.retailerSlug);
    if (!matchedRetailer) continue;

    let listings = await adapter.fetchListings().catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown retailer ingest error";
      errors.push(`${adapter.retailerSlug}: ${message}`);
      return [];
    });

    if (listings.length === 0) continue;

    await prisma.productListing.deleteMany({
      where: { retailerId: matchedRetailer.id }
    });

    for (const listing of listings) {
      const product = listing.targetType === "product" ? products.find((item) => item.slug === listing.targetSlug) : null;
      const card = listing.targetType === "card" ? cards.find((item) => item.slug === listing.targetSlug) : null;

      await prisma.productListing.create({
        data: {
          title: listing.title,
          normalizedPrice: listing.normalizedPrice,
          currency: listing.currency,
          status: listing.status,
          isPlaceholder: listing.isPlaceholder ?? false,
          isPreorder: listing.isPreorder ?? false,
          productUrl: listing.productUrl,
          retailerId: matchedRetailer.id,
          productId: product?.id,
          cardId: card?.id
        }
      });
      totalCreated += 1;
    }
  }

  return {
    summary: {
      created: totalCreated,
      errors
    },
    retailers: await getRetailerTrackerData()
  };
}
