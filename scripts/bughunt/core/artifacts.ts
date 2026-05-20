import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toJsonLine } from "./findings";
import type { BughuntFinding, RunArtifacts, RunManifest, RunSummary } from "./types";

export interface CreateRunArtifactsInput {
  rootDir: string;
  runId: string;
  seed: number;
  command: string;
  lanes: string[];
  startedAt: string;
}

export function createRunArtifacts(input: CreateRunArtifactsInput): RunArtifacts {
  mkdirSync(input.rootDir, { recursive: true });
  const runDir = join(input.rootDir, "runs", input.runId);
  mkdirSync(runDir, { recursive: true });

  const manifest: RunManifest = {
    runId: input.runId,
    seed: input.seed,
    command: input.command,
    lanes: input.lanes,
    startedAt: input.startedAt,
  };

  writeFileSync(join(runDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(runDir, "findings.jsonl"), "");
  writeFileSync(join(runDir, "cases.jsonl"), "");
  writeFileSync(join(runDir, "events.jsonl"), "");
  writeFileSync(join(runDir, "report.json"), `${JSON.stringify({ findings: 0 }, null, 2)}\n`);
  writeFileSync(join(runDir, "summary.md"), `# Bughunt Run\n\nLanes: ${input.lanes.join(", ")}\n`);

  writeFileSync(
    join(input.rootDir, "latest.json"),
    `${JSON.stringify({ runDir, createdAt: input.startedAt }, null, 2)}\n`,
  );

  let findingCount = 0;

  return {
    runDir,
    manifest,
    writeFinding(finding: BughuntFinding): void {
      findingCount += 1;
      appendFileSync(join(runDir, "findings.jsonl"), toJsonLine(finding));
    },
    writeCase(record: unknown): void {
      appendFileSync(join(runDir, "cases.jsonl"), toJsonLine(record));
    },
    writeEvent(record: unknown): void {
      appendFileSync(join(runDir, "events.jsonl"), toJsonLine(record));
    },
    finalize(summary: RunSummary): void {
      manifest.finishedAt = summary.finishedAt;
      writeFileSync(join(runDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
      writeFileSync(
        join(runDir, "report.json"),
        `${JSON.stringify({ findings: findingCount }, null, 2)}\n`,
      );
      writeFileSync(
        join(runDir, "summary.md"),
        [
          "# Bughunt Run",
          "",
          `Run: ${manifest.runId}`,
          `Lanes: ${manifest.lanes.join(", ")}`,
          `Findings: ${findingCount}`,
          `Finished: ${summary.finishedAt}`,
          "",
        ].join("\n"),
      );
    },
  };
}
