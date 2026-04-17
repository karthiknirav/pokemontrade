import { prisma } from "@/lib/db";
import { importEbaySoldComps } from "@/lib/services/ebay";

async function main() {
  const targetType = process.argv[2] as "product" | "card" | undefined;
  const slug = process.argv[3];
  const query = process.argv[4];

  if (!targetType || !slug) {
    throw new Error("Usage: tsx scripts/import-ebay-sales.ts <product|card> <slug> [query]");
  }

  const result = await importEbaySoldComps({
    targetType,
    slug,
    query
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
