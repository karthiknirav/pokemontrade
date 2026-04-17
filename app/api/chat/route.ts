import { getSession } from "@/lib/auth/token";
import { apiError, apiOk } from "@/lib/api";
import { getLivePartnerReply } from "@/lib/services/llm";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const body = (await request.json()) as { message?: string; previousResponseId?: string | null };
  if (!body.message?.trim()) return apiError("Message is required.");

  try {
    return apiOk(await getLivePartnerReply({ userId: session.userId, message: body.message, previousResponseId: body.previousResponseId }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    return apiError(message, 500);
  }
}
