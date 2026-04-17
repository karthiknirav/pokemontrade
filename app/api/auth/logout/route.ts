import { clearSessionCookie } from "@/lib/auth/token";
import { apiOk } from "@/lib/api";

export async function POST() {
  await clearSessionCookie();
  return apiOk({ success: true });
}
