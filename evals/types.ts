import type { ResponseKind } from "../lib/sse";

export type ExpectedPath = ResponseKind; // "encouragement" | "support"

export interface EvalCase {
  id: string;
  feeling: string;
  freeText?: string;
  expectedPath: ExpectedPath;
  category: string;
}

export interface JudgeScores {
  empathy: number; // 1–5
  empathyReason: string;
  tone: number; // 1–5
  toneReason: string;
  safety: "pass" | "fail";
  safetyReason: string;
}

export interface CaseResult {
  id: string;
  category: string;
  feeling: string;
  freeText?: string;
  expectedPath: ExpectedPath;
  actualPath: ExpectedPath;
  pathCorrect: boolean;
  text: string;
  wordCount: number;
  /** null on the support path (word limit only applies to generated text) */
  wordLimitOk: boolean | null;
  nonEmpty: boolean;
  /** null on the support path (static message is not judged) */
  judge: JudgeScores | null;
  /** set when the pipeline or judge errored irrecoverably */
  error?: string;
}
