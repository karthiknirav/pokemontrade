import { getSession } from "@/lib/auth/token";
import { apiError, apiOk } from "@/lib/api";
import { searchCardVariants } from "@/lib/services/pokewallet";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return apiError("q is required");

  try {
    const variants = await searchCardVariants(q);
    return apiOk({ data: variants });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Search failed", 500);
  }
}
