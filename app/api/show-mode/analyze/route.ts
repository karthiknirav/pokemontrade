import { getSession } from "@/lib/auth/token";
import { apiError, apiOk } from "@/lib/api";
import { analyzeShowLot } from "@/lib/services/show-mode";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const body = (await request.json()) as {
    entries?: Array<{ label: string; askingPriceAud?: number | null }>;
    totalAskingPriceAud?: number | null;
    useCached?: boolean;
  };

  if (!body.entries?.length) {
    return apiError("At least one entry is required.");
  }

  return apiOk(await analyzeShowLot({ entries: body.entries, totalAskingPriceAud: body.totalAskingPriceAud, useCached: body.useCached ?? false }));
}
