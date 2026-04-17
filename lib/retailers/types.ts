import type { InventoryStatus } from "@prisma/client";

export type RetailerListingInput = {
  retailerSlug: string;
  title: string;
  normalizedPrice: number;
  currency: "AUD";
  status: InventoryStatus;
  isPlaceholder?: boolean;
  isPreorder?: boolean;
  productUrl: string;
  targetSlug: string;
  targetType: "product" | "card";
};

export interface RetailerAdapter {
  retailerSlug: string;
  fetchListings(): Promise<RetailerListingInput[]>;
}
