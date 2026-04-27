import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY manquante dans .env.local. Récupère-la sur https://console.anthropic.com/settings/keys",
    );
  }
  cached = new Anthropic({ apiKey });
  return cached;
}

export const AI_MODEL = "claude-haiku-4-5-20251001";
