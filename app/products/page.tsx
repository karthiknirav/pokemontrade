import { AppShell } from "@/components/app-shell";
import { ProductTable } from "@/components/product-table";
import { requireSession } from "@/lib/auth/guard";
import { getMarketIntelligenceForItem } from "@/lib/services/market-intelligence";
import { applyRecommendationGuardrails } from "@/lib/services/recommendation-guardrails";
import { getProducts } from "@/lib/services/products";

export default async function ProductsPage() {
  await requireSession();
  const products = await getProducts();

  return (
    <AppShell
      title="Products"
      subtitle="Compare sealed products by AUD market price, buy-under line, and transparent recommendation logic."
    >
      <ProductTable
        rows={products.map((product) => {
          const intelligence = getMarketIntelligenceForItem(product);
          const guarded = applyRecommendationGuardrails(
            {
              action: product.recommendations[0]?.action,
              summary: product.recommendations[0]?.summary,
              reasoning: product.recommendations[0]?.reasoning,
              buyUnderPriceAud: Number(product.recommendations[0]?.buyUnderPriceAud ?? product.currentMarketPrice)
            },
            intelligence
          );
          return {
            name: product.name,
            slug: product.slug,
            setName: product.set?.name ?? "Standalone",
            marketPrice: Number(product.currentMarketPrice),
            buyUnder: Number(guarded.buyUnderPriceAud ?? product.currentMarketPrice),
            marketGuardrail: intelligence.marketGuardrail,
            recommendation: {
              action: guarded.action,
              summary: guarded.summary
            },
            hrefBase: "/products" as const
          };
        })}
      />
    </AppShell>
  );
}
