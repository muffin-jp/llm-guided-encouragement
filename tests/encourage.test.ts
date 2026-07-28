import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { FRIENDLY_ERROR_MESSAGE, createEncourageStream } from "@/lib/encourage";
import { SUPPORT_MESSAGE } from "@/lib/supportMessage";
import type { EncourageRequest } from "@/lib/validation";

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

function parseEvents(raw: string): Array<{ event: string; data: unknown }> {
  return raw
    .split("\n\n")
    .filter((frame) => frame.trim())
    .map((frame) => {
      const event = /event: (.*)/.exec(frame)?.[1] ?? "message";
      const data = JSON.parse(/data: (.*)/.exec(frame)?.[1] ?? "{}");
      return { event, data };
    });
}

async function* fakeModelEvents() {
  yield { type: "content_block_start" };
  yield { type: "content_block_delta", delta: { type: "text_delta", text: "Well " } };
  yield { type: "content_block_delta", delta: { type: "text_delta", text: "done." } };
}

const baseInput: EncourageRequest = {
  stageId: "stage-3-2",
  feeling: "tired",
  locale: "en",
};

describe("createEncourageStream routing", () => {
  it("streams the static support message and never calls generation when distress=true", async () => {
    const create = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: '{"distress": true}' }],
    });
    const streamFn = vi.fn();
    const client = { messages: { create, stream: streamFn } } as unknown as Anthropic;

    const input = { ...baseInput, freeText: "I can't keep going" };
    const events = parseEvents(
      await readAll(
        createEncourageStream(input, client, { supportChunkDelayMs: 0 }),
      ),
    );

    expect(events[0]).toEqual({ event: "meta", data: { type: "support" } });
    expect(events.at(-1)).toEqual({ event: "done", data: {} });
    const text = events
      .filter((e) => e.event === "token")
      .map((e) => (e.data as { text: string }).text)
      .join("");
    expect(text).toBe(SUPPORT_MESSAGE);
    expect(streamFn).not.toHaveBeenCalled();
  });

  it("streams model tokens when distress=false", async () => {
    const create = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: '{"distress": false}' }],
    });
    const streamFn = vi.fn().mockReturnValue(fakeModelEvents());
    const client = { messages: { create, stream: streamFn } } as unknown as Anthropic;

    const input = { ...baseInput, freeText: "that took forever" };
    const events = parseEvents(
      await readAll(createEncourageStream(input, client)),
    );

    expect(events[0]).toEqual({ event: "meta", data: { type: "encouragement" } });
    const text = events
      .filter((e) => e.event === "token")
      .map((e) => (e.data as { text: string }).text)
      .join("");
    expect(text).toBe("Well done.");
    expect(events.at(-1)).toEqual({ event: "done", data: {} });
  });

  it("emits a friendly error event (no stack trace) when the API call throws", async () => {
    const create = vi.fn().mockRejectedValue(new Error("boom: secret internals"));
    const client = { messages: { create, stream: vi.fn() } } as unknown as Anthropic;
    vi.spyOn(console, "error").mockImplementation(() => {});

    const input = { ...baseInput, freeText: "hi" };
    const raw = await readAll(createEncourageStream(input, client));
    const events = parseEvents(raw);

    expect(events.some((e) => e.event === "error")).toBe(true);
    const error = events.find((e) => e.event === "error")!.data as {
      message: string;
    };
    expect(error.message).toBe(FRIENDLY_ERROR_MESSAGE);
    expect(raw).not.toContain("boom: secret internals");
    expect(events.at(-1)).toEqual({ event: "done", data: {} });
  });
});
