import { InventoryStatus } from "@prisma/client";

type ListingRuleInput = {
  providerSlug?: string | null;
  sourceUrl: string;
  sourceTitle?: string | null;
  stockStatus: InventoryStatus;
  isPlaceholder?: boolean;
  sourceConfidence?: number;
  fetchedAt?: Date | null;
};

export type ListingQuality = {
  isSuspicious: boolean;
  reasons: string[];
  isSearchUrl: boolean;
  isSoftAvailability: boolean;
  isStale: boolean;
  confidencePenalty: number;
};

const retailerSignals: Record<
  string,
  {
    searchPatterns?: string[];
    titleFlags?: string[];
    urlFlags?: string[];
  }
> = {
  "eb-games": {
    searchPatterns: ["/search", "searchterm="],
    titleFlags: ["coming soon", "notify me", "available for preorder", "pre-owned"],
    urlFlags: ["click-and-collect", "preowned"]
  },
  "jb-hi-fi": {
    searchPatterns: ["/search", "?query=", "?q="],
    titleFlags: ["notify me", "coming soon", "sold out online"],
    urlFlags: ["search?", "coming-soon"]
  },
  "big-w": {
    searchPatterns: ["/search", "?searchterm=", "?q="],
    titleFlags: ["check in-store", "sold separately", "assorted", "currently unavailable"],
    urlFlags: ["/search", "assorted"]
  },
  kmart: {
    searchPatterns: ["/search", "?q="],
    titleFlags: ["assorted", "styles vary", "currently unavailable"],
    urlFlags: ["/search", "assorted", "variety"]
  },
  coles: {
    searchPatterns: ["/search", "/browse"],
    titleFlags: ["out of stock", "unavailable", "varieties may vary"],
    urlFlags: ["/browse", "specials"]
  },
  toyworld: {
    searchPatterns: ["/search", "?rfk=", "?q="],
    titleFlags: ["assorted", "toy", "figurine", "plush"],
    urlFlags: ["/search", "toy-", "plush"]
  }
};

function containsAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

export function detectListingQuality(input: ListingRuleInput) {
  const providerSlug = input.providerSlug?.toLowerCase() ?? "";
  const providerRules = retailerSignals[providerSlug];
  const url = input.sourceUrl.toLowerCase();
  const title = input.sourceTitle?.toLowerCase() ?? "";
  const reasons: string[] = [];
  const genericSearchUrl =
    url.includes("/search") || url.includes("?q=") || url.includes("searchterm=") || url.includes("text=");
  const providerSearchUrl = providerRules?.searchPatterns ? containsAny(url, providerRules.searchPatterns) : false;
  const providerTitleFlag = providerRules?.titleFlags ? containsAny(title, providerRules.titleFlags) : false;
  const providerUrlFlag = providerRules?.urlFlags ? containsAny(url, providerRules.urlFlags) : false;
  const isSearchUrl = genericSearchUrl || providerSearchUrl;
  const isSoftAvailability =
    input.isPlaceholder ||
    input.stockStatus === InventoryStatus.PLACEHOLDER ||
    title.includes("coming soon") ||
    title.includes("placeholder") ||
    title.includes("notify me") ||
    providerTitleFlag ||
    providerUrlFlag;
  const isStale = Boolean(input.fetchedAt && Date.now() - new Date(input.fetchedAt).getTime() > 1000 * 60 * 60 * 24);
  let confidencePenalty = 0;

  if (input.isPlaceholder || input.stockStatus === InventoryStatus.PLACEHOLDER) {
    reasons.push("Explicit placeholder status.");
    confidencePenalty += 25;
  }
  if (isSearchUrl) {
    reasons.push("Search-result URL instead of a direct product page.");
    confidencePenalty += 18;
  }
  if (providerTitleFlag) {
    reasons.push(`Retailer-specific title pattern looks soft for ${providerSlug}.`);
    confidencePenalty += 14;
  }
  if (providerUrlFlag) {
    reasons.push(`Retailer-specific URL pattern looks indirect for ${providerSlug}.`);
    confidencePenalty += 12;
  }
  if (title.includes("coming soon") || title.includes("placeholder") || title.includes("notify me")) {
    reasons.push("Listing title suggests placeholder or soft availability.");
    confidencePenalty += 16;
  }
  if ((input.sourceConfidence ?? 70) < 65) {
    reasons.push("Low source confidence.");
    confidencePenalty += 14;
  }
  if (isStale) {
    reasons.push("Listing is stale.");
    confidencePenalty += 12;
  }

  if (providerSlug === "toyworld" && !title.includes("tcg") && !title.includes("booster") && !title.includes("trainer box")) {
    reasons.push("Toyworld title looks more like a toy/accessory than a TCG listing.");
    confidencePenalty += 20;
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
    isSearchUrl,
    isSoftAvailability,
    isStale,
    confidencePenalty
  } satisfies ListingQuality;
}
