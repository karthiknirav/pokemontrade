import type {
  Alert,
  Card,
  ListingSnapshot,
  PortfolioItem,
  PriceHistory,
  Product,
  ProductListing,
  Recommendation,
  Retailer,
  SalesRecord,
  ScoreSnapshot,
  SourceLink,
  SourceProvider,
  TcgSet
} from "@prisma/client";

export type ProductWithRelations = Product & {
  set: TcgSet | null;
  listings: (ProductListing & { retailer: Retailer })[];
  listingSnapshots: (ListingSnapshot & { provider: SourceProvider })[];
  salesRecords: (SalesRecord & { provider: SourceProvider })[];
  sourceLinks: (SourceLink & { provider: SourceProvider })[];
  priceHistory: PriceHistory[];
  recommendations: Recommendation[];
  scoreSnapshots: ScoreSnapshot[];
};

export type CardWithRelations = Card & {
  set: TcgSet;
  listings: (ProductListing & { retailer: Retailer })[];
  listingSnapshots: (ListingSnapshot & { provider: SourceProvider })[];
  salesRecords: (SalesRecord & { provider: SourceProvider })[];
  sourceLinks: (SourceLink & { provider: SourceProvider })[];
  priceHistory: PriceHistory[];
  recommendations: Recommendation[];
  scoreSnapshots: ScoreSnapshot[];
};

export type DashboardPayload = {
  bestBuys: Recommendation[];
  riskyProducts: Recommendation[];
  stockAlerts: ProductListing[];
  recentRetailerChanges: ProductListing[];
  portfolioItems: PortfolioItem[];
  products: ProductWithRelations[];
  cards: CardWithRelations[];
  alerts: Alert[];
};
