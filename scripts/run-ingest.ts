import { prisma } from "@/lib/db";
import { runIngestion } from "@/lib/ingest/service";
import { syncPokewalletCardSnapshots } from "@/lib/services/pokewallet";
import { runRetailerIngestion } from "@/lib/services/retailers";

async function main() {
  const firstArg = process.argv[2];
  const secondArg = process.argv[3];
  const explicitScope =
    firstArg === "providers" || firstArg === "retailers" || firstArg === "pokewallet" || firstArg === "all" ? firstArg : null;
  const scope = explicitScope ?? "all";
  const providerSlug = explicitScope ? secondArg : firstArg;

  const [providerRuns, retailerRun, pokewalletRun] = await Promise.all([
    scope === "retailers" || scope === "pokewallet" ? Promise.resolve([]) : runIngestion(providerSlug),
    scope === "providers" || scope === "pokewallet" ? Promise.resolve(null) : runRetailerIngestion(),
    scope === "retailers" ? Promise.resolve(null) : syncPokewalletCardSnapshots()
  ]);

  console.log(
    JSON.stringify(
      {
        scope,
        providerRuns,
        retailerRun,
        pokewalletRun
      },
      null,
      2
    )
  );
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
