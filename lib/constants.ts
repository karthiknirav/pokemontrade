export const POPULAR_POKEMON = [
  // Tier 1 — highest demand, most liquid AU market
  "Charizard", "Pikachu", "Mewtwo", "Mew", "Gengar", "Umbreon", "Eevee",
  // Tier 2 — strong AU demand, affordable range
  "Venusaur", "Blastoise", "Vaporeon", "Espeon", "Sylveon", "Jolteon",
  "Flareon", "Glaceon", "Leafeon",
  // Tier 3 — popular but secondary
  "Dragonite", "Tyranitar", "Lucario", "Gardevoir", "Mimikyu", "Ursaluna"
];

// Budget tiers for scoring
export const BUDGET_TIERS = {
  CHEAP:    { max: 25,  label: "Budget buy"    },
  MID:      { max: 75,  label: "Mid-range"     },
  PREMIUM:  { max: 150, label: "Premium"       },
  STRETCH:  { max: 300, label: "Stretch buy"   },
  OUTOFREACH: { max: Infinity, label: "Out of reach" }
} as const;

export const AU_RETAILERS = [
  "EB Games",
  "JB Hi-Fi",
  "BIG W",
  "Target",
  "Kmart",
  "Gameology",
  "Cherry Collectables"
];
