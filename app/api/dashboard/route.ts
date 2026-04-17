import { getSession } from "@/lib/auth/token";
import { apiError, apiOk } from "@/lib/api";
import { getDashboardData } from "@/lib/services/dashboard";

export async function GET() {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);
  return apiOk(await getDashboardData(session.userId));
}
