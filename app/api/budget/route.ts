import { getSession } from "@/lib/auth/token";
import { apiError, apiOk } from "@/lib/api";
import { getBudgetRecommendation } from "@/lib/services/budget";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const budgetAud = Number(searchParams.get("budget") ?? 300);
  const strategy = searchParams.get("strategy") ?? "AUTO";

  return apiOk(await getBudgetRecommendation({ budgetAud, strategy }));
}
