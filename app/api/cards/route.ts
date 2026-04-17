import { apiOk } from "@/lib/api";
import { attachMarketIntelligenceList } from "@/lib/services/market-payload";
import { getCards } from "@/lib/services/products";

export async function GET() {
  return apiOk(attachMarketIntelligenceList(await getCards()));
}
