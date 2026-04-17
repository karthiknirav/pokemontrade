# Pokemon Profit Intelligence AU

Australia-first Pokemon TCG profit intelligence MVP built with Next.js, Prisma, MySQL, Tailwind CSS, and Recharts.

## Stack

- Next.js App Router + TypeScript
- Prisma ORM + MySQL
- Tailwind CSS
- Recharts
- Simple JWT email/password auth
- Modular retailer adapters and alert engine

## Folder Structure

```text
app/
  api/
  alerts/
  admin/
  cards/[slug]/
  dashboard/
  login/
  portfolio/
  products/[slug]/
  products/
  retailers/
  signup/
  singles/
components/
lib/
  auth/
  data/
  scoring/
  services/
  retailers/
  validations/
prisma/
```

## Setup

1. Install dependencies with `npm install`.
2. Create a local MySQL database named `pokemon_profit_intel`.
3. Copy `.env.example` to `.env` and confirm `DATABASE_URL`.
4. Run `npx prisma generate`.
5. Run `npx prisma migrate dev --name init`.
6. Seed the database with `npm run db:seed`.
7. Start the app with `npm run dev`.
8. Refresh providers with `npm run db:ingest`.
9. Run full refresh (providers + retailers) with `npm run db:refresh`.
10. Optional: add `EBAY_APP_ID` if you want direct eBay sold-comps imports.
11. Optional: add `POKEWALLET_API_KEY` and sync card-market snapshots with `npm run db:pokewallet -- 150 0`.
12. Rolling sync mode (recommended for large collections): `npm run db:pokewallet:rolling -- 60 20` (`batchSize`, `intervalMinutes`).

## Windows Dev Server Troubleshooting

If `npm run dev` fails on Windows, try these in order:

1. Confirm Node and npm are available:
   - `node -v`
   - `npm -v`
2. Start the app with the direct Next.js entry:
   - `npm run dev`
3. If you want the original script path for comparison:
   - `npm run dev:next`
4. Try calling Next directly:
   - `npx next dev`
5. Remove the build cache and retry:
   - `Remove-Item -Recurse -Force .next`
   - `npm run dev`

If you still see `spawn EPERM` on your own machine, it is usually caused by Windows security software, antivirus, Controlled Folder Access, or a terminal/session policy blocking child processes rather than an application code issue.

## Notes

- The Prisma datasource is configured for MySQL using the local `root` / `root` flow you provided.
- Recommended local database URL: `mysql://root:root@localhost:3306/pokemon_profit_intel`
- V1 now includes source providers, source links, ingest runs, listing snapshots, and recent sales tables.
- Run the protected ingestion endpoint at `/api/cron/ingest` or use `npm run db:ingest` locally.
- Retailer ingestion now supports live adapter fetches for EB Games, Kmart, and Coles with resilient fallback rows when upstream pages are unavailable.
- Cron ingestion supports scopes:
  - `/api/cron/ingest?scope=all` (default)
  - `/api/cron/ingest?scope=providers`
  - `/api/cron/ingest?scope=retailers`
  - `/api/cron/ingest?scope=pokewallet`
  - Optional rolling overrides: `pokewalletBatch` and `pokewalletIntervalMinutes`
- Current tracked AU source set now includes `EB Games`, `JB Hi-Fi`, `BIG W`, `Kmart`, `Coles`, `Toyworld`, and `Gameology`, with room to add more providers modularly.
- Pokewallet sync persists fetched card prices as listing snapshots and price history rows so the UI can read DB-first instead of live API calls.
- Rolling Pokewallet mode auto-rotates card windows by time slot (`windowIndex = floor(now/interval) % totalWindows`) so large collections stay fresh without manual offset tracking.
- Additional power-user flows now include:
  - `Show Mode` for batch lot analysis
  - `Market Impact` reporting plus sold-comps import
  - `Partner` chat page with optional OpenAI integration and live market context
- OCR upload flow for scan-based workflows when `OPENAI_API_KEY` is configured
- OCR upload now supports one-click handoff into Show Mode input rows
- eBay sold comps can now be imported from the UI or CLI with `npm run db:ebay -- card umbreon-ex-161-131`.
- Listing guardrails now penalize placeholder, stale, search-result, and soft-stock rows before they can anchor market price or provider health.
- Sold-comps import accepts CSV or JSON so recent eBay / marketplace comps can replace stale seeded history quickly.
