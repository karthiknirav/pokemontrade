import { getSession } from "@/lib/auth/token";
import { apiError, apiOk } from "@/lib/api";
import { getRecentChatMessages, getStrategyProfile, saveStrategyProfile } from "@/lib/services/chat-memory";

export async function GET() {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const [profile, messages] = await Promise.all([
    getStrategyProfile(session.userId),
    getRecentChatMessages(session.userId, 12)
  ]);

  return apiOk({ profile, messages });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const body = (await request.json()) as {
    goals?: string;
    preferences?: string;
    notes?: string;
  };

  return apiOk({
    profile: await saveStrategyProfile(session.userId, {
      goals: body.goals,
      preferences: body.preferences,
      notes: body.notes
    })
  });
}
