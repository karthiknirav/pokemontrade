import { getSession } from "@/lib/auth/token";
import { apiError, apiOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getPortfolio } from "@/lib/services/portfolio";
import { portfolioItemSchema } from "@/lib/validations/portfolio";

export async function GET() {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);
  return apiOk(await getPortfolio(session.userId));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const body = await request.json();
  const parsed = portfolioItemSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid portfolio item.");

  const item = await prisma.portfolioItem.create({
    data: {
      userId: session.userId,
      productId: parsed.data.productId || null,
      label: parsed.data.label,
      buyPriceAud: parsed.data.buyPriceAud,
      quantity: parsed.data.quantity,
      store: parsed.data.store,
      status: parsed.data.status,
      purchasedAt: new Date(parsed.data.purchasedAt)
    }
  });

  return apiOk(item, 201);
}
