export type BughuntSeverity = "crash" | "invariant" | "suspicious" | "perf" | "diff";

export type BughuntLane = "corpus" | "invariants" | "mutate" | "resolver" | "annotate" | "perf";

export interface BughuntSource {
  kind: "cap" | "fixture" | "synthetic" | "inline";
  key?: string;
  seed?: number;
  path?: string;
  counterexamplePath?: string;
  replayPath?: string;
}

export interface BughuntFinding {
  id: string;
  runId: string;
  lane: string;
  severity: BughuntSeverity;
  source: BughuntSource;
  command: string;
  signature: string;
  message: string;
  input?: string;
  minimalInput?: string;
  contextSnippet?: string;
  citations?: unknown[];
  before?: unknown;
  after?: unknown;
  invariant?: string;
  timing?: {
    durationMs: number;
    timeoutMs?: number;
  };
  suggestedTest?: {
    path: string;
    name: string;
  };
}

export type FindingInput = Omit<BughuntFinding, "id">;

export interface RunManifest {
  runId: string;
  seed: number;
  command: string;
  lanes: string[];
  startedAt: string;
  finishedAt?: string;
}

export interface RunSummary {
  finishedAt: string;
}

export interface RunArtifacts {
  runDir: string;
  manifest: RunManifest;
  writeFinding(finding: BughuntFinding): void;
  writeCase(record: unknown): void;
  writeEvent(record: unknown): void;
  finalize(summary: RunSummary): void;
}
