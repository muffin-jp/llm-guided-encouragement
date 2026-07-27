/**
 * The preset feelings a player can pick on the post-stage screen.
 * Shared by request validation, the encouragement prompt, and the UI,
 * so the contract can't drift between client and server.
 */
export const PRESET_FEELINGS = [
  "proud",
  "relieved",
  "frustrated",
  "disappointed",
  "anxious",
  "tired",
] as const;

export type PresetFeeling = (typeof PRESET_FEELINGS)[number];

/** "custom" means the player skipped the chips and only wrote free text. */
export const CUSTOM_FEELING = "custom" as const;

export const ALL_FEELINGS = [...PRESET_FEELINGS, CUSTOM_FEELING] as const;
