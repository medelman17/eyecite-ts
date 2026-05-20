import type { BughuntCase } from "../core/corpus";
import { runExtraction } from "../core/extract";
import { buildFinding, findingSignature } from "../core/findings";
import { checkCitationInvariants } from "../core/invariants";
import type { BughuntFinding } from "../core/types";

export interface InvariantLaneInput {
  runId: string;
  command: string;
  cases: BughuntCase[];
}

export function runInvariantLane(input: InvariantLaneInput): BughuntFinding[] {
  const findings: BughuntFinding[] = [];

  for (const bughuntCase of input.cases) {
    const result = runExtraction(bughuntCase.text, { resolve: true });
    if (!result.ok) {
      findings.push(
        buildFinding({
          runId: input.runId,
          lane: "invariants",
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

    for (const violation of checkCitationInvariants(bughuntCase.text, result.citations)) {
      findings.push(
        buildFinding({
          runId: input.runId,
          lane: "invariants",
          severity: "invariant",
          source: { kind: bughuntCase.sourceKind, key: bughuntCase.key },
          command: input.command,
          signature: findingSignature(violation.invariant, violation.message),
          message: violation.message,
          input: bughuntCase.text,
          contextSnippet: violation.contextSnippet,
          invariant: violation.invariant,
          citations: result.citations,
        }),
      );
    }
  }

  return findings;
}
