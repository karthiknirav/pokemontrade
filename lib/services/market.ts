import { InventoryStatus, type ListingSnapshot, type SalesRecord, type SourceProvider } from "@prisma/client";

import { detectListingQuality } from "@/lib/ingest/provider-rules";

export type LiveListing = ListingSnapshot & {
  provider: SourceProvider;
};

export type RecentSale = SalesRecord & {
  provider: SourceProvider;
};

export function sortListingsByBestEntry(listings: LiveListing[]) {
  return [...listings].sort((a, b) => Number(a.normalizedPriceAud) - Number(b.normalizedPriceAud));
}

export function isSuspiciousListing(listing: LiveListing) {
  return detectListingQuality({
    providerSlug: listing.provider.slug,
    sourceUrl: listing.sourceUrl,
    sourceTitle: listing.sourceTitle,
    stockStatus: listing.stockStatus,
    isPlaceholder: listing.isPlaceholder,
    sourceConfidence: listing.sourceConfidence,
    fetchedAt: listing.fetchedAt
  }).isSuspicious;
}

export function getSuspiciousListings(listings: LiveListing[]) {
  return sortListingsByBestEntry(listings).filter(isSuspiciousListing);
}

export function getTrustedListings(listings: LiveListing[]) {
  return sortListingsByBestEntry(listings).filter((listing) => !isSuspiciousListing(listing));
}

export function getInStockListings(listings: LiveListing[]) {
  const trusted = getTrustedListings(listings).filter((listing) => listing.stockStatus === InventoryStatus.IN_STOCK);
  if (trusted.length > 0) return trusted;
  return [];
}

export function getCurrentListings(listings: LiveListing[]) {
  const trusted = getTrustedListings(listings).filter(
    (listing) => listing.stockStatus === InventoryStatus.IN_STOCK || listing.stockStatus === InventoryStatus.PREORDER
  );
  if (trusted.length > 0) return trusted;
  return [];
}

export function getActionableListings(listings: LiveListing[]) {
  const inStock = getInStockListings(listings);
  return inStock.length > 0 ? inStock : getCurrentListings(listings);
}

export function getBestListing(listings: LiveListing[]) {
  return getActionableListings(listings)[0] ?? null;
}

export function getAvailabilityMode(listings: LiveListing[]) {
  const inStock = getInStockListings(listings);
  if (inStock.length > 0) return "IN_STOCK";
  const current = getCurrentListings(listings);
  if (current.some((listing) => listing.stockStatus === InventoryStatus.PREORDER)) return "PREORDER_ONLY";
  return "UNAVAILABLE";
}

export function getLastThreeSales(sales: RecentSale[]) {
  return [...sales]
    .sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime())
    .slice(0, 3);
}

export function getRecentSalesAverage(sales: RecentSale[]) {
  const lastThree = getLastThreeSales(sales);
  if (lastThree.length === 0) return null;
  return lastThree.reduce((sum, sale) => sum + Number(sale.normalizedPriceAud), 0) / lastThree.length;
}

export function getDataFreshnessLabel(date?: Date | null) {
  if (!date) return "No freshness data";
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / (1000 * 60));
  if (minutes < 5) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  return `Updated ${Math.round(hours / 24)}d ago`;
}

export function getMinutesSince(date?: Date | null) {
  if (!date) return Number.POSITIVE_INFINITY;
  return Math.round((Date.now() - new Date(date).getTime()) / (1000 * 60));
}

export function getInventoryTone(status: InventoryStatus) {
  switch (status) {
    case InventoryStatus.IN_STOCK:
      return "In stock";
    case InventoryStatus.PREORDER:
      return "Preorder";
    case InventoryStatus.OUT_OF_STOCK:
      return "Out of stock";
    case InventoryStatus.PLACEHOLDER:
      return "Placeholder";
    default:
      return status;
  }
}
