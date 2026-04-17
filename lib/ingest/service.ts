import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getAdapterForProvider } from "@/lib/ingest/adapters";
import { detectListingQuality } from "@/lib/ingest/provider-rules";

function pickBestLivePrice<T extends { normalizedPriceAud: Prisma.Decimal | number; stockStatus: "IN_STOCK" | "PREORDER" | "OUT_OF_STOCK" | "PLACEHOLDER"; isPreorder?: boolean }>(
  listings: T[]
) {
  const sorted = [...listings].sort((a, b) => Number(a.normalizedPriceAud) - Number(b.normalizedPriceAud));
  const trusted = sorted.filter((listing) =>
    !detectListingQuality({
      providerSlug: "provider" in listing && listing.provider && typeof listing.provider === "object" && "slug" in listing.provider ? String(listing.provider.slug) : null,
      sourceUrl: "sourceUrl" in listing ? String(listing.sourceUrl) : "",
      sourceTitle: "sourceTitle" in listing ? String(listing.sourceTitle ?? "") : "",
      stockStatus: listing.stockStatus,
      isPlaceholder: "isPlaceholder" in listing ? Boolean(listing.isPlaceholder) : false,
      sourceConfidence: "sourceConfidence" in listing ? Number(listing.sourceConfidence ?? 70) : 70,
      fetchedAt: "fetchedAt" in listing ? (listing.fetchedAt as Date | null | undefined) : null
    }).isSuspicious
  );
  const pool = trusted.length > 0 ? trusted : [];
  const inStock = pool.find((listing) => listing.stockStatus === "IN_STOCK");
  return inStock ?? pool.find((listing) => listing.stockStatus === "PREORDER") ?? null;
}

export async function runIngestion(providerSlug?: string) {
  const providers = await prisma.sourceProvider.findMany({
    where: {
      isActive: true,
      ...(providerSlug ? { slug: providerSlug } : {})
    },
    include: {
      sourceLinks: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  const results: Array<{ provider: string; created: number; updated: number; errors: string[] }> = [];

  for (const provider of providers) {
    const adapter = getAdapterForProvider(provider.slug);
    const ingestRun = await prisma.ingestRun.create({
      data: {
        providerId: provider.id,
        status: "RUNNING"
      }
    });

    let created = 0;
    let updated = 0;
    let matched = 0;
    const errors: string[] = [];

    for (const sourceLink of provider.sourceLinks) {
      try {
        const listing = await adapter.ingestLink(sourceLink);

        await prisma.rawSourceRecord.create({
          data: {
            providerId: provider.id,
            ingestRunId: ingestRun.id,
            sourceLinkId: sourceLink.id,
            sourceUrl: listing.sourceUrl,
            sourceTitle: listing.sourceTitle,
            priceText: listing.priceText,
            stockText: listing.stockText,
            payload: (listing.payload ?? null) as Prisma.InputJsonValue,
            matchedProductId: sourceLink.productId,
            matchedCardId: sourceLink.cardId
          }
        });

        const existing = await prisma.listingSnapshot.findUnique({
          where: { sourceLinkId: sourceLink.id }
        });

        const restockDetectedAt =
          existing && existing.stockStatus !== "IN_STOCK" && listing.stockStatus === "IN_STOCK" ? new Date() : existing?.restockDetectedAt;

        const snapshot = await prisma.listingSnapshot.upsert({
          where: { sourceLinkId: sourceLink.id },
          create: {
            providerId: provider.id,
            sourceLinkId: sourceLink.id,
            productId: sourceLink.productId,
            cardId: sourceLink.cardId,
            sourceUrl: listing.sourceUrl,
            sourceTitle: listing.sourceTitle,
            providerItemId: listing.providerItemId,
            normalizedPriceAud: listing.normalizedPriceAud,
            currency: listing.currency,
            stockStatus: listing.stockStatus,
            isPreorder: listing.isPreorder,
            isPlaceholder: listing.isPlaceholder,
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
            restockDetectedAt,
            fetchedAt: new Date(),
            sourceConfidence: listing.sourceConfidence
          },
          update: {
            sourceUrl: listing.sourceUrl,
            sourceTitle: listing.sourceTitle,
            providerItemId: listing.providerItemId,
            normalizedPriceAud: listing.normalizedPriceAud,
            currency: listing.currency,
            stockStatus: listing.stockStatus,
            isPreorder: listing.isPreorder,
            isPlaceholder: listing.isPlaceholder,
            lastSeenAt: new Date(),
            restockDetectedAt,
            fetchedAt: new Date(),
            sourceConfidence: listing.sourceConfidence
          }
        });

        if (sourceLink.productId) {
          matched += 1;
          const product = await prisma.product.findUnique({
            where: { id: sourceLink.productId },
            include: {
              listingSnapshots: {
                include: { provider: true },
                where: { stockStatus: { in: ["IN_STOCK", "PREORDER"] } },
                orderBy: { normalizedPriceAud: "asc" }
              }
            }
          });

          const bestListing = product ? pickBestLivePrice(product.listingSnapshots) : null;
          const bestPrice = bestListing ? Number(bestListing.normalizedPriceAud) : Number(product?.currentMarketPrice ?? listing.normalizedPriceAud);
          await prisma.product.update({
            where: { id: sourceLink.productId },
            data: {
              currentMarketPrice: bestPrice,
              priceSource: bestListing?.providerId === provider.id ? provider.name : product?.priceSource ?? provider.name,
              inStock: bestListing?.stockStatus === "IN_STOCK",
              isPreorder: bestListing?.stockStatus === "PREORDER"
            }
          });
          if (bestListing) {
            await prisma.priceHistory.create({
              data: {
                productId: sourceLink.productId,
                price: bestPrice,
                source: provider.name
              }
            });
          }
        }

        if (sourceLink.cardId) {
          matched += 1;
          const card = await prisma.card.findUnique({
            where: { id: sourceLink.cardId },
            include: {
              listingSnapshots: {
                include: { provider: true },
                where: { stockStatus: { in: ["IN_STOCK", "PREORDER"] } },
                orderBy: { normalizedPriceAud: "asc" }
              }
            }
          });

          const bestListing = card ? pickBestLivePrice(card.listingSnapshots) : null;
          const bestPrice = bestListing ? Number(bestListing.normalizedPriceAud) : Number(card?.currentMarketPrice ?? listing.normalizedPriceAud);
          await prisma.card.update({
            where: { id: sourceLink.cardId },
            data: {
              currentMarketPrice: bestPrice
            }
          });
          if (bestListing) {
            await prisma.priceHistory.create({
              data: {
                cardId: sourceLink.cardId,
                price: bestPrice,
                source: provider.name
              }
            });
          }
        }

        if (existing) updated += 1;
        else created += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown ingest error";
        errors.push(`${provider.name}: ${message}`);
      }
    }

    await prisma.ingestRun.update({
      where: { id: ingestRun.id },
      data: {
        status: errors.length === 0 ? "SUCCESS" : created + updated > 0 ? "PARTIAL" : "FAILED",
        completedAt: new Date(),
        fetchedCount: provider.sourceLinks.length,
        matchedCount: matched,
        createdCount: created,
        updatedCount: updated,
        errorSummary: errors.join(" | ").slice(0, 1000) || null
      }
    });

    results.push({ provider: provider.slug, created, updated, errors });
  }

  return results;
}
