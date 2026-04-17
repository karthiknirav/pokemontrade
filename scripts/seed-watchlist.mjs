import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
config({ path: ".env" });

const prisma = new PrismaClient();
const key = process.env.POKEWALLET_API_KEY;
const base = process.env.POKEWALLET_BASE_URL || "https://api.pokewallet.io";
const rate = 1.53;

async function search(q, limit = 50) {
  const r = await fetch(`${base}/search?q=${encodeURIComponent(q)}&limit=${limit}`, {
    headers: { "X-API-Key": key, "user-agent": "pokemon-profit-intelligence-au/1.0" }
  });
  const d = await r.json();
  return (d.results || [])
    .map((c) => {
      const prices = c.tcgplayer?.prices || [];
      const usd =
        prices.find((p) => p.market_price >= 0.5)?.market_price ||
        prices.find((p) => p.mid_price >= 0.5)?.mid_price ||
        null;
      const setId = c.card_info?.set_id || null;
      const num = c.card_info?.card_number || null;
      const imgNum = num?.split("/")[0];
      const imageUrl = setId && imgNum ? `https://images.pokemontcg.io/${setId}/${imgNum}.png` : null;
      return {
        id: c.id,
        name: c.card_info?.clean_name || c.card_info?.name,
        set: c.card_info?.set_name || "",
        num,
        setId,
        url: c.tcgplayer?.url || null,
        imageUrl,
        usd,
        aud: usd ? Number((usd * rate).toFixed(2)) : null
      };
    })
    .filter((c) => c.usd && c.usd >= 0.5 && c.num && /\d+\/\d+/.test(c.num));
}

// Each entry can have multiple queries — results are merged and deduped before taking top 50
const SETS = [
  { category: "Ascended Heroes",     queries: ["ME Ascended Heroes"] },
  { category: "Chaos Rising",         queries: ["Black Bolt", "White Flare"] },
  { category: "Mega Evolution (XY)",  queries: ["XY Evolutions", "XY Roaring Skies", "XY Primal Clash", "XY Phantom Forces", "XY BREAKthrough", "XY Ancient Origins"] },
  { category: "Scarlet & Violet",     queries: ["Scarlet Violet Base Set"] },
  { category: "Prismatic Evolutions", queries: ["Prismatic Evolutions"] },
  { category: "Surging Sparks",       queries: ["Surging Sparks"] },
  { category: "Stellar Crown",        queries: ["Stellar Crown"] },
  { category: "Temporal Forces",      queries: ["Temporal Forces"] },
  { category: "Obsidian Flames",      queries: ["Obsidian Flames"] },
  { category: "Hidden Fates",         queries: ["Hidden Fates"] },
  { category: "Sun & Moon",           queries: ["Sun Moon", "Burning Shadows", "Guardians Rising", "Forbidden Light"] },
  { category: "Black & White",        queries: ["Black White", "Next Destinies", "Dark Explorers", "Legendary Treasures"] },
];

async function run() {
  await prisma.watchlistItem.deleteMany({});
  console.log("Cleared existing watchlist\n");

  let totalSeeded = 0;

  for (const s of SETS) {
    const all = await Promise.all(s.queries.map((q) => search(q, 50)));
    const seen = new Set();
    const merged = all
      .flat()
      .filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      })
      .sort((a, b) => b.usd - a.usd)
      .slice(0, 50);

    console.log(`${s.category}: ${merged.length} cards`);

    for (const [i, c] of merged.entries()) {
      await prisma.watchlistItem.upsert({
        where: { pokewalletId: c.id },
        create: {
          name: c.name || "Unknown",
          setName: c.set,
          cardNumber: c.num,
          setId: c.setId,
          pokewalletId: c.id,
          priceUsd: c.usd,
          priceAud: c.aud,
          setCategory: s.category,
          rank: i + 1,
          imageUrl: c.imageUrl,
          tcgplayerUrl: c.url
        },
        update: {
          name: c.name || "Unknown",
          setName: c.set,
          priceUsd: c.usd,
          priceAud: c.aud,
          setCategory: s.category,
          rank: i + 1,
          imageUrl: c.imageUrl
        }
      });
      totalSeeded++;
    }
  }

  console.log(`\nDone! Total seeded: ${totalSeeded}`);
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
