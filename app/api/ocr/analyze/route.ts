import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/auth/token";
import { apiError, apiOk } from "@/lib/api";

function extractJsonBlock(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as {
      summary?: string;
      entries?: Array<{ label?: string; priceAud?: number | null }>;
    };
  } catch {
    return null;
  }
}

function toShowModeLine(entry: { label?: string; priceAud?: number | null }) {
  const label = entry.label?.trim();
  if (!label) return null;
  return entry.priceAud === null || entry.priceAud === undefined ? label : `${label},${entry.priceAud}`;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const formData = await request.formData();
  const image = formData.get("image");
  if (!(image instanceof File)) {
    return apiError("Image file is required.");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const summary = `Received ${image.name}. Add ANTHROPIC_API_KEY to .env to enable card scanning.`;
    return apiOk({ summary, entries: [], showModeLines: [] });
  }

  const buffer = Buffer.from(await image.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = (image.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType, data: base64 }
          },
          {
            type: "text",
            text: 'Read this Pokemon TCG show-floor image and extract up to 15 visible card or product names with any visible asking price in AUD. Return strict JSON only: {"summary":"...","entries":[{"label":"...","priceAud":123.45}]}. If no price is visible, set priceAud to null.'
          }
        ]
      }
    ]
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  const parsed = extractJsonBlock(text);
  const entries = (parsed?.entries ?? [])
    .map((entry) => ({
      label: entry.label?.trim() ?? "",
      priceAud: typeof entry.priceAud === "number" && Number.isFinite(entry.priceAud) ? Number(entry.priceAud.toFixed(2)) : null
    }))
    .filter((entry) => entry.label);

  const showModeLines = entries.map(toShowModeLine).filter((line): line is string => Boolean(line));

  return apiOk({
    summary: parsed?.summary ?? `Analyzed ${image.name}. Review the extracted rows before using them in show mode.`,
    entries,
    showModeLines
  });
}
