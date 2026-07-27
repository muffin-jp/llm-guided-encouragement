import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { classifyDistress } from "@/lib/encourage";
import type { EncourageRequest } from "@/lib/validation";

function mockClient(replyText: string) {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: replyText }],
  });
  return {
    client: { messages: { create } } as unknown as Anthropic,
    create,
  };
}

const baseInput: EncourageRequest = {
  stageId: "stage-3-2",
  feeling: "frustrated",
  locale: "en",
};

describe("classifyDistress", () => {
  it("skips the model call when there is no free text (preset chips can't express crisis)", async () => {
    const { client, create } = mockClient('{"distress": true}');
    await expect(classifyDistress(client, baseInput)).resolves.toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns true when the classifier flags distress", async () => {
    const { client } = mockClient('{"distress": true}');
    const input = { ...baseInput, freeText: "nothing matters anymore" };
    await expect(classifyDistress(client, input)).resolves.toBe(true);
  });

  it("returns false for ordinary game frustration", async () => {
    const { client, create } = mockClient('{"distress": false}');
    const input = { ...baseInput, freeText: "this stage is so annoying" };
    await expect(classifyDistress(client, input)).resolves.toBe(false);
    expect(create).toHaveBeenCalledOnce();
  });

  it("fails safe (distress=true) when the reply is not parseable JSON", async () => {
    const { client } = mockClient("I think the player seems fine.");
    const input = { ...baseInput, freeText: "hello" };
    await expect(classifyDistress(client, input)).resolves.toBe(true);
  });

  it("fails safe when the reply JSON has the wrong shape", async () => {
    const { client } = mockClient('{"verdict": "ok"}');
    const input = { ...baseInput, freeText: "hello" };
    await expect(classifyDistress(client, input)).resolves.toBe(true);
  });
});
