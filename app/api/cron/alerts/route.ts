import { evaluateAlerts } from "@/lib/alerts/engine";
import { apiError, apiOk } from "@/lib/api";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return apiError("Unauthorized", 401);
  }

  return apiOk(await evaluateAlerts());
}
