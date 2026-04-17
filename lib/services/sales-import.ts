import { prisma } from "@/lib/db";

type ImportRow = {
  title?: string;
  price: number;
  soldAt: string | Date;
  saleUrl?: string;
  condition?: string;
  shippingAud?: number;
};

type ImportInput = {
  providerSlug?: string;
  targetType: "product" | "card";
  slug: string;
  format?: "auto" | "csv" | "json";
  raw: string;
};

function parseCsv(raw: string): ImportRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const body = lines[0]?.toLowerCase().includes("price") ? lines.slice(1) : lines;
  return body.map((line) => {
    const [title, price, soldAt, saleUrl, condition, shippingAud] = line.split(",").map((part) => part?.trim());
    return {
      title,
      price: Number(price?.replace(/[^0-9.-]/g, "")),
      soldAt,
      saleUrl,
      condition,
      shippingAud: shippingAud ? Number(shippingAud.replace(/[^0-9.-]/g, "")) : undefined
    };
  });
}

function parseRows(input: ImportInput) {
  if (input.format === "auto") {
    if (input.raw.trim().startsWith("[") || input.raw.trim().startsWith("{")) {
      return JSON.parse(input.raw) as ImportRow[];
    }
    return parseCsv(input.raw);
  }
  if (input.format === "json") {
    const parsed = JSON.parse(input.raw) as ImportRow[];
    return parsed;
  }
  return parseCsv(input.raw);
}

export async function importSalesRecords(input: ImportInput) {
  const provider = await prisma.sourceProvider.findFirst({
    where: { slug: input.providerSlug ?? "manual-au" }
  });
  if (!provider) {
    throw new Error("Sales provider not configured.");
  }

  const target =
    input.targetType === "product"
      ? await prisma.product.findUnique({ where: { slug: input.slug } })
      : await prisma.card.findUnique({ where: { slug: input.slug } });

  if (!target) {
    throw new Error(`Could not find ${input.targetType} with slug ${input.slug}.`);
  }

  const rows = parseRows(input).filter((row) => Number.isFinite(row.price) && row.soldAt);
  const created = [];
  let skipped = 0;

  for (const row of rows) {
    const soldAt = new Date(row.soldAt);
    const existing = await prisma.salesRecord.findFirst({
      where: {
        providerId: provider.id,
        ...(input.targetType === "product" ? { productId: target.id } : { cardId: target.id }),
        OR: [
          ...(row.saleUrl ? [{ saleUrl: row.saleUrl }] : []),
          {
            sourceTitle: row.title ?? `${target.name} sold comp`,
            soldAt,
            normalizedPriceAud: row.price
          }
        ]
      }
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    created.push(
      await prisma.salesRecord.create({
        data: {
          providerId: provider.id,
          productId: input.targetType === "product" ? target.id : undefined,
          cardId: input.targetType === "card" ? target.id : undefined,
          sourceTitle: row.title ?? `${target.name} sold comp`,
          saleUrl: row.saleUrl,
          normalizedPriceAud: row.price,
          condition: row.condition,
          shippingAud: row.shippingAud,
          soldAt,
          sourceConfidence: provider.providerType === "MANUAL" ? 58 : 72
        }
      })
    );
  }

  return {
    imported: created.length,
    skipped,
    target: target.name
  };
}
