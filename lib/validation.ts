import { z } from "zod";
import { ALL_FEELINGS } from "./feelings";

export const MAX_FREE_TEXT_LENGTH = 200;

/**
 * Request contract for POST /api/encourage.
 * This is the same contract the Bloom Unity client will call in production.
 */
export const encourageRequestSchema = z.object({
  stageId: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9-_]+$/, "stageId must be a simple identifier"),
  feeling: z.enum(ALL_FEELINGS),
  freeText: z.string().max(MAX_FREE_TEXT_LENGTH).optional(),
  // English only for now; the field exists so the Unity client contract
  // doesn't need to change when Japanese ships.
  locale: z.literal("en"),
});

export type EncourageRequest = z.infer<typeof encourageRequestSchema>;
