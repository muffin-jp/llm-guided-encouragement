import type Anthropic from "@anthropic-ai/sdk";
import { DISTRESS_MODEL, GENERATION_MODEL } from "./anthropic";
import {
  DISTRESS_OUTPUT_SCHEMA,
  DISTRESS_SYSTEM_PROMPT,
} from "./prompts/distress";
import {
  ENCOURAGEMENT_SYSTEM_PROMPT,
  buildEncouragementUserMessage,
} from "./prompts/encouragement";
import { SUPPORT_MESSAGE } from "./supportMessage";
import { sseEvent } from "./sse";
import type { EncourageRequest } from "./validation";

export const FRIENDLY_ERROR_MESSAGE =
  "Mamorin is having a little nap and couldn't hear you just now. Your stage clear still counts — please try again in a moment.";

/**
 * Step 1 of the two-step safety design: classify the input for serious
 * distress before any encouragement is generated.
 *
 * Preset feelings come from our own fixed chip list, so on their own they
 * can't express crisis — the classifier only needs to run when the player
 * wrote free text. That keeps the common path to a single model call.
 *
 * Structured outputs pin the response to {"distress": boolean}; if the reply
 * still fails to parse we err toward distress=true (the support path is the
 * safe failure mode for a wellness product).
 */
export async function classifyDistress(
  client: Anthropic,
  input: EncourageRequest,
): Promise<boolean> {
  const freeText = input.freeText?.trim();
  if (!freeText) return false;

  const response = await client.messages.create({
    model: DISTRESS_MODEL,
    max_tokens: 64,
    system: DISTRESS_SYSTEM_PROMPT,
    output_config: {
      format: {
        type: "json_schema",
        schema: DISTRESS_OUTPUT_SCHEMA,
      },
    },
    messages: [
      {
        role: "user",
        content: `Selected feeling: ${input.feeling}\nPlayer note:\n"""${freeText}"""`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  try {
    const parsed: unknown = JSON.parse(block?.type === "text" ? block.text : "");
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { distress?: unknown }).distress === "boolean"
    ) {
      return (parsed as { distress: boolean }).distress;
    }
  } catch {
    // fall through to the conservative default
  }
  return true;
}

const encoder = new TextEncoder();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface EncourageStreamOptions {
  /** Delay between support-message chunks; 0 in tests. */
  supportChunkDelayMs?: number;
}

/**
 * Builds the SSE response stream for one request. Both paths (generated
 * encouragement and the static support message) use the same event framing —
 * see lib/sse.ts — so clients handle them identically.
 */
export function createEncourageStream(
  input: EncourageRequest,
  client: Anthropic,
  options: EncourageStreamOptions = {},
): ReadableStream<Uint8Array> {
  const { supportChunkDelayMs = 40 } = options;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sseEvent(event, data)));

      try {
        const distress = await classifyDistress(client, input);

        if (distress) {
          // Step 2: fixed, pre-written response — never model-generated.
          // Streamed word by word so the client renders it like any reply.
          emit("meta", { type: "support" });
          for (const word of SUPPORT_MESSAGE.split(/(?<= )/)) {
            emit("token", { text: word });
            if (supportChunkDelayMs > 0) await sleep(supportChunkDelayMs);
          }
        } else {
          emit("meta", { type: "encouragement" });
          const stream = client.messages.stream({
            model: GENERATION_MODEL,
            max_tokens: 200,
            // A 40-word reply needs no extended reasoning; disabling thinking
            // keeps first-token latency low on the post-stage screen.
            thinking: { type: "disabled" },
            output_config: { effort: "low" },
            system: ENCOURAGEMENT_SYSTEM_PROMPT,
            messages: [
              { role: "user", content: buildEncouragementUserMessage(input) },
            ],
          });
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              emit("token", { text: event.delta.text });
            }
          }
        }

        emit("done", {});
      } catch (error) {
        // Never leak a stack trace to the player — log server-side and send
        // a friendly, in-world fallback instead.
        console.error("[/api/encourage]", error);
        emit("error", { message: FRIENDLY_ERROR_MESSAGE });
        emit("done", {});
      } finally {
        controller.close();
      }
    },
  });
}
