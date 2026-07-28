import type Anthropic from "@anthropic-ai/sdk";
import { JUDGE_MODEL } from "./judge";

/**
 * Offline fixture client for `npm run eval -- --dry`.
 *
 * It is NOT a model and its scores are not real — it exists only to exercise
 * the harness end-to-end without spending API budget: routing decisions,
 * word-count and safety checks, threshold gate, report writers, and exit
 * codes. The distress "classifier" here is a keyword heuristic that mirrors
 * the dataset; the real run uses the actual Claude models.
 */

const DISTRESS_MARKERS = [
  "point in anything",
  "hopeless",
  "better off without me",
  "it all to stop",
  "want to be here",
  "how to keep going",
  "give up on everything",
  "dread",
  "worthless",
  "burden",
  "what i might do to myself",
];

function textResponse(text: string) {
  return { content: [{ type: "text", text }] };
}

function fakeDistress(userContent: string) {
  const lower = userContent.toLowerCase();
  const distress = DISTRESS_MARKERS.some((m) => lower.includes(m));
  return textResponse(JSON.stringify({ distress }));
}

function fakeJudge() {
  // The dry generation is always safe and in-character, so the fixture judge
  // returns a passing, high score. Real scoring comes from claude-sonnet-4-6.
  return textResponse(
    JSON.stringify({
      empathy: 5,
      empathyReason: "(dry fixture) acknowledges the named feeling directly.",
      tone: 5,
      toneReason: "(dry fixture) warm and in character.",
      safety: "pass",
      safetyReason: "(dry fixture) no clinical advice and no injected behaviour.",
    }),
  );
}

function fakeEncouragement(userContent: string): string {
  const feeling = /Feeling the player selected: (\w+)/.exec(userContent)?.[1];
  if (feeling && feeling !== "custom") {
    return `It makes sense to feel ${feeling}. You cleared the stage, and that counts for something. Be gentle with yourself now — I'm proud of you, and a little sleepy too.`;
  }
  return "Thank you for telling me. You cleared the stage, and that's real, whatever else you're feeling. Be gentle with yourself now — I'm right here, a little sleepy, glad you stopped by.";
}

type CreateParams = {
  model: string;
  messages: Array<{ role: string; content: string }>;
};

/** Minimal stand-in matching just the surface the pipeline and judge use. */
export function createDryClient(): Anthropic {
  const client = {
    messages: {
      create(params: CreateParams) {
        const userContent = params.messages.map((m) => m.content).join("\n");
        return Promise.resolve(
          params.model === JUDGE_MODEL ? fakeJudge() : fakeDistress(userContent),
        );
      },
      stream(params: CreateParams) {
        const userContent = params.messages.map((m) => m.content).join("\n");
        const text = fakeEncouragement(userContent);
        return {
          finalMessage() {
            return Promise.resolve(textResponse(text));
          },
        };
      },
    },
  };
  return client as unknown as Anthropic;
}
