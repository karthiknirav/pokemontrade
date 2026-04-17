import { InventoryStatus, IngestRunStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { detectListingQuality } from "@/lib/ingest/provider-rules";
import { getMinutesSince } from "@/lib/services/market";

export type ProviderHealth = {
  id: string;
  slug: string;
  name: string;
  websiteUrl: string;
  trustScore: number;
  sourceLinkCount: number;
  actionableCount: number;
  preorderCount: number;
  placeholderCount: number;
  suspiciousCount: number;
  staleCount: number;
  lastRunStatus: IngestRunStatus | "NEVER";
  lastRunStartedAt: Date | null;
  lastRunSummary: string;
  healthLabel: "Healthy" | "Watch" | "Blocked";
  healthNote: string;
};

function buildHealthLabel(input: {
  lastRunStatus: IngestRunStatus | "NEVER";
  actionableCount: number;
  staleCount: number;
  suspiciousCount: number;
  sourceLinkCount: number;
}) {
  if (input.lastRunStatus === "FAILED" || input.lastRunStatus === "NEVER") {
    return {
      healthLabel: "Blocked" as const,
      healthNote:
        input.lastRunStatus === "NEVER"
          ? "This provider has not been synced yet."
          : "Recent sync failed, so do not trust this source until it recovers."
    };
  }

  if (
    input.actionableCount === 0 ||
    input.staleCount >= Math.max(1, input.sourceLinkCount) ||
    input.suspiciousCount >= Math.max(1, Math.ceil(input.sourceLinkCount / 2))
  ) {
    return {
      healthLabel: "Watch" as const,
      healthNote: "This provider is present, but too much of its supply looks stale, indirect, or placeholder-like to anchor decisions safely."
    };
  }

  return {
    healthLabel: "Healthy" as const,
    healthNote: "This provider is contributing fresh actionable data to the current market view."
  };
}

export async function getProviderHealth() {
  const providers = await prisma.sourceProvider.findMany({
    include: {
      sourceLinks: true,
      listingSnapshots: true,
      ingestRuns: {
        orderBy: { startedAt: "desc" },
        take: 1
      }
    },
    orderBy: { name: "asc" }
  });

  return providers.map<ProviderHealth>((provider) => {
    const actionableCount = provider.listingSnapshots.filter((listing) => listing.stockStatus === InventoryStatus.IN_STOCK).length;
    const preorderCount = provider.listingSnapshots.filter((listing) => listing.stockStatus === InventoryStatus.PREORDER).length;
    const placeholderCount = provider.listingSnapshots.filter(
      (listing) => listing.isPlaceholder || listing.stockStatus === InventoryStatus.PLACEHOLDER
    ).length;
    const staleCount = provider.listingSnapshots.filter((listing) => getMinutesSince(listing.fetchedAt) > 60 * 24).length;
    const suspiciousCount = provider.listingSnapshots.filter((listing) =>
      detectListingQuality({
        providerSlug: provider.slug,
        sourceUrl: listing.sourceUrl,
        sourceTitle: listing.sourceTitle,
        stockStatus: listing.stockStatus,
        isPlaceholder: listing.isPlaceholder,
        sourceConfidence: listing.sourceConfidence,
        fetchedAt: listing.fetchedAt
      }).isSuspicious
    ).length;
    const lastRun = provider.ingestRuns[0];
    const lastRunStatus = lastRun?.status ?? "NEVER";
    const lastRunSummary = lastRun
      ? `${lastRun.status} / ${lastRun.updatedCount} updated / ${lastRun.createdCount} created`
      : "Never synced";
    const { healthLabel, healthNote } = buildHealthLabel({
      lastRunStatus,
      actionableCount,
      staleCount,
      suspiciousCount,
      sourceLinkCount: provider.sourceLinks.length
    });

    return {
      id: provider.id,
      slug: provider.slug,
      name: provider.name,
      websiteUrl: provider.websiteUrl,
      trustScore: provider.trustScore,
      sourceLinkCount: provider.sourceLinks.length,
      actionableCount,
      preorderCount,
      placeholderCount,
      suspiciousCount,
      staleCount,
      lastRunStatus,
      lastRunStartedAt: lastRun?.startedAt ?? null,
      lastRunSummary,
      healthLabel,
      healthNote
    };
  });
}
