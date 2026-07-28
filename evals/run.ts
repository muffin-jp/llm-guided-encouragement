import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { generateEncouragement } from "../lib/encourage";
import { judgeEncouragement } from "./judge";
import { evaluate } from "./thresholds";
import { printConsole, renderMarkdown } from "./report";
import { createDryClient } from "./dryClient";
import type { CaseResult, EvalCase } from "./types";
import type { EncourageRequest } from "../lib/validation";

const CONCURRENCY = Number(process.env.EVAL_CONCURRENCY ?? "4");
const RETRIES = 3;
const STAGE_ID = "stage-eval";
const DRY = process.argv.includes("--dry") || process.env.EVAL_DRY === "1";

const ROOT = process.cwd();
const DATASET = path.join(ROOT, "evals", "dataset.jsonl");
const RESULTS_DIR = path.join(ROOT, "evals", "results");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadDataset(): EvalCase[] {
  return readFileSync(DATASET, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as EvalCase);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function isTransient(err: unknown): boolean {
  if (err instanceof Anthropic.APIConnectionError) return true;
  if (err instanceof Anthropic.APIError && typeof err.status === "number") {
    return err.status === 408 || err.status === 429 || err.status >= 500;
  }
  return false;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || attempt === RETRIES - 1) throw err;
      await sleep(500 * 2 ** attempt);
    }
  }
  throw lastErr;
}

/** Fixed-size worker pool; preserves input order in the results array. */
async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return results;
}

async function runCase(client: Anthropic, evalCase: EvalCase): Promise<CaseResult> {
  const request: EncourageRequest = {
    stageId: STAGE_ID,
    feeling: evalCase.feeling as EncourageRequest["feeling"],
    freeText: evalCase.freeText,
    locale: "en",
  };

  const base = {
    id: evalCase.id,
    category: evalCase.category,
    feeling: evalCase.feeling,
    freeText: evalCase.freeText,
    expectedPath: evalCase.expectedPath,
  };

  try {
    const { path: actualPath, text } = await withRetry(() =>
      generateEncouragement(request, client),
    );
    const words = wordCount(text);
    const isEncouragement = actualPath === "encouragement";

    const judge =
      isEncouragement && text.length > 0
        ? await withRetry(() => judgeEncouragement(client, evalCase, text))
        : null;

    return {
      ...base,
      actualPath,
      pathCorrect: actualPath === evalCase.expectedPath,
      text,
      wordCount: words,
      wordLimitOk: isEncouragement ? words <= 40 : null,
      nonEmpty: text.trim().length > 0,
      judge,
    };
  } catch (err) {
    return {
      ...base,
      actualPath: evalCase.expectedPath,
      pathCorrect: false,
      text: "",
      wordCount: 0,
      wordLimitOk: null,
      nonEmpty: false,
      judge: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function buildClient(): Anthropic {
  if (DRY) {
    console.log("Running in --dry mode: fixture client, no API calls.\n");
    return createDryClient();
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is not set. Set it to run the real eval, or pass --dry for an offline harness check.",
    );
    process.exit(1);
  }
  return new Anthropic();
}

async function main() {
  const client = buildClient();
  const cases = loadDataset();
  console.log(`Running ${cases.length} eval cases (concurrency ${CONCURRENCY})...`);

  let done = 0;
  const results = await mapPool(cases, CONCURRENCY, async (c) => {
    const result = await runCase(client, c);
    done += 1;
    process.stdout.write(`\r  ${done}/${cases.length} cases complete`);
    return result;
  });
  process.stdout.write("\n");

  const summary = evaluate(results);
  const generatedAt = new Date().toISOString();

  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(
    path.join(RESULTS_DIR, "latest.json"),
    JSON.stringify({ generatedAt, dry: DRY, summary, results }, null, 2) + "\n",
  );
  writeFileSync(
    path.join(RESULTS_DIR, "latest.md"),
    renderMarkdown(summary, DRY ? `${generatedAt} (dry fixture — not real scores)` : generatedAt),
  );

  printConsole(summary);
  console.log(`Wrote evals/results/latest.json and latest.md`);

  if (!summary.passed) {
    console.error("\nThresholds not met — see failures above.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Eval run crashed:", err);
  process.exit(1);
});
