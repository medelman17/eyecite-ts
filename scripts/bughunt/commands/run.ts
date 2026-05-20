import { resolve } from "node:path";
import { commandFromArgs, parsePositiveInteger, parseRunArgs } from "../cli";
import { createRunArtifacts } from "../core/artifacts";
import { inlineCases } from "../core/corpus";
import { runCorpusLane } from "../lanes/corpus";
import { runInvariantLane } from "../lanes/invariants";
import { runMutationLane } from "../lanes/mutate";

const ALL_V1_LANES = ["corpus", "invariants", "mutate"] as const;
const RUNNABLE_LANES = new Set<string>([...ALL_V1_LANES, "all"]);

export async function runBughunt(args: string[]): Promise<number> {
  let parsed: ReturnType<typeof parseRunArgs>;
  try {
    parsed = parseRunArgs(args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }

  const lane = String(parsed.values.lane ?? "all");
  if (!RUNNABLE_LANES.has(lane)) {
    console.error(`Unknown bughunt lane: ${lane}`);
    return 1;
  }

  let seed: number;
  let sample: number;
  let slowMs: number;
  let numRuns: number;
  try {
    seed = parsePositiveInteger(parsed.values.seed, Date.now(), "seed");
    sample = parsePositiveInteger(parsed.values.sample, 50, "sample");
    slowMs = parsePositiveInteger(parsed.values["slow-ms"], 250, "slow-ms");
    numRuns = parsePositiveInteger(parsed.values["num-runs"], sample, "num-runs");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }

  const rootDir = resolve(String(parsed.values.root ?? ".bughunt"));
  const startedAt = new Date().toISOString();
  const runId = String(parsed.values["run-id"] ?? `${startedAt.replace(/[:.]/g, "")}-seed-${seed}`);
  const command = commandFromArgs("run", args);
  const selectedLanes = lane === "all" ? [...ALL_V1_LANES] : [lane];
  const cases = inlineCases().slice(0, sample);
  const artifacts = createRunArtifacts({
    rootDir,
    runId,
    seed,
    command,
    lanes: selectedLanes,
    startedAt,
  });

  for (const bughuntCase of cases) {
    artifacts.writeCase({
      key: bughuntCase.key,
      sourceKind: bughuntCase.sourceKind,
      inputLength: bughuntCase.text.length,
    });
  }

  for (const selectedLane of selectedLanes) {
    artifacts.writeEvent({ type: "lane:start", lane: selectedLane, at: new Date().toISOString() });
    const findings =
      selectedLane === "corpus"
        ? runCorpusLane({
            runId,
            command,
            cases,
            slowMs,
          })
        : selectedLane === "invariants"
          ? runInvariantLane({ runId, command, cases })
          : selectedLane === "mutate"
            ? runMutationLane({
                runId,
                command,
                seed,
                numRuns,
              })
          : [];

    for (const finding of findings) {
      artifacts.writeFinding(finding);
    }
    artifacts.writeEvent({
      type: "lane:finish",
      lane: selectedLane,
      findings: findings.length,
      at: new Date().toISOString(),
      numRuns: selectedLane === "mutate" ? numRuns : undefined,
    });
  }

  artifacts.finalize({ finishedAt: new Date().toISOString() });
  console.log(`bughunt run written to ${artifacts.runDir}`);
  return 0;
}
