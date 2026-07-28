import { describe, expect, it } from "vitest";
import { encourageRequestSchema } from "@/lib/validation";

const valid = {
  stageId: "stage-3-2",
  feeling: "proud",
  locale: "en",
};

describe("encourageRequestSchema", () => {
  it("accepts a minimal valid request", () => {
    expect(encourageRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts optional freeText up to 200 chars", () => {
    const result = encourageRequestSchema.safeParse({
      ...valid,
      feeling: "custom",
      freeText: "a".repeat(200),
    });
    expect(result.success).toBe(true);
  });

  it("rejects freeText over 200 chars", () => {
    const result = encourageRequestSchema.safeParse({
      ...valid,
      freeText: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown feelings", () => {
    const result = encourageRequestSchema.safeParse({
      ...valid,
      feeling: "euphoric",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-en locales for now", () => {
    const result = encourageRequestSchema.safeParse({ ...valid, locale: "ja" });
    expect(result.success).toBe(false);
  });

  it("rejects stageIds with unexpected characters", () => {
    const result = encourageRequestSchema.safeParse({
      ...valid,
      stageId: "stage 3; DROP TABLE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing stageId", () => {
    const rest = { feeling: valid.feeling, locale: valid.locale };
    expect(encourageRequestSchema.safeParse(rest).success).toBe(false);
  });
});
