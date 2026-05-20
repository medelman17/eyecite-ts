import * as fc from "fast-check";
import { runExtraction } from "../core/extract";
import { buildFinding, findingSignature } from "../core/findings";
import type { BughuntFinding } from "../core/types";

export interface MutationLaneInput {
  runId: string;
  command: string;
  seed: number;
  numRuns: number;
}

interface MutatedCitationInput {
  text: string;
}

export function runMutationLane(input: MutationLaneInput): BughuntFinding[] {
  const property = fc.property(mutatedCitationInput(), (candidate) => {
    const result = runExtraction(candidate.text, { resolve: true });
    if (!result.ok) {
      throw result.error;
    }
    return result.citations.length > 0;
  });

  const details = fc.check(property, {
    seed: input.seed,
    numRuns: input.numRuns,
    endOnFailure: false,
    verbose: 0,
  });

  if (!details.failed) {
    return [];
  }

  const message = errorMessage(details.errorInstance);
  const counterexample = details.counterexample?.[0];
  const counterexamplePath = details.counterexamplePath ?? undefined;

  return [
    buildFinding({
      runId: input.runId,
      lane: "mutate",
      severity: "invariant",
      source: {
        kind: "synthetic",
        seed: details.seed,
        path: counterexamplePath,
        counterexamplePath,
      },
      command: input.command,
      signature: findingSignature("mutation_property", message),
      message,
      input: counterexample ? counterexample.text : JSON.stringify(details.counterexample),
      minimalInput: counterexample?.text,
      contextSnippet: counterexample?.text ?? JSON.stringify(details.counterexample),
      after: {
        counterexamplePath,
        counterexample: details.counterexample,
        numRuns: details.numRuns,
        numShrinks: details.numShrinks,
        numSkips: details.numSkips,
      },
    }),
  ];
}

function mutatedCitationInput(): fc.Arbitrary<MutatedCitationInput> {
  return fc
    .record({
      leftBreak: fc.constantFrom(" ", "\n", "\n\n", " <span>"),
      rightBreak: fc.constantFrom(" ", "\n", "</span> ", "  "),
      reporter: fc.constantFrom("U.S.", "F.3d", "N.Y.3d"),
      year: fc.integer({ min: 1800, max: 2026 }),
    })
    .map(({ leftBreak, reporter, rightBreak, year }) => ({
      text: `Smith v.${leftBreak}Jones, 1${rightBreak}${reporter} 1 (${year}).`,
    }));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error === null || error === undefined) return "mutation property failed";
  return String(error);
}
