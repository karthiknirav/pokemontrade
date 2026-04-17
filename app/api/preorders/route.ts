import { apiOk } from "@/lib/api";
import { getPreorderProducts } from "@/lib/services/products";

export async function GET() {
  return apiOk(await getPreorderProducts());
}
