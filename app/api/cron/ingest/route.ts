import { apiError, apiOk } from "@/lib/api";
import { runIngestion } from "@/lib/ingest/service";
import { syncPokewalletCardSnapshots } from "@/lib/services/pokewallet";
import { runRetailerIngestion } from "@/lib/services/retailers";

type Scope = "providers" | "retailers" | "pokewallet" | "all";

function parseScope(value: string | null): Scope {
  if (value === "providers" || value === "retailers" || value === "pokewallet" || value === "all") return value;
  return "all";
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") ?? undefined;
  const scope = parseScope(url.searchParams.get("scope"));
  const pokewalletBatch = Number(url.searchParams.get("pokewalletBatch") ?? "");
  const pokewalletInterval = Number(url.searchParams.get("pokewalletIntervalMinutes") ?? "");

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return apiError("Unauthorized", 401);
  }

  const [providerRuns, retailerRun, pokewalletRun] = await Promise.all([
    scope === "retailers" || scope === "pokewallet" ? Promise.resolve([]) : runIngestion(provider),
    scope === "providers" || scope === "pokewallet" ? Promise.resolve(null) : runRetailerIngestion(),
    scope === "retailers"
      ? Promise.resolve(null)
      : syncPokewalletCardSnapshots({
          rolling: {
            enabled: true,
            batchSize: Number.isFinite(pokewalletBatch) && pokewalletBatch > 0 ? pokewalletBatch : undefined,
            intervalMinutes: Number.isFinite(pokewalletInterval) && pokewalletInterval > 0 ? pokewalletInterval : undefined
          }
        })
  ]);

  return apiOk({
    scope,
    providerRuns,
    retailerRun,
    pokewalletRun
  });
}
