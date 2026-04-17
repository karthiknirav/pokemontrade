import { apiError, apiOk } from "@/lib/api";
import { attachMarketIntelligence } from "@/lib/services/market-payload";
import { getCardBySlug } from "@/lib/services/products";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await getCardBySlug(slug);
  if (!card) return apiError("Card not found.", 404);
  return apiOk(attachMarketIntelligence(card));
}
