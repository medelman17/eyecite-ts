import type { BughuntCase } from "../core/corpus";
import { runExtraction } from "../core/extract";
import { buildFinding, findingSignature } from "../core/findings";
import type { BughuntFinding } from "../core/types";

export interface CorpusLaneInput {
  runId: string;
  command: string;
  cases: BughuntCase[];
  slowMs: number;
}

export function runCorpusLane(input: CorpusLaneInput): BughuntFinding[] {
  const findings: BughuntFinding[] = [];

  for (const bughuntCase of input.cases) {
    const result = runExtraction(bughuntCase.text, { resolve: true });
    if (!result.ok) {
      findings.push(
        buildFinding({
          runId: input.runId,
          lane: "corpus",
          severity: "crash",
          source: { kind: bughuntCase.sourceKind, key: bughuntCase.key },
          command: input.command,
          signature: findingSignature("extract_crash", result.error.message),
          message: result.error.message,
          input: bughuntCase.text,
          contextSnippet: bughuntCase.text.slice(0, 300),
          timing: { durationMs: result.durationMs },
        }),
      );
      continue;
    }

    if (result.durationMs > input.slowMs) {
      findings.push(
        buildFinding({
          runId: input.runId,
          lane: "corpus",
          severity: "perf",
          source: { kind: bughuntCase.sourceKind, key: bughuntCase.key },
          command: input.command,
          signature: findingSignature("slow_document", `${Math.round(result.durationMs)}ms`),
          message: `extraction exceeded ${input.slowMs}ms`,
          input: bughuntCase.text,
          contextSnippet: bughuntCase.text.slice(0, 300),
          timing: { durationMs: result.durationMs, timeoutMs: input.slowMs },
        }),
      );
    }
  }

  return findings;
}
