import { getSession } from "@/lib/auth/token";
import { apiError, apiOk } from "@/lib/api";
import { importSalesRecords } from "@/lib/services/sales-import";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const body = (await request.json()) as {
    providerSlug?: string;
    targetType?: "product" | "card";
    slug?: string;
    format?: "auto" | "csv" | "json";
    raw?: string;
  };

  if (!body.targetType || !body.slug || !body.raw) {
    return apiError("targetType, slug, and raw data are required.");
  }

  return apiOk(
    await importSalesRecords({
      providerSlug: body.providerSlug,
      targetType: body.targetType,
      slug: body.slug,
      format: body.format,
      raw: body.raw
    })
  );
}
