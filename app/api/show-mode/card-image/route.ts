import { apiError, apiOk } from "@/lib/api";

// Module-level cache so Railway instances don't re-fetch the same set codes
const setIdCache = new Map<string, string>();

async function resolveSetId(ptcgoCode: string): Promise<string | null> {
  if (setIdCache.has(ptcgoCode)) return setIdCache.get(ptcgoCode)!;
  try {
    const res = await fetch(
      `https://api.pokemontcg.io/v2/sets?q=ptcgoCode:${encodeURIComponent(ptcgoCode)}&select=id,ptcgoCode`,
      { headers: { "user-agent": "pokemon-profit-intelligence-au/1.0" } }
    );
    const data = await res.json();
    const id: string | null = data.data?.[0]?.id ?? null;
    if (id) setIdCache.set(ptcgoCode, id);
    return id;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const setCode = searchParams.get("setCode")?.trim();
  const number = searchParams.get("number")?.trim();

  if (!setCode || !number) return apiError("setCode and number are required");

  const setId = await resolveSetId(setCode);
  if (!setId) return apiOk({ imageUrl: null });

  const num = number.split("/")[0];
  return apiOk({ imageUrl: `https://images.pokemontcg.io/${setId}/${num}.png` });
}
