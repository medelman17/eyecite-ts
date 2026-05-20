# Internal Bughunt CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a repo-local `pnpm bughunt` CLI that runs deterministic local bug-hunting lanes, writes reproducible artifacts, supports finding inspection, and previews Vitest regression promotion.

**Architecture:** Add internal TypeScript scripts under `scripts/bughunt/`, invoked by a package script and not exported as part of the library. The CLI writes local-only `.bughunt/` artifacts, uses deterministic seeds, shares invariant/finding helpers across lanes, and starts with corpus + invariant + generated mutation lanes.

**Tech Stack:** Node 18+, TypeScript ESM, `tsx`, `fast-check`, `adm-zip`, Vitest 4, Biome.

---

## Definition Of Done

This work is done only when all of the following are true:

1. **Internal CLI boundary is preserved.**
   - `package.json` has a `bughunt` script.
   - `package.json` has no `bin` entry for bughunt.
   - `package.json` exports do not mention bughunt.
   - No `src/` public exports or `tsdown` entry points are added for the CLI.

2. **The local command loop works end to end.**
   - `pnpm bughunt run --lane all --seed 1234 --sample 5` completes.
   - The command writes `.bughunt/latest.json`.
   - The latest run directory contains `manifest.json`, `findings.jsonl`, `cases.jsonl`, `events.jsonl`, `report.json`, and `summary.md`.
   - The manifest records the seed, selected lanes, command, start time, and finish time.

3. **At least three useful lanes exist in v1.**
   - `corpus` lane runs extraction/resolution over inline smoke cases and records crashes or perf outliers as findings.
   - `invariants` lane checks citation/span invariants and records violations as findings.
   - `mutate` lane uses `fast-check` with deterministic `seed`/`numRuns` and records generated-input failures with replay data.

4. **Findings are reproducible and inspectable.**
   - Finding IDs are stable for the same lane/source/signature/snippet.
   - Each finding records its lane, source, command, signature, message, and useful context.
   - Generated-input findings preserve `seed` and `counterexamplePath` when available.
   - `pnpm bughunt inspect .bughunt/latest.json --id <finding-id>` prints enough detail to reproduce or reason about the failure.

5. **Promotion has a safe first version.**
   - `pnpm bughunt promote .bughunt/latest.json --id <finding-id>` prints a Vitest repro preview.
   - `promote` does not write files unless a deliberate `--write` behavior is implemented and tested.
   - The preview includes the finding ID, original command, source context, and minimized/input text when available.

6. **Tests cover the contract, not just implementation details.**
   - `tests/bughunt/core.test.ts` covers deterministic RNG, stable finding IDs, artifact writing, extraction wrapper, invariant checks, inline corpus, invariant lane, and mutation lane basics.
   - `tests/bughunt/commands.test.ts` covers `run`, unknown command handling, `inspect`, and `promote` preview.
   - Tests use temporary directories and do not write committed `.bughunt/` artifacts.

7. **Repo hygiene is maintained.**
   - `.bughunt/` is gitignored.
   - No secrets are printed or committed.
   - Existing unrelated untracked files are not removed, reformatted, staged, or committed.
   - No generated `.bughunt/` artifacts are staged.

8. **Verification is complete and honestly reported.**
   - `pnpm exec vitest run tests/bughunt/core.test.ts tests/bughunt/commands.test.ts` passes.
   - `pnpm lint` passes or any failures are documented with exact unrelated file paths.
   - `pnpm typecheck` passes, or the final response explicitly explains if scripts are not covered because `tsconfig.json` includes only `src`.
   - The smoke command `pnpm bughunt run --lane all --seed 1234 --sample 5` passes.
   - The final response reports the exact verification commands run and whether each passed.

Anything less is not done; it is a partial implementation.

---

## File Structure

Create:

- `scripts/bughunt/index.ts` — subcommand dispatcher.
- `scripts/bughunt/cli.ts` — `node:util.parseArgs` wrappers and usage text.
- `scripts/bughunt/core/types.ts` — artifact, finding, lane, and CLI option types.
- `scripts/bughunt/core/rng.ts` — deterministic PRNG helpers.
- `scripts/bughunt/core/findings.ts` — stable finding IDs, signatures, JSONL helpers.
- `scripts/bughunt/core/artifacts.ts` — `.bughunt/` run directory writer.
- `scripts/bughunt/core/extract.ts` — safe extraction wrappers and timing.
- `scripts/bughunt/core/invariants.ts` — citation/span invariant checks.
- `scripts/bughunt/core/corpus.ts` — fixture and optional CAP corpus loaders.
- `scripts/bughunt/lanes/invariants.ts` — invariant lane.
- `scripts/bughunt/lanes/corpus.ts` — corpus lane.
- `scripts/bughunt/lanes/mutate.ts` — `fast-check` generated mutation lane.
- `scripts/bughunt/commands/run.ts` — run selected lanes and write artifacts.
- `scripts/bughunt/commands/inspect.ts` — print one finding.
- `scripts/bughunt/commands/promote.ts` — preview Vitest regression.
- `tests/bughunt/core.test.ts` — unit tests for helpers.
- `tests/bughunt/commands.test.ts` — command-level tests using temporary artifact dirs.

Modify:

- `package.json` — add `bughunt` script and dev dependencies.
- `pnpm-lock.yaml` — update via `pnpm install`.
- `.gitignore` — add `.bughunt/`.

Do not modify:

- `exports` in `package.json`.
- `files` in `package.json`.
- `tsdown.config.ts`.
- public `src/` exports.

---

## Task 1: Add Tooling Dependencies And Local Artifact Ignore

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `.gitignore`

- [ ] **Step 1: Add dependencies and package script**

Run:

```bash
pnpm add -D tsx fast-check adm-zip
```

Expected: `package.json` gains dev dependencies for `tsx`, `fast-check`, and `adm-zip`; `pnpm-lock.yaml` updates.

- [ ] **Step 2: Add the package script**

Edit `package.json` so the scripts block includes:

```json
{
  "scripts": {
    "build": "tsdown",
    "test": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "biome lint src tests",
    "format": "biome format --write src tests",
    "size": "size-limit",
    "check:size": "npx tsx scripts/check-bundle-size.ts",
    "bughunt": "tsx scripts/bughunt/index.ts"
  }
}
```

Do not add a `bin` field.

- [ ] **Step 3: Ignore local artifacts**

Append this block to `.gitignore`:

```gitignore

# Bughunt local artifacts
.bughunt/
```

- [ ] **Step 4: Verify package metadata**

Run:

```bash
node -e "const p=require('./package.json'); if (p.bin) throw new Error('bughunt must not be public bin'); if (!p.scripts.bughunt) throw new Error('missing bughunt script'); console.log(p.scripts.bughunt)"
```

Expected:

```text
tsx scripts/bughunt/index.ts
```

---

## Task 2: Define Shared Types, RNG, Findings, And Artifacts

**Files:**
- Create: `scripts/bughunt/core/types.ts`
- Create: `scripts/bughunt/core/rng.ts`
- Create: `scripts/bughunt/core/findings.ts`
- Create: `scripts/bughunt/core/artifacts.ts`
- Test: `tests/bughunt/core.test.ts`

- [ ] **Step 1: Write failing tests for deterministic IDs and artifact writer**

Create `tests/bughunt/core.test.ts`:

```ts
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createRunArtifacts } from "../../scripts/bughunt/core/artifacts";
import { buildFinding, findingSignature } from "../../scripts/bughunt/core/findings";
import { createRng } from "../../scripts/bughunt/core/rng";

let tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

describe("bughunt core helpers", () => {
  it("creates deterministic random sequences from a seed", () => {
    const a = createRng(1234);
    const b = createRng(1234);

    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it("builds stable finding IDs from lane, source, signature, and snippet", () => {
    const input = {
      runId: "run-1",
      lane: "invariants",
      severity: "invariant" as const,
      source: { kind: "inline" as const, key: "example" },
      command: "pnpm bughunt run --lane invariants --seed 1",
      signature: findingSignature("span_bounds", "originalEnd outside source"),
      message: "originalEnd outside source",
      contextSnippet: "Smith v. Jones, 1 U.S. 1 (1801)",
    };

    expect(buildFinding(input).id).toBe(buildFinding(input).id);
  });

  it("writes manifest, JSONL files, summary, and latest pointer", () => {
    const root = mkdtempSync(join(tmpdir(), "bughunt-artifacts-"));
    tempDirs.push(root);
    const artifacts = createRunArtifacts({
      rootDir: root,
      runId: "2026-05-20T143000Z-seed-1234",
      seed: 1234,
      command: "pnpm bughunt run --lane invariants --seed 1234",
      lanes: ["invariants"],
      startedAt: "2026-05-20T14:30:00.000Z",
    });

    artifacts.writeFinding(
      buildFinding({
        runId: artifacts.manifest.runId,
        lane: "invariants",
        severity: "invariant",
        source: { kind: "inline", key: "case-1" },
        command: artifacts.manifest.command,
        signature: findingSignature("span_bounds", "bad span"),
        message: "bad span",
        contextSnippet: "bad span input",
      }),
    );
    artifacts.finalize({ finishedAt: "2026-05-20T14:30:01.000Z" });

    const latest = JSON.parse(readFileSync(join(root, "latest.json"), "utf8")) as {
      runDir: string;
    };
    expect(latest.runDir).toContain("2026-05-20T143000Z-seed-1234");
    expect(readFileSync(join(artifacts.runDir, "findings.jsonl"), "utf8")).toContain("bad span");
    expect(readFileSync(join(artifacts.runDir, "summary.md"), "utf8")).toContain("invariants");
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
pnpm exec vitest run tests/bughunt/core.test.ts
```

Expected: fails because `scripts/bughunt/core/*` modules do not exist.

- [ ] **Step 3: Implement shared types**

Create `scripts/bughunt/core/types.ts`:

```ts
export type BughuntSeverity = "crash" | "invariant" | "suspicious" | "perf" | "diff";

export type BughuntLane = "corpus" | "invariants" | "mutate" | "resolver" | "annotate" | "perf";

export interface BughuntSource {
  kind: "cap" | "fixture" | "synthetic" | "inline";
  key?: string;
  seed?: number;
  path?: string;
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
```

- [ ] **Step 4: Implement deterministic RNG**

Create `scripts/bughunt/core/rng.ts`:

```ts
export interface Rng {
  next(): number;
  integer(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    integer(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new Error(`maxExclusive must be a positive integer; got ${maxExclusive}`);
      }
      return Math.floor(next() * maxExclusive);
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) {
        throw new Error("cannot pick from an empty array");
      }
      return items[this.integer(items.length)]!;
    },
  };
}
```

- [ ] **Step 5: Implement finding helpers**

Create `scripts/bughunt/core/findings.ts`:

```ts
import { createHash } from "node:crypto";
import type { BughuntFinding, FindingInput } from "./types";

export function findingSignature(kind: string, message: string): string {
  return `${kind}:${message.replace(/\s+/g, " ").trim().slice(0, 160)}`;
}

export function buildFinding(input: FindingInput): BughuntFinding {
  const hashInput = [
    input.lane,
    input.source.kind,
    input.source.key ?? "",
    input.source.seed?.toString() ?? "",
    input.signature,
    normalizeSnippet(input.contextSnippet ?? input.input ?? input.message),
  ].join("\u001f");

  const digest = createHash("sha256").update(hashInput).digest("hex").slice(0, 12);
  return { id: `F-${digest}`, ...input };
}

export function toJsonLine(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

function normalizeSnippet(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 500);
}
```

- [ ] **Step 6: Implement artifact writer**

Create `scripts/bughunt/core/artifacts.ts`:

```ts
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

  mkdirSync(input.rootDir, { recursive: true });
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
      writeFileSync(join(runDir, "report.json"), `${JSON.stringify({ findings: findingCount }, null, 2)}\n`);
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
```

- [ ] **Step 7: Run tests**

Run:

```bash
pnpm exec vitest run tests/bughunt/core.test.ts
```

Expected: passes.

---

## Task 3: Add Extraction Wrapper And Invariant Checks

**Files:**
- Create: `scripts/bughunt/core/extract.ts`
- Create: `scripts/bughunt/core/invariants.ts`
- Modify: `tests/bughunt/core.test.ts`

- [ ] **Step 1: Add failing tests for extraction and invariants**

Append to `tests/bughunt/core.test.ts`:

```ts
import { runExtraction } from "../../scripts/bughunt/core/extract";
import { checkCitationInvariants } from "../../scripts/bughunt/core/invariants";

describe("bughunt extraction and invariants", () => {
  it("runs extraction and records duration", () => {
    const result = runExtraction("Smith v. Jones, 1 U.S. 1 (1801).", { resolve: true });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.citations.length).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("reports no invariant failures for a normal citation", () => {
    const text = "Smith v. Jones, 1 U.S. 1 (1801).";
    const result = runExtraction(text, { resolve: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const violations = checkCitationInvariants(text, result.citations);
    expect(violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
pnpm exec vitest run tests/bughunt/core.test.ts
```

Expected: fails because `extract.ts` and `invariants.ts` do not exist.

- [ ] **Step 3: Implement extraction wrapper**

Create `scripts/bughunt/core/extract.ts`:

```ts
import { performance } from "node:perf_hooks";
import { extractCitations } from "../../src/index";
import type { Citation } from "../../src/types/citation";

export interface ExtractionOptions {
  resolve?: boolean;
  detectFootnotes?: boolean;
}

export type ExtractionResult =
  | { ok: true; citations: Citation[]; durationMs: number }
  | { ok: false; error: Error; durationMs: number };

export function runExtraction(text: string, options: ExtractionOptions = {}): ExtractionResult {
  const start = performance.now();
  try {
    const citations = extractCitations(text, options);
    return { ok: true, citations, durationMs: performance.now() - start };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
      durationMs: performance.now() - start,
    };
  }
}
```

- [ ] **Step 4: Implement invariant checks**

Create `scripts/bughunt/core/invariants.ts`:

```ts
import type { Citation } from "../../src/types/citation";

export interface InvariantViolation {
  invariant: string;
  message: string;
  citationIndex: number;
  contextSnippet: string;
}

export function checkCitationInvariants(text: string, citations: Citation[]): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  let previousOriginalEnd = -1;

  citations.forEach((citation, index) => {
    const span = citation.span;
    if (span.cleanEnd <= span.cleanStart) {
      violations.push(buildViolation(text, index, span.originalStart, "clean_span", "clean span is empty or negative"));
    }
    if (span.originalEnd <= span.originalStart) {
      violations.push(buildViolation(text, index, span.originalStart, "original_span", "original span is empty or negative"));
    }
    if (span.originalStart < 0 || span.originalEnd > text.length) {
      violations.push(buildViolation(text, index, span.originalStart, "original_bounds", "original span is outside source bounds"));
    }
    if (span.originalStart < previousOriginalEnd) {
      violations.push(buildViolation(text, index, span.originalStart, "sort_order", "citations are not sorted by originalStart"));
    }
    previousOriginalEnd = Math.max(previousOriginalEnd, span.originalEnd);

    const fullSpan = citation.fullSpan;
    if (fullSpan && (fullSpan.originalStart < 0 || fullSpan.originalEnd > text.length)) {
      violations.push(buildViolation(text, index, fullSpan.originalStart, "full_span_bounds", "fullSpan is outside source bounds"));
    }
  });

  return violations;
}

function buildViolation(
  text: string,
  citationIndex: number,
  offset: number,
  invariant: string,
  message: string,
): InvariantViolation {
  const start = Math.max(0, offset - 120);
  const end = Math.min(text.length, offset + 180);
  return {
    invariant,
    message,
    citationIndex,
    contextSnippet: text.slice(start, end).replace(/\s+/g, " "),
  };
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm exec vitest run tests/bughunt/core.test.ts
```

Expected: passes.

---

## Task 4: Add Corpus Loader And Corpus/Invariants Lanes

**Files:**
- Create: `scripts/bughunt/core/corpus.ts`
- Create: `scripts/bughunt/lanes/corpus.ts`
- Create: `scripts/bughunt/lanes/invariants.ts`
- Modify: `tests/bughunt/core.test.ts`

- [ ] **Step 1: Add failing tests for inline corpus and invariant lane**

Append to `tests/bughunt/core.test.ts`:

```ts
import { inlineCases } from "../../scripts/bughunt/core/corpus";
import { runInvariantLane } from "../../scripts/bughunt/lanes/invariants";

describe("bughunt corpus and invariant lane", () => {
  it("provides a deterministic inline smoke corpus", () => {
    expect(inlineCases().map((c) => c.key)).toEqual([
      "inline/full-case",
      "inline/id-chain",
      "inline/statute",
    ]);
  });

  it("runs invariant lane over inline cases", () => {
    const findings = runInvariantLane({
      runId: "run-1",
      command: "pnpm bughunt run --lane invariants --seed 1",
      cases: inlineCases(),
    });

    expect(findings).toEqual([]);
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
pnpm exec vitest run tests/bughunt/core.test.ts
```

Expected: fails because corpus and lane modules do not exist.

- [ ] **Step 3: Implement corpus helpers**

Create `scripts/bughunt/core/corpus.ts`:

```ts
export interface BughuntCase {
  key: string;
  text: string;
  sourceKind: "inline" | "fixture" | "cap";
}

export function inlineCases(): BughuntCase[] {
  return [
    {
      key: "inline/full-case",
      sourceKind: "inline",
      text: "Smith v. Jones, 1 U.S. 1, 3 (1801).",
    },
    {
      key: "inline/id-chain",
      sourceKind: "inline",
      text: "Smith v. Jones, 1 U.S. 1 (1801). Id. at 3.",
    },
    {
      key: "inline/statute",
      sourceKind: "inline",
      text: "The statute appears at 42 U.S.C. § 1983.",
    },
  ];
}
```

- [ ] **Step 4: Implement invariant lane**

Create `scripts/bughunt/lanes/invariants.ts`:

```ts
import { buildFinding, findingSignature } from "../core/findings";
import { checkCitationInvariants } from "../core/invariants";
import { runExtraction } from "../core/extract";
import type { BughuntFinding } from "../core/types";
import type { BughuntCase } from "../core/corpus";

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
          contextSnippet: bughuntCase.text.slice(0, 300),
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
          contextSnippet: violation.contextSnippet,
          invariant: violation.invariant,
          citations: result.citations,
        }),
      );
    }
  }

  return findings;
}
```

- [ ] **Step 5: Implement corpus lane**

Create `scripts/bughunt/lanes/corpus.ts`:

```ts
import { buildFinding, findingSignature } from "../core/findings";
import { runExtraction } from "../core/extract";
import type { BughuntFinding } from "../core/types";
import type { BughuntCase } from "../core/corpus";

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
          contextSnippet: bughuntCase.text.slice(0, 300),
          timing: { durationMs: result.durationMs, timeoutMs: input.slowMs },
        }),
      );
    }
  }

  return findings;
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm exec vitest run tests/bughunt/core.test.ts
```

Expected: passes.

---

## Task 5: Implement CLI Dispatcher And `run`

**Files:**
- Create: `scripts/bughunt/cli.ts`
- Create: `scripts/bughunt/index.ts`
- Create: `scripts/bughunt/commands/run.ts`
- Test: `tests/bughunt/commands.test.ts`

- [ ] **Step 1: Add failing command tests**

Create `tests/bughunt/commands.test.ts`:

```ts
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCommand } from "../../scripts/bughunt/index";

let tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
});

describe("bughunt command runner", () => {
  it("runs invariants lane and writes artifacts", async () => {
    const root = mkdtempSync(join(tmpdir(), "bughunt-command-"));
    tempDirs.push(root);

    const exitCode = await runCommand([
      "run",
      "--lane",
      "invariants",
      "--seed",
      "1234",
      "--root",
      root,
      "--run-id",
      "test-run",
    ]);

    expect(exitCode).toBe(0);
    expect(readFileSync(join(root, "latest.json"), "utf8")).toContain("test-run");
    expect(readFileSync(join(root, "runs", "test-run", "manifest.json"), "utf8")).toContain("invariants");
  });

  it("returns non-zero for an unknown command", async () => {
    await expect(runCommand(["wat"])).resolves.toBe(1);
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
pnpm exec vitest run tests/bughunt/commands.test.ts
```

Expected: fails because CLI files do not exist.

- [ ] **Step 3: Implement CLI helpers**

Create `scripts/bughunt/cli.ts`:

```ts
import { parseArgs } from "node:util";

export function usage(): string {
  return [
    "Usage:",
    "  pnpm bughunt run --lane <lane> [--seed <n>] [--sample <n>]",
    "  pnpm bughunt inspect <run-or-latest> --id <finding-id>",
    "  pnpm bughunt promote <run-or-latest> --id <finding-id> [--write]",
    "",
    "Lanes: all, corpus, invariants, mutate, resolver, annotate, perf",
  ].join("\n");
}

export function parseRunArgs(args: string[]) {
  return parseArgs({
    args,
    allowPositionals: true,
    options: {
      lane: { type: "string", default: "all" },
      seed: { type: "string" },
      sample: { type: "string", default: "50" },
      root: { type: "string", default: ".bughunt" },
      "run-id": { type: "string" },
      "slow-ms": { type: "string", default: "250" },
    },
  });
}
```

- [ ] **Step 4: Implement `run` command**

Create `scripts/bughunt/commands/run.ts`:

```ts
import { resolve } from "node:path";
import { createRunArtifacts } from "../core/artifacts";
import { inlineCases } from "../core/corpus";
import { runCorpusLane } from "../lanes/corpus";
import { runInvariantLane } from "../lanes/invariants";
import { parseRunArgs } from "../cli";

export async function runBughunt(args: string[]): Promise<number> {
  const parsed = parseRunArgs(args);
  const lane = String(parsed.values.lane ?? "all");
  const seed = parsed.values.seed ? Number.parseInt(String(parsed.values.seed), 10) : Date.now();
  const rootDir = resolve(String(parsed.values.root ?? ".bughunt"));
  const startedAt = new Date().toISOString();
  const runId = String(parsed.values["run-id"] ?? `${startedAt.replace(/[:.]/g, "")}-seed-${seed}`);
  const command = `pnpm bughunt run --lane ${lane} --seed ${seed}`;
  const selectedLanes = lane === "all" ? ["corpus", "invariants"] : [lane];
  const cases = inlineCases().slice(0, Number.parseInt(String(parsed.values.sample ?? "50"), 10));
  const artifacts = createRunArtifacts({
    rootDir,
    runId,
    seed,
    command,
    lanes: selectedLanes,
    startedAt,
  });

  for (const selectedLane of selectedLanes) {
    const findings =
      selectedLane === "corpus"
        ? runCorpusLane({
            runId,
            command,
            cases,
            slowMs: Number.parseInt(String(parsed.values["slow-ms"] ?? "250"), 10),
          })
        : selectedLane === "invariants"
          ? runInvariantLane({ runId, command, cases })
          : [];

    for (const finding of findings) artifacts.writeFinding(finding);
  }

  artifacts.finalize({ finishedAt: new Date().toISOString() });
  console.log(`bughunt run written to ${artifacts.runDir}`);
  return 0;
}
```

- [ ] **Step 5: Implement dispatcher**

Create `scripts/bughunt/index.ts`:

```ts
import { usage } from "./cli";
import { runBughunt } from "./commands/run";

export async function runCommand(argv: string[] = process.argv.slice(2)): Promise<number> {
  const [command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h") {
    console.log(usage());
    return command ? 0 : 1;
  }

  if (command === "run") {
    return runBughunt(rest);
  }

  console.error(`Unknown bughunt command: ${command}\n\n${usage()}`);
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCommand().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
```

- [ ] **Step 6: Run command tests**

Run:

```bash
pnpm exec vitest run tests/bughunt/commands.test.ts
```

Expected: passes.

- [ ] **Step 7: Smoke-test CLI**

Run:

```bash
pnpm bughunt run --lane invariants --seed 1234 --sample 3
```

Expected: prints `bughunt run written to ...` and creates `.bughunt/latest.json`.

---

## Task 6: Implement `inspect`

**Files:**
- Create: `scripts/bughunt/commands/inspect.ts`
- Modify: `scripts/bughunt/index.ts`
- Modify: `scripts/bughunt/cli.ts`
- Modify: `tests/bughunt/commands.test.ts`

- [ ] **Step 1: Add failing inspect test**

Append to `tests/bughunt/commands.test.ts`:

```ts
import { createRunArtifacts } from "../../scripts/bughunt/core/artifacts";
import { buildFinding, findingSignature } from "../../scripts/bughunt/core/findings";

describe("bughunt inspect", () => {
  it("prints one finding from latest.json", async () => {
    const root = mkdtempSync(join(tmpdir(), "bughunt-inspect-"));
    tempDirs.push(root);
    const artifacts = createRunArtifacts({
      rootDir: root,
      runId: "inspect-run",
      seed: 1,
      command: "pnpm bughunt run --lane invariants --seed 1",
      lanes: ["invariants"],
      startedAt: "2026-05-20T14:30:00.000Z",
    });
    const finding = buildFinding({
      runId: "inspect-run",
      lane: "invariants",
      severity: "invariant",
      source: { kind: "inline", key: "inspect-case" },
      command: "pnpm bughunt run --lane invariants --seed 1",
      signature: findingSignature("span_bounds", "bad span"),
      message: "bad span",
      contextSnippet: "Smith v. Jones",
    });
    artifacts.writeFinding(finding);
    artifacts.finalize({ finishedAt: "2026-05-20T14:31:00.000Z" });

    const exitCode = await runCommand(["inspect", join(root, "latest.json"), "--id", finding.id]);
    expect(exitCode).toBe(0);
  });
});
```

- [ ] **Step 2: Implement inspect command**

Create `scripts/bughunt/commands/inspect.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import type { BughuntFinding } from "../core/types";

export async function inspectFinding(args: string[]): Promise<number> {
  const parsed = parseArgs({
    args,
    allowPositionals: true,
    options: {
      id: { type: "string" },
    },
  });
  const target = parsed.positionals[0] ?? ".bughunt/latest.json";
  const id = parsed.values.id;
  if (!id) {
    console.error("inspect requires --id <finding-id>");
    return 1;
  }

  const runDir = resolveRunDir(target);
  const findingsPath = join(runDir, "findings.jsonl");
  if (!existsSync(findingsPath)) {
    console.error(`findings file not found: ${findingsPath}`);
    return 1;
  }

  const finding = readJsonLines<BughuntFinding>(findingsPath).find((f) => f.id === id);
  if (!finding) {
    console.error(`finding not found: ${id}`);
    return 1;
  }

  console.log(formatFinding(finding));
  return 0;
}

function resolveRunDir(target: string): string {
  if (target.endsWith("latest.json")) {
    const latest = JSON.parse(readFileSync(target, "utf8")) as { runDir: string };
    return latest.runDir.startsWith(".") ? join(dirname(target), latest.runDir.replace(/^\.bughunt\//, "")) : latest.runDir;
  }
  return target;
}

function readJsonLines<T>(path: string): T[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function formatFinding(finding: BughuntFinding): string {
  return [
    `Finding ${finding.id}`,
    `Lane: ${finding.lane}`,
    `Severity: ${finding.severity}`,
    `Source: ${finding.source.kind}${finding.source.key ? ` ${finding.source.key}` : ""}`,
    `Signature: ${finding.signature}`,
    `Message: ${finding.message}`,
    finding.contextSnippet ? `Context: ${finding.contextSnippet}` : "",
    `Command: ${finding.command}`,
  ]
    .filter(Boolean)
    .join("\n");
}
```

- [ ] **Step 3: Wire inspect into dispatcher**

Modify `scripts/bughunt/index.ts`:

```ts
import { usage } from "./cli";
import { inspectFinding } from "./commands/inspect";
import { runBughunt } from "./commands/run";

export async function runCommand(argv: string[] = process.argv.slice(2)): Promise<number> {
  const [command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h") {
    console.log(usage());
    return command ? 0 : 1;
  }

  if (command === "run") return runBughunt(rest);
  if (command === "inspect") return inspectFinding(rest);

  console.error(`Unknown bughunt command: ${command}\n\n${usage()}`);
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCommand().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
```

- [ ] **Step 4: Run command tests**

Run:

```bash
pnpm exec vitest run tests/bughunt/commands.test.ts
```

Expected: passes.

---

## Task 7: Implement `promote` Preview

**Files:**
- Create: `scripts/bughunt/commands/promote.ts`
- Modify: `scripts/bughunt/index.ts`
- Modify: `tests/bughunt/commands.test.ts`

- [ ] **Step 1: Add failing promote preview test**

Append to `tests/bughunt/commands.test.ts`:

```ts
describe("bughunt promote", () => {
  it("previews a Vitest regression for one finding", async () => {
    const root = mkdtempSync(join(tmpdir(), "bughunt-promote-"));
    tempDirs.push(root);
    const artifacts = createRunArtifacts({
      rootDir: root,
      runId: "promote-run",
      seed: 1,
      command: "pnpm bughunt run --lane invariants --seed 1",
      lanes: ["invariants"],
      startedAt: "2026-05-20T14:30:00.000Z",
    });
    const finding = buildFinding({
      runId: "promote-run",
      lane: "invariants",
      severity: "invariant",
      source: { kind: "inline", key: "promote-case" },
      command: "pnpm bughunt run --lane invariants --seed 1",
      signature: findingSignature("span_bounds", "bad span"),
      message: "bad span",
      input: "Smith v. Jones, 1 U.S. 1 (1801).",
      contextSnippet: "Smith v. Jones, 1 U.S. 1 (1801).",
    });
    artifacts.writeFinding(finding);
    artifacts.finalize({ finishedAt: "2026-05-20T14:31:00.000Z" });

    const exitCode = await runCommand(["promote", join(root, "latest.json"), "--id", finding.id]);
    expect(exitCode).toBe(0);
  });
});
```

- [ ] **Step 2: Implement promote command**

Create `scripts/bughunt/commands/promote.ts`:

```ts
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import type { BughuntFinding } from "../core/types";

export async function promoteFinding(args: string[]): Promise<number> {
  const parsed = parseArgs({
    args,
    allowPositionals: true,
    options: {
      id: { type: "string" },
      write: { type: "boolean", default: false },
    },
  });
  const target = parsed.positionals[0] ?? ".bughunt/latest.json";
  const id = parsed.values.id;
  if (!id) {
    console.error("promote requires --id <finding-id>");
    return 1;
  }

  const runDir = resolveRunDir(target);
  const finding = readJsonLines<BughuntFinding>(join(runDir, "findings.jsonl")).find((f) => f.id === id);
  if (!finding) {
    console.error(`finding not found: ${id}`);
    return 1;
  }

  const sourceText = finding.minimalInput ?? finding.input ?? finding.contextSnippet ?? "";
  const testName = `preserves bughunt finding ${finding.id}`;
  const testSource = [
    'import { describe, expect, it } from "vitest";',
    'import { extractCitations } from "../../src/index";',
    "",
    'describe("bughunt promoted regression", () => {',
    `  it(${JSON.stringify(testName)}, () => {`,
    `    // Source: ${finding.command}`,
    `    // Finding: ${finding.id} ${finding.signature}`,
    `    const text = ${JSON.stringify(sourceText)};`,
    "    const citations = extractCitations(text, { resolve: true });",
    "    expect(citations.length).toBeGreaterThan(0);",
    "  });",
    "});",
    "",
  ].join("\n");

  if (parsed.values.write) {
    console.error("promote --write is intentionally deferred; preview the test and place it manually");
    return 1;
  }

  console.log(testSource);
  return 0;
}

function resolveRunDir(target: string): string {
  if (target.endsWith("latest.json")) {
    const latest = JSON.parse(readFileSync(target, "utf8")) as { runDir: string };
    return latest.runDir.startsWith(".") ? join(dirname(target), latest.runDir.replace(/^\.bughunt\//, "")) : latest.runDir;
  }
  return target;
}

function readJsonLines<T>(path: string): T[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}
```

- [ ] **Step 3: Wire promote into dispatcher**

Modify `scripts/bughunt/index.ts`:

```ts
import { usage } from "./cli";
import { inspectFinding } from "./commands/inspect";
import { promoteFinding } from "./commands/promote";
import { runBughunt } from "./commands/run";

export async function runCommand(argv: string[] = process.argv.slice(2)): Promise<number> {
  const [command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h") {
    console.log(usage());
    return command ? 0 : 1;
  }

  if (command === "run") return runBughunt(rest);
  if (command === "inspect") return inspectFinding(rest);
  if (command === "promote") return promoteFinding(rest);

  console.error(`Unknown bughunt command: ${command}\n\n${usage()}`);
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCommand().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
```

- [ ] **Step 4: Run command tests**

Run:

```bash
pnpm exec vitest run tests/bughunt/commands.test.ts
```

Expected: passes.

---

## Task 8: Add `fast-check` Mutation Lane

**Files:**
- Create: `scripts/bughunt/lanes/mutate.ts`
- Modify: `scripts/bughunt/commands/run.ts`
- Modify: `tests/bughunt/core.test.ts`

- [ ] **Step 1: Add failing mutation lane test**

Append to `tests/bughunt/core.test.ts`:

```ts
import { runMutationLane } from "../../scripts/bughunt/lanes/mutate";

describe("bughunt mutation lane", () => {
  it("runs deterministic generated mutation checks", () => {
    const findings = runMutationLane({
      runId: "mutate-run",
      command: "pnpm bughunt run --lane mutate --seed 1234",
      seed: 1234,
      numRuns: 10,
    });

    expect(Array.isArray(findings)).toBe(true);
  });
});
```

- [ ] **Step 2: Implement mutation lane**

Create `scripts/bughunt/lanes/mutate.ts`:

```ts
import * as fc from "fast-check";
import { buildFinding, findingSignature } from "../core/findings";
import { runExtraction } from "../core/extract";
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
  const findings: BughuntFinding[] = [];
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

  if (details.failed) {
    findings.push(
      buildFinding({
        runId: input.runId,
        lane: "mutate",
        severity: "invariant",
        source: {
          kind: "synthetic",
          seed: details.seed,
          path: details.counterexamplePath ?? undefined,
        },
        command: input.command,
        signature: findingSignature("mutation_property", String(details.errorInstance?.message ?? "property failed")),
        message: String(details.errorInstance?.message ?? "mutation property failed"),
        input: JSON.stringify(details.counterexample),
        contextSnippet: JSON.stringify(details.counterexample),
        after: {
          numRuns: details.numRuns,
          numShrinks: details.numShrinks,
          numSkips: details.numSkips,
        },
      }),
    );
  }

  return findings;
}

function mutatedCitationInput(): fc.Arbitrary<MutatedCitationInput> {
  return fc
    .record({
      leftBreak: fc.constantFrom(" ", "\n", "\n\n", " <span>"),
      rightBreak: fc.constantFrom(" ", "\n", "</span> ", "  "),
      reporter: fc.constantFrom("U.S.", "F.3d", "N.Y.3d"),
      year: fc.integer({ min: 1800, max: 2026 }),
    })
    .map(({ leftBreak, rightBreak, reporter, year }) => ({
      text: `Smith v.${leftBreak}Jones, 1${rightBreak}${reporter} 1 (${year}).`,
    }));
}
```

- [ ] **Step 3: Wire mutation lane into run command**

Modify `scripts/bughunt/commands/run.ts` so selected lanes include `mutate` for `all`:

```ts
import { resolve } from "node:path";
import { createRunArtifacts } from "../core/artifacts";
import { inlineCases } from "../core/corpus";
import { runCorpusLane } from "../lanes/corpus";
import { runInvariantLane } from "../lanes/invariants";
import { runMutationLane } from "../lanes/mutate";
import { parseRunArgs } from "../cli";

export async function runBughunt(args: string[]): Promise<number> {
  const parsed = parseRunArgs(args);
  const lane = String(parsed.values.lane ?? "all");
  const seed = parsed.values.seed ? Number.parseInt(String(parsed.values.seed), 10) : Date.now();
  const rootDir = resolve(String(parsed.values.root ?? ".bughunt"));
  const startedAt = new Date().toISOString();
  const runId = String(parsed.values["run-id"] ?? `${startedAt.replace(/[:.]/g, "")}-seed-${seed}`);
  const command = `pnpm bughunt run --lane ${lane} --seed ${seed}`;
  const selectedLanes = lane === "all" ? ["corpus", "invariants", "mutate"] : [lane];
  const cases = inlineCases().slice(0, Number.parseInt(String(parsed.values.sample ?? "50"), 10));
  const artifacts = createRunArtifacts({
    rootDir,
    runId,
    seed,
    command,
    lanes: selectedLanes,
    startedAt,
  });

  for (const selectedLane of selectedLanes) {
    const findings =
      selectedLane === "corpus"
        ? runCorpusLane({
            runId,
            command,
            cases,
            slowMs: Number.parseInt(String(parsed.values["slow-ms"] ?? "250"), 10),
          })
        : selectedLane === "invariants"
          ? runInvariantLane({ runId, command, cases })
          : selectedLane === "mutate"
            ? runMutationLane({
                runId,
                command,
                seed,
                numRuns: Number.parseInt(String(parsed.values.sample ?? "50"), 10),
              })
            : [];

    for (const finding of findings) artifacts.writeFinding(finding);
  }

  artifacts.finalize({ finishedAt: new Date().toISOString() });
  console.log(`bughunt run written to ${artifacts.runDir}`);
  return 0;
}
```

- [ ] **Step 4: Run mutation tests**

Run:

```bash
pnpm exec vitest run tests/bughunt/core.test.ts
```

Expected: passes.

- [ ] **Step 5: Smoke-test mutation CLI**

Run:

```bash
pnpm bughunt run --lane mutate --seed 1234 --sample 25
```

Expected: run completes and writes `.bughunt/latest.json`.

---

## Task 9: Verification And Cleanup

**Files:**
- Modify only files touched by prior tasks if verification reveals issues.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
pnpm exec vitest run tests/bughunt/core.test.ts tests/bughunt/commands.test.ts
```

Expected: passes.

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint
```

Expected: passes. If Biome reports formatting or style issues in `scripts/bughunt` or `tests/bughunt`, fix the exact reported files.

- [ ] **Step 3: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: passes. If `tsconfig.json` does not typecheck scripts because it includes only `src`, use Vitest and Biome as the script checks for this v1 and record that limitation in the final response.

- [ ] **Step 4: Run CLI smoke test**

Run:

```bash
pnpm bughunt run --lane all --seed 1234 --sample 5
```

Expected: prints a run directory and writes `.bughunt/latest.json`.

- [ ] **Step 5: Inspect one finding when present**

Run:

```bash
node -e "const fs=require('fs'); const latest=JSON.parse(fs.readFileSync('.bughunt/latest.json','utf8')); const f=fs.readFileSync(`${latest.runDir}/findings.jsonl`,'utf8').trim().split('\n').filter(Boolean)[0]; if (f) console.log(JSON.parse(f).id)"
```

If it prints an ID, run:

```bash
pnpm bughunt inspect .bughunt/latest.json --id <printed-id>
```

Expected: prints finding details. If no ID is printed, note that the smoke run produced no findings.

- [ ] **Step 6: Check public package surface**

Run:

```bash
node -e "const p=require('./package.json'); if (p.bin) throw new Error('unexpected public bin'); if (JSON.stringify(p.exports).includes('bughunt')) throw new Error('unexpected public export'); console.log('internal-only CLI confirmed')"
```

Expected:

```text
internal-only CLI confirmed
```

- [ ] **Step 7: Review git status before handoff**

Run:

```bash
git status --short
```

Expected: only intended files from this plan are modified, plus pre-existing unrelated local files. Do not stage unrelated files.

---

## Notes For The Implementing Agent

- This plan intentionally keeps `promote --write` deferred. Preview-only promotion is enough for v1 and avoids accidental test churn.
- The first corpus implementation uses inline cases. CAP zip loading can be added after the artifact and command loop is working.
- The mutation lane property is intentionally conservative: it checks that generated citation-like strings do not crash and still yield at least one citation. Stronger semantic invariants should be added after the first local loop is usable.
- Do not expose the CLI publicly. It stays under `scripts/` and package `scripts`.
- Do not commit `.bughunt/` artifacts.
