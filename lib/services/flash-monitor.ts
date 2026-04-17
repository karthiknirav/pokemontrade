// ---------------------------------------------------------------------------
// Flash monitor — polls AU retailers for stock changes
// Normal mode:  runs every ~30 min (via cron)
// High-alert:   runs every 30 sec (when near a predicted window)
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { recordConfirmedDrop } from "@/lib/services/pattern-engine";
import { sendFlashAlert } from "@/lib/services/notifier";

const DEFAULT_HEADERS = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

// Products to watch — maps to real AU retailer URLs
// Extend this list as new sets are announced
const WATCH_LIST = [
  {
    retailerSlug: "eb-games",
    productName: "Pokemon 151 Booster Bundle",
    productSlug: "pokemon-151-booster-bundle",
    url: "https://www.ebgames.com.au/search?searchTerm=pokemon+151+booster+bundle",
    targetType: "product" as const
  },
  {
    retailerSlug: "eb-games",
    productName: "Prismatic Evolutions Elite Trainer Box",
    productSlug: "prismatic-evolutions-elite-trainer-box",
    url: "https://www.ebgames.com.au/search?searchTerm=prismatic+evolutions+elite+trainer+box",
    targetType: "product" as const
  },
  {
    retailerSlug: "eb-games",
    productName: "Destined Rivals Elite Trainer Box",
    productSlug: "destined-rivals-elite-trainer-box",
    url: "https://www.ebgames.com.au/search?searchTerm=destined+rivals+elite+trainer+box",
    targetType: "product" as const
  },
  {
    retailerSlug: "jb-hi-fi",
    productName: "Pokemon 151 Booster Bundle",
    productSlug: "pokemon-151-booster-bundle",
    url: "https://www.jbhifi.com.au/search?q=pokemon+151+booster+bundle&type=product",
    targetType: "product" as const
  },
  {
    retailerSlug: "big-w",
    productName: "Prismatic Evolutions ETB",
    productSlug: "prismatic-evolutions-elite-trainer-box",
    url: "https://www.bigw.com.au/search?q=prismatic+evolutions+elite+trainer+box",
    targetType: "product" as const
  },
  {
    retailerSlug: "kmart",
    productName: "Twilight Masquerade Booster Bundle",
    productSlug: "twilight-masquerade-booster-bundle",
    url: "https://www.kmart.com.au/search/?searchTerm=twilight+masquerade",
    targetType: "product" as const
  }
];

type StockStatus = "IN_STOCK" | "OUT_OF_STOCK" | "PREORDER" | "UNKNOWN";

function detectStockStatus(html: string): StockStatus {
  const text = html.toLowerCase();
  if (text.includes("pre-order") || text.includes("preorder")) return "PREORDER";
  if (
    text.includes("out of stock") ||
    text.includes("sold out") ||
    text.includes("currently unavailable")
  ) return "OUT_OF_STOCK";
  if (text.includes("add to cart") || text.includes("add to bag") || text.includes("buy now")) return "IN_STOCK";
  return "UNKNOWN";
}

function extractPrice(html: string): number | null {
  const patterns = [
    /property="product:price:amount"\s+content="([^"]+)"/i,
    /itemprop="price"\s+content="([^"]+)"/i,
    /"price"\s*:\s*"([0-9]+(?:\.[0-9]{1,2})?)"/i,
    /\$\s*([0-9]{1,3}(?:\.[0-9]{2})?)/
  ];
  for (const p of patterns) {
    const match = html.match(p);
    const val = match ? Number(match[1].replace(/,/g, "")) : null;
    if (val && val >= 3 && val <= 2000) return val;
  }
  return null;
}

async function checkUrl(url: string): Promise<{ status: StockStatus; priceAud: number | null }> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: DEFAULT_HEADERS,
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return { status: "UNKNOWN", priceAud: null };
    const html = await response.text();
    return { status: detectStockStatus(html), priceAud: extractPrice(html) };
  } catch {
    return { status: "UNKNOWN", priceAud: null };
  }
}

export type MonitorResult = {
  checked: number;
  newInStock: number;
  notified: number;
  errors: number;
  findings: Array<{ retailer: string; product: string; status: string; priceAud: number | null; wasNew: boolean }>;
};

export async function runFlashMonitor(highAlert = false): Promise<MonitorResult> {
  const result: MonitorResult = { checked: 0, newInStock: 0, notified: 0, errors: 0, findings: [] };

  // In high-alert mode we check everything; normal mode skips low-priority items
  const targets = highAlert
    ? WATCH_LIST
    : WATCH_LIST.filter((t) => t.retailerSlug === "eb-games");

  for (const target of targets) {
    result.checked++;
    const { status, priceAud } = await checkUrl(target.url);

    if (status === "UNKNOWN") {
      result.errors++;
      continue;
    }

    // Check last known status in DB
    const product = await prisma.product.findUnique({ where: { slug: target.productSlug } });
    const wasOutOfStock = product ? !product.inStock : false;
    const isNowInStock = status === "IN_STOCK" || status === "PREORDER";
    const wasNew = wasOutOfStock && isNowInStock;

    result.findings.push({ retailer: target.retailerSlug, product: target.productName, status, priceAud, wasNew });

    if (wasNew) {
      result.newInStock++;

      // Update product status in DB
      if (product) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            inStock: status === "IN_STOCK",
            isPreorder: status === "PREORDER",
            ...(priceAud ? { currentMarketPrice: priceAud } : {})
          }
        });
      }

      // Record trigger for pattern learning
      const trigger = await prisma.flashSaleTrigger.create({
        data: {
          retailerSlug: target.retailerSlug,
          productName: target.productName,
          priceAud: priceAud ?? 0,
          stockStatus: status,
          sourceUrl: target.url
        }
      });

      // Update pattern confidence
      await recordConfirmedDrop(target.retailerSlug, new Date());

      // Send Telegram notification
      const notified = await sendFlashAlert({
        retailer: target.retailerSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        productName: target.productName,
        priceAud: priceAud ?? 0,
        url: target.url
      });

      if (notified) {
        result.notified++;
        await prisma.flashSaleTrigger.update({
          where: { id: trigger.id },
          data: { notifiedAt: new Date() }
        });
      }
    }
  }

  return result;
}

// Adds a new product to the watch list at runtime (persisted in DB)
// For now the watch list is static — future: make it DB-driven
export function getWatchList() {
  return WATCH_LIST;
}
