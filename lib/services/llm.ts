import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { getRecentChatMessages, getStrategyProfile, saveChatMessage } from "@/lib/services/chat-memory";
import { getMarketIntelligenceForItem } from "@/lib/services/market-intelligence";
import { getReleaseImpactReport } from "@/lib/services/release-impact";

type ChatInput = {
  userId: string;
  message: string;
  previousResponseId?: string | null;
};

async function buildLivePartnerContext() {
  const [products, cards, impact] = await Promise.all([
    prisma.product.findMany({
      include: {
        set: true,
        listingSnapshots: { include: { provider: true }, orderBy: { normalizedPriceAud: "asc" } },
        salesRecords: { include: { provider: true }, orderBy: { soldAt: "desc" }, take: 3 }
      },
      take: 5
    }),
    prisma.card.findMany({
      include: {
        set: true,
        listingSnapshots: { include: { provider: true }, orderBy: { normalizedPriceAud: "asc" } },
        salesRecords: { include: { provider: true }, orderBy: { soldAt: "desc" }, take: 3 }
      },
      take: 5
    }),
    getReleaseImpactReport().catch(() => [])
  ]);

  const productLines = products.map((product) => {
    const intelligence = getMarketIntelligenceForItem(product);
    return `${product.name} | market A$${Number(product.currentMarketPrice).toFixed(2)} | ${intelligence.marketGuardrail.label} | bargain A$${intelligence.bargainBuyPrice.toFixed(2)} | confidence ${intelligence.confidence}`;
  });

  const cardLines = cards.map((card) => {
    const intelligence = getMarketIntelligenceForItem(card);
    return `${card.name} ${card.number} | market A$${Number(card.currentMarketPrice).toFixed(2)} | last 3 avg ${intelligence.recentSalesAverage ? `A$${intelligence.recentSalesAverage.toFixed(2)}` : "n/a"} | ${intelligence.marketGuardrail.label}`;
  });

  const impactLines = impact
    .slice(0, 5)
    .map(
      (row) =>
        `${row.name} | ${row.changePct}% tracked move | ${row.impactReason} | suspicious ${row.suspiciousListingCount} | stale ${row.staleListingCount}`
    );

  return [
    "Current app context:",
    "Products:",
    ...productLines,
    "Singles:",
    ...cardLines,
    "Release impact watch:",
    ...impactLines
  ].join("\n");
}

export async function getLivePartnerReply(input: ChatInput) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

  const [marketContext, strategyProfile, recentMessages] = await Promise.all([
    buildLivePartnerContext(),
    getStrategyProfile(input.userId),
    getRecentChatMessages(input.userId, 10)
  ]);

  await saveChatMessage(input.userId, { role: "user", content: input.message });

  if (!apiKey) {
    const fallbackReply =
      "Claude is not configured yet. Add ANTHROPIC_API_KEY to .env to enable the live recommendation partner, then retry.";
    await saveChatMessage(input.userId, { role: "assistant", content: fallbackReply, responseId: null });
    return { configured: false, reply: fallbackReply, responseId: null };
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = [
    "You are a Pokemon TCG profit intelligence partner for Australian buyers.",
    "Prefer concise, tactical advice. Emphasize stock quality, bargain entries, liquidity, and avoid false certainty when supply is weak.",
    "Always mention when a price looks preorder-led, stale, or suspicious.",
    "If the user asks for a buy plan, consider whether one premium card or a spread of cards is better, and explain the tradeoff briefly.",
    "",
    marketContext,
    "",
    "User strategy profile:",
    `Goals: ${strategyProfile.goals || "Not set"}`,
    `Preferences: ${strategyProfile.preferences || "Not set"}`,
    `Notes: ${strategyProfile.notes || "Not set"}`,
    ...(recentMessages.length > 0
      ? ["", "Recent conversation memory:", ...recentMessages.map((m) => `${m.role}: ${m.content}`)]
      : [])
  ].join("\n");

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: input.message }]
  });

  const reply = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim() || "No response returned.";

  await saveChatMessage(input.userId, {
    role: "assistant",
    content: reply,
    responseId: response.id ?? null
  });

  return { configured: true, reply, responseId: response.id ?? null };
}
