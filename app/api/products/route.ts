import { apiOk } from "@/lib/api";
import { attachMarketIntelligenceList } from "@/lib/services/market-payload";
import { getProducts } from "@/lib/services/products";

export async function GET() {
  return apiOk(attachMarketIntelligenceList(await getProducts()));
}
