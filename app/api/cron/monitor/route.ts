// ---------------------------------------------------------------------------
// Flash sale monitor cron endpoint
//
// Recommended schedule (Windows Task Scheduler or Vercel Cron):
//   Every 5 minutes:  GET /api/cron/monitor
//   The endpoint self-determines whether to run in high-alert or normal mode
//   based on predicted sale windows.
//
// Secure with CRON_SECRET header:
//   Authorization: Bearer <CRON_SECRET>
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { isHighAlertWindow, seedPatternsIfEmpty, getUpcomingWindows } from "@/lib/services/pattern-engine";
import { runFlashMonitor } from "@/lib/services/flash-monitor";
import { sendPreAlert, sendDailyDigest } from "@/lib/services/notifier";
import { apiError, apiOk } from "@/lib/api";

// How many minutes before a predicted window to enter high-alert mode
const PRE_ALERT_MINUTES = 10;

// Send a daily digest at 8AM AEST (hour 8 AEST = UTC 22 previous day)
function isMorningDigestTime(): boolean {
  const utcHour = new Date().getUTCHours();
  const utcMinute = new Date().getUTCMinutes();
  // 8AM AEST = 22:00 UTC previous day
  return utcHour === 22 && utcMinute < 10;
}

export async function GET(request: Request) {
  // Auth check
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return apiError("Unauthorized", 401);
    }
  }

  // Ensure base patterns exist
  await seedPatternsIfEmpty();

  // Check if we are in or near a predicted sale window
  const { active: highAlert, windows: activeWindows } = await isHighAlertWindow(PRE_ALERT_MINUTES);

  // Send pre-alert notifications for windows just entering high-alert zone
  for (const window of activeWindows) {
    if (window.minutesUntil >= PRE_ALERT_MINUTES - 2 && window.minutesUntil <= PRE_ALERT_MINUTES) {
      await sendPreAlert(window.source, window.hourAest, window.confidencePct);
    }
  }

  // Morning digest — upcoming windows for today
  if (isMorningDigestTime()) {
    const todayWindows = await getUpcomingWindows(16, 35);
    if (todayWindows.length > 0) {
      await sendDailyDigest(todayWindows);
    }
  }

  // Run the monitor
  const monitorResult = await runFlashMonitor(highAlert);

  return apiOk({
    mode: highAlert ? "high-alert" : "normal",
    activeWindows,
    monitor: monitorResult,
    timestamp: new Date().toISOString()
  });
}
