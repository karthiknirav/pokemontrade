// ---------------------------------------------------------------------------
// Flash sale pattern engine
// Learns WHEN AU retailers (esp. EB Games) typically drop sales/restocks
// Confirmed drops increase confidence for that day+hour slot
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";

// EB Games historically drops at 12PM AEST Thursday/Friday
// Seed these as starting patterns so the app is useful from day 1
const SEED_PATTERNS: Array<{ source: string; dayOfWeek: number; hourAest: number; confidencePct: number; occurrenceCount: number }> = [
  { source: "eb-games", dayOfWeek: 4, hourAest: 12, confidencePct: 65, occurrenceCount: 3 }, // Thu 12PM
  { source: "eb-games", dayOfWeek: 5, hourAest: 12, confidencePct: 50, occurrenceCount: 2 }, // Fri 12PM
  { source: "eb-games", dayOfWeek: 4, hourAest: 9,  confidencePct: 35, occurrenceCount: 1 }, // Thu 9AM
  { source: "eb-games", dayOfWeek: 1, hourAest: 12, confidencePct: 30, occurrenceCount: 1 }, // Mon 12PM
  { source: "jb-hi-fi", dayOfWeek: 4, hourAest: 10, confidencePct: 40, occurrenceCount: 2 }, // Thu 10AM
  { source: "big-w",    dayOfWeek: 3, hourAest: 8,  confidencePct: 30, occurrenceCount: 1 }, // Wed 8AM
];

// Seed base patterns if table is empty
export async function seedPatternsIfEmpty() {
  const count = await prisma.flashSalePattern.count();
  if (count > 0) return;

  await prisma.flashSalePattern.createMany({
    data: SEED_PATTERNS,
    skipDuplicates: true
  });
  console.log("[pattern-engine] Seeded base patterns");
}

// Record a confirmed sale detection → increases confidence for that slot
export async function recordConfirmedDrop(retailerSlug: string, detectedAt: Date) {
  const aestHour = toAestHour(detectedAt);
  const dayOfWeek = toAestDay(detectedAt);

  const existing = await prisma.flashSalePattern.findUnique({
    where: { source_dayOfWeek_hourAest: { source: retailerSlug, dayOfWeek, hourAest: aestHour } }
  });

  if (existing) {
    // Increase confidence — caps at 92 to avoid false certainty
    const newCount = existing.occurrenceCount + 1;
    const newConfidence = Math.min(92, Math.round(30 + newCount * 12));
    await prisma.flashSalePattern.update({
      where: { id: existing.id },
      data: { occurrenceCount: newCount, confidencePct: newConfidence, lastSeenAt: detectedAt }
    });
  } else {
    await prisma.flashSalePattern.create({
      data: { source: retailerSlug, dayOfWeek, hourAest: aestHour, occurrenceCount: 1, confidencePct: 30, lastSeenAt: detectedAt }
    });
  }
}

export type PredictedWindow = {
  source: string;
  dayOfWeek: number;
  hourAest: number;
  confidencePct: number;
  minutesUntil: number;
};

// Get all high-confidence windows coming up in the next N hours
export async function getUpcomingWindows(withinHours = 24, minConfidence = 28): Promise<PredictedWindow[]> {
  const now = new Date();
  const nowAestHour = toAestHour(now);
  const nowAestDay = toAestDay(now);
  const nowMinutes = now.getUTCMinutes() + nowAestHour * 60 + nowAestDay * 1440;

  const patterns = await prisma.flashSalePattern.findMany({
    where: { confidencePct: { gte: minConfidence } },
    orderBy: { confidencePct: "desc" }
  });

  return patterns
    .map((p) => {
      const windowMinutes = p.hourAest * 60 + p.dayOfWeek * 1440;
      // Calculate minutes until next occurrence (wraps weekly)
      let minutesUntil = windowMinutes - nowMinutes;
      if (minutesUntil < 0) minutesUntil += 7 * 1440; // next week
      return { source: p.source, dayOfWeek: p.dayOfWeek, hourAest: p.hourAest, confidencePct: p.confidencePct, minutesUntil };
    })
    .filter((w) => w.minutesUntil <= withinHours * 60)
    .sort((a, b) => a.minutesUntil - b.minutesUntil);
}

// Is right now inside a high-alert window? (within N minutes of a predicted drop)
export async function isHighAlertWindow(alertMinutesBefore = 10): Promise<{
  active: boolean;
  windows: PredictedWindow[];
}> {
  const windows = await getUpcomingWindows(24, 28);
  const activeWindows = windows.filter((w) => w.minutesUntil <= alertMinutesBefore || w.minutesUntil === 0);
  return { active: activeWindows.length > 0, windows: activeWindows };
}

// All patterns for the UI
export async function getAllPatterns() {
  return prisma.flashSalePattern.findMany({ orderBy: [{ confidencePct: "desc" }, { source: "asc" }] });
}

// Recent confirmed drops
export async function getRecentTriggers(limit = 20) {
  return prisma.flashSaleTrigger.findMany({ orderBy: { detectedAt: "desc" }, take: limit });
}

// ---------------------------------------------------------------------------
// Time helpers — convert UTC to AEST (UTC+10, no DST adjustment for simplicity)
// ---------------------------------------------------------------------------
function toAestHour(date: Date): number {
  return (date.getUTCHours() + 10) % 24;
}

function toAestDay(date: Date): number {
  const aestHour = date.getUTCHours() + 10;
  const dayOffset = aestHour >= 24 ? 1 : 0;
  return (date.getUTCDay() + dayOffset) % 7;
}
