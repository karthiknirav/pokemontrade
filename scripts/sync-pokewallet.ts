import { prisma } from "@/lib/db";
import { syncPokewalletCardSnapshots } from "@/lib/services/pokewallet";

async function main() {
  const modeArg = (process.argv[2] ?? "").toLowerCase();
  const rolling = modeArg === "rolling";
  const limitArg = Number(rolling ? process.argv[3] ?? "60" : process.argv[2] ?? "150");
  const offsetArg = Number(rolling ? "0" : process.argv[3] ?? "0");
  const intervalArg = Number(rolling ? process.argv[4] ?? "20" : process.argv[4] ?? "20");
  const limit = Number.isFinite(limitArg) ? limitArg : 150;
  const offset = Number.isFinite(offsetArg) ? offsetArg : 0;
  const intervalMinutes = Number.isFinite(intervalArg) ? intervalArg : 20;

  const result = await syncPokewalletCardSnapshots(
    rolling
      ? {
          rolling: {
            enabled: true,
            batchSize: limit,
            intervalMinutes
          }
        }
      : { limit, offset }
  );
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
