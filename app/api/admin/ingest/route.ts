import { getSession } from "@/lib/auth/token";
import { apiError, apiOk } from "@/lib/api";
import { runIngestion } from "@/lib/ingest/service";
import { syncPokewalletCardSnapshots } from "@/lib/services/pokewallet";
import { runRetailerIngestion } from "@/lib/services/retailers";

type Scope = "providers" | "retailers" | "pokewallet" | "all";

function parseScope(value?: string | null): Scope {
  if (value === "providers" || value === "retailers" || value === "pokewallet" || value === "all") return value;
  return "all";
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const body = (await request.json().catch(() => ({}))) as {
    provider?: string;
    scope?: Scope;
    pokewalletRolling?: boolean;
    pokewalletBatch?: number;
    pokewalletIntervalMinutes?: number;
  };
  const scope = parseScope(body.scope);
  const [providerRuns, retailerRun, pokewalletRun] = await Promise.all([
    scope === "retailers" || scope === "pokewallet" ? Promise.resolve([]) : runIngestion(body.provider),
    scope === "providers" || scope === "pokewallet" ? Promise.resolve(null) : runRetailerIngestion(),
    scope === "retailers"
      ? Promise.resolve(null)
      : syncPokewalletCardSnapshots({
          rolling: {
            enabled: body.pokewalletRolling ?? (scope === "all" || scope === "pokewallet"),
            batchSize: body.pokewalletBatch,
            intervalMinutes: body.pokewalletIntervalMinutes
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
