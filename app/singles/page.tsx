import { AppShell } from "@/components/app-shell";
import { ProductTable } from "@/components/product-table";
import { requireSession } from "@/lib/auth/guard";
import { getMarketIntelligenceForItem } from "@/lib/services/market-intelligence";
import { applyRecommendationGuardrails } from "@/lib/services/recommendation-guardrails";
import { getCards } from "@/lib/services/products";

export default async function SinglesPage() {
  await requireSession();
  const cards = await getCards();

  return (
    <AppShell
      title="Singles"
      subtitle="Focus on the individual cards with the best grade spread, liquidity, and AUD resale setup."
    >
      <ProductTable
        rows={cards.map((card) => {
          const intelligence = getMarketIntelligenceForItem(card);
          const guarded = applyRecommendationGuardrails(
            {
              action: card.recommendations[0]?.action,
              summary: card.recommendations[0]?.summary,
              reasoning: card.recommendations[0]?.reasoning,
              buyUnderPriceAud: Number(card.recommendations[0]?.buyUnderPriceAud ?? card.currentMarketPrice)
            },
            intelligence
          );
          return {
            name: `${card.name} ${card.number}`,
            slug: card.slug,
            setName: card.set.name,
            marketPrice: Number(card.currentMarketPrice),
            buyUnder: Number(guarded.buyUnderPriceAud ?? card.currentMarketPrice),
            marketGuardrail: intelligence.marketGuardrail,
            recommendation: {
              action: guarded.action,
              summary: guarded.summary
            },
            hrefBase: "/cards" as const
          };
        })}
      />
    </AppShell>
  );
}
