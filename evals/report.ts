import type { CaseResult } from "./types";
import type { Metric, Summary } from "./thresholds";
import { GENERATION_MODEL, DISTRESS_MODEL } from "../lib/anthropic";
import { JUDGE_MODEL } from "./judge";

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function renderMetric(m: Metric): string {
  return m.format === "percent" ? pct(m.value) : m.value.toFixed(2);
}

/** Compact console output: metric gate, per-category path accuracy, failures. */
export function printConsole(summary: Summary): void {
  console.log("\n=== Guided Encouragement — Eval Results ===\n");

  console.table(
    summary.metrics.map((m) => ({
      metric: m.label,
      value: renderMetric(m),
      threshold:
        m.format === "percent" ? pct(m.threshold) : m.threshold.toFixed(2),
      n: m.sampleSize,
      status: m.pass ? "PASS" : "FAIL",
    })),
  );

  console.table(
    summary.byCategory.map((c) => ({
      category: c.category,
      cases: c.count,
      "path accuracy": pct(c.pathAccuracy),
    })),
  );

  if (summary.failures.length > 0) {
    console.log(`\n${summary.failures.length} case(s) need attention:`);
    for (const f of summary.failures) {
      console.log(`  - [${f.id}] ${describeFailure(f)}`);
    }
  }

  console.log(
    `\nOverall path accuracy: ${pct(summary.overallPathAccuracy)}  |  ` +
      `Result: ${summary.passed ? "PASS ✅" : "FAIL ❌"}\n`,
  );
}

function describeFailure(f: CaseResult): string {
  if (f.error) return `error: ${f.error}`;
  const parts: string[] = [];
  if (!f.pathCorrect) {
    parts.push(`routed to "${f.actualPath}", expected "${f.expectedPath}"`);
  }
  if (f.wordLimitOk === false) parts.push(`over word limit (${f.wordCount})`);
  if (f.judge?.safety === "fail") parts.push(`safety FAIL — ${f.judge.safetyReason}`);
  if (f.expectedPath === "encouragement" && f.judge === null && !f.error) {
    parts.push("no judge score");
  }
  return parts.join("; ") || "flagged";
}

function mdTable(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}`;
}

/** The human-readable summary written to evals/results/latest.md. */
export function renderMarkdown(summary: Summary, generatedAt: string): string {
  const lines: string[] = [];
  lines.push("# Guided Encouragement — Eval Results");
  lines.push("");
  lines.push(`- Generated: ${generatedAt}`);
  lines.push(`- Cases: ${summary.total}`);
  lines.push(`- Generation model: \`${GENERATION_MODEL}\``);
  lines.push(`- Distress classifier: \`${DISTRESS_MODEL}\``);
  lines.push(`- Judge: \`${JUDGE_MODEL}\` (temperature 0)`);
  lines.push(`- **Result: ${summary.passed ? "PASS ✅" : "FAIL ❌"}**`);
  lines.push("");

  lines.push("## Thresholds");
  lines.push("");
  lines.push(
    mdTable(
      ["Metric", "Value", "Threshold", "n", "Status"],
      summary.metrics.map((m) => [
        m.label,
        renderMetric(m),
        m.format === "percent" ? pct(m.threshold) : m.threshold.toFixed(2),
        String(m.sampleSize),
        m.pass ? "✅" : "❌",
      ]),
    ),
  );
  lines.push("");

  lines.push("## By category");
  lines.push("");
  lines.push(
    mdTable(
      ["Category", "Cases", "Path accuracy"],
      summary.byCategory.map((c) => [c.category, String(c.count), pct(c.pathAccuracy)]),
    ),
  );
  lines.push("");
  lines.push(`Overall path accuracy: **${pct(summary.overallPathAccuracy)}**`);
  lines.push("");

  lines.push("## Failures");
  lines.push("");
  if (summary.failures.length === 0) {
    lines.push("None — every case met the bar. 🌸");
  } else {
    lines.push(
      mdTable(
        ["Case", "Category", "Detail"],
        summary.failures.map((f) => [f.id, f.category, describeFailure(f)]),
      ),
    );
  }
  lines.push("");
  return lines.join("\n");
}
