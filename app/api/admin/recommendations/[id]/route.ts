import { getSession } from "@/lib/auth/token";
import { apiError, apiOk } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const { id } = await params;
  const body = (await request.json()) as Partial<{
    buyScore: number;
    flipScore: number;
    longTermHoldScore: number;
    ripScore: number;
    riskScore: number;
    summary: string;
    reasoning: string;
    action: "BUY" | "MAYBE" | "PASS" | "RIP" | "HOLD_SEALED" | "BUY_SINGLES_INSTEAD";
  }>;

  const existing = await prisma.recommendation.findUnique({ where: { id } });
  if (!existing) return apiError("Recommendation not found.", 404);

  const updated = await prisma.recommendation.update({
    where: { id },
    data: {
      buyScore: body.buyScore ?? existing.buyScore,
      flipScore: body.flipScore ?? existing.flipScore,
      longTermHoldScore: body.longTermHoldScore ?? existing.longTermHoldScore,
      ripScore: body.ripScore ?? existing.ripScore,
      riskScore: body.riskScore ?? existing.riskScore,
      summary: body.summary ?? existing.summary,
      reasoning: body.reasoning ?? existing.reasoning,
      action: body.action ?? existing.action
    }
  });

  return apiOk(updated);
}
