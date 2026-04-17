// ---------------------------------------------------------------------------
// Telegram push notifier
// Setup:
//   1. Message @BotFather on Telegram → /newbot → get TELEGRAM_BOT_TOKEN
//   2. Start a chat with your new bot
//   3. Visit https://api.telegram.org/bot<TOKEN>/getUpdates → grab "chat.id"
//   4. Add to .env:
//        TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
//        TELEGRAM_CHAT_ID=987654321
// ---------------------------------------------------------------------------

const TELEGRAM_API = "https://api.telegram.org";

export type NotifyPayload = {
  title: string;
  body: string;
  url?: string;
  urgency?: "high" | "normal";
};

export async function sendTelegram(payload: NotifyPayload): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[notifier] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping notification");
    return false;
  }

  const icon = payload.urgency === "high" ? "🚨" : "📦";
  const lines = [
    `${icon} *${escapeMarkdown(payload.title)}*`,
    escapeMarkdown(payload.body),
    payload.url ? `[View →](${payload.url})` : null
  ].filter(Boolean).join("\n");

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines,
        parse_mode: "Markdown",
        disable_web_page_preview: false
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[notifier] Telegram error:", response.status, err);
      return false;
    }

    console.log("[notifier] Telegram sent:", payload.title);
    return true;
  } catch (error) {
    console.error("[notifier] Telegram fetch failed:", error);
    return false;
  }
}

// Pre-alert: warns you 5 minutes before a predicted drop window
export async function sendPreAlert(source: string, windowHourAest: number, confidencePct: number) {
  const hour12 = windowHourAest % 12 || 12;
  const ampm = windowHourAest >= 12 ? "PM" : "AM";
  return sendTelegram({
    title: `Sale window in 5 min — ${source.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`,
    body: `Predicted drop at ${hour12}:00 ${ampm} AEST (${confidencePct}% confidence)\nHigh-alert polling starting now.`,
    urgency: "normal"
  });
}

// Flash sale detected — in-stock item found
export async function sendFlashAlert(params: {
  retailer: string;
  productName: string;
  priceAud: number;
  url: string;
}) {
  return sendTelegram({
    title: `IN STOCK: ${params.productName}`,
    body: `${params.retailer} → A$${params.priceAud.toFixed(2)}\nMove fast — flash sales sell out in minutes.`,
    url: params.url,
    urgency: "high"
  });
}

// Daily digest of upcoming windows
export async function sendDailyDigest(windows: Array<{ source: string; hourAest: number; confidencePct: number }>) {
  if (windows.length === 0) return false;
  const lines = windows.map((w) => {
    const hour12 = w.hourAest % 12 || 12;
    const ampm = w.hourAest >= 12 ? "PM" : "AM";
    return `• ${w.source.replace(/-/g, " ")} @ ${hour12}:00 ${ampm} AEST (${w.confidencePct}% confidence)`;
  });
  return sendTelegram({
    title: "Today's predicted sale windows",
    body: lines.join("\n"),
    urgency: "normal"
  });
}

function escapeMarkdown(text: string) {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (c) => `\\${c}`);
}
