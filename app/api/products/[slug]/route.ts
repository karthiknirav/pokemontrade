import { apiError, apiOk } from "@/lib/api";
import { attachMarketIntelligence } from "@/lib/services/market-payload";
import { getProductBySlug } from "@/lib/services/products";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return apiError("Product not found.", 404);
  return apiOk(attachMarketIntelligence(product));
}
