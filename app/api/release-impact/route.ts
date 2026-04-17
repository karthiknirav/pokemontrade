import { getSession } from "@/lib/auth/token";
import { apiError, apiOk } from "@/lib/api";
import { getReleaseImpactReport, getReleaseImpactSummary } from "@/lib/services/release-impact";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const report = await getReleaseImpactReport(Number.isFinite(limit) ? { limit } : undefined);

  return apiOk({
    summary: getReleaseImpactSummary(report),
    report
  });
}
