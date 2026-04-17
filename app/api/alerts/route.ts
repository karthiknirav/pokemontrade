import { AlertStatus } from "@prisma/client";

import { getSession } from "@/lib/auth/token";
import { apiError, apiOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getAlerts } from "@/lib/services/alerts";
import { alertSchema } from "@/lib/validations/alert";

export async function GET() {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);
  return apiOk(await getAlerts(session.userId));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const body = await request.json();
  const parsed = alertSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid alert.");

  const alert = await prisma.alert.create({
    data: {
      userId: session.userId,
      productId: parsed.data.productId || null,
      type: parsed.data.type,
      status: AlertStatus.ACTIVE,
      targetPriceAud: parsed.data.targetPriceAud,
      notes: parsed.data.notes
    }
  });

  return apiOk(alert, 201);
}
