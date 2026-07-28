import Anthropic from "@anthropic-ai/sdk";

/**
 * Model IDs, confirmed against https://platform.claude.com/docs (2026-07):
 * - claude-sonnet-5 superseded claude-sonnet-4-6 as the current recommended
 *   Sonnet ("the best combination of speed and intelligence").
 * - claude-haiku-4-5 is the current recommended Haiku (alias of
 *   claude-haiku-4-5-20251001) — used for the cheap distress pre-check.
 */
export const GENERATION_MODEL = "claude-sonnet-5";
export const DISTRESS_MODEL = "claude-haiku-4-5";

let client: Anthropic | null = null;

/**
 * Server-only singleton. ANTHROPIC_API_KEY is read from server env at request
 * time and never reaches the client bundle — this module must only be
 * imported from server code (the API route).
 */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set (see .env.example)");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}
