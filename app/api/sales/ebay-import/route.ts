import { getSession } from "@/lib/auth/token";
import { apiError, apiOk } from "@/lib/api";
import { importEbaySoldComps } from "@/lib/services/ebay";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const body = (await request.json()) as {
    targetType?: "product" | "card";
    slug?: string;
    query?: string;
    limit?: number;
  };

  if (!body.targetType || !body.slug) {
    return apiError("targetType and slug are required.");
  }

  return apiOk(
    await importEbaySoldComps({
      targetType: body.targetType,
      slug: body.slug,
      query: body.query,
      limit: body.limit
    })
  );
}
