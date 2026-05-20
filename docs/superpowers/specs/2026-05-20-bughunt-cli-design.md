# Design: Internal Bughunt CLI

**Date:** 2026-05-20
**Status:** Draft for user review
**Related research:** [`docs/research/2026-05-20-bughunt-cli-best-practices.md`](../../research/2026-05-20-bughunt-cli-best-practices.md)

## Background

`eyecite-ts` already has a strong but fragmented local bug-hunting surface:

- one-off repro scripts under `scripts/repro-*`
- audit scripts under `scripts/audit-*`
- CAP corpus sampling in `scripts/sample-and-judge.ts`
- accumulated judge artifacts under `scripts/judge/*`
- many promoted Vitest regressions under `tests/`

Python `eyecite` has a useful PR benchmark that compares extraction output against `main` on a real CourtListener sample. That model is worth adapting later, but this design optimizes for local bug hunting first. The goal is a repo-local CLI that helps an implementer run focused sweeps, inspect failures, minimize inputs, and promote the best findings into durable tests.

## Goals

1. Provide a single internal entry point: `pnpm bughunt`.
2. Preserve reproducibility for every finding: command, lane, seed, source key, input, minimal input when available, and failure signature.
3. Consolidate existing audit/repro logic instead of creating another parallel script family.
4. Make generated-input lanes use `fast-check` where shrinking and replay are valuable.
5. Keep all artifacts local by default under `.bughunt/`.
6. Keep the CLI private to the repository. It is development tooling, not a package feature.

## Non-Goals

- No public `bin` in `package.json`.
- No export path or `dist` output for the CLI.
- No PR comment workflow in v1.
- No AI judging in the deterministic core.
- No automatic GitHub artifact branch.
- No CourtListener CSV download in v1.
- No broad rewrite of every existing audit script before the first useful run.

## Architecture

Add a new internal script module:

```text
scripts/bughunt/
  index.ts                 # subcommand dispatcher
  cli.ts                   # parseArgs helpers, usage text
  commands/
    run.ts
    inspect.ts
    promote.ts
    report.ts
    diff.ts
  core/
    artifacts.ts           # .bughunt writer and latest.json management
    findings.ts            # finding IDs, signatures, JSONL serialization
    rng.ts                 # deterministic PRNG
    corpus.ts              # fixtures + CAP corpus loading
    extract.ts             # safe extraction wrappers and timing
    invariants.ts          # shared citation/span/resolution checks
    minimize.ts            # minimizer interfaces and structural minimizer
  lanes/
    corpus.ts
    invariants.ts
    mutate.ts
    resolver.ts
    annotate.ts
    perf.ts
```

Wire it through a package script:

```json
{
  "scripts": {
    "bughunt": "tsx scripts/bughunt/index.ts"
  }
}
```

The CLI uses `node:util.parseArgs` for v1. If subcommand ergonomics become costly, move to Commander later. That should be a follow-up decision, not a first dependency.

## Dependencies

Add dev dependencies:

| Dependency | Use |
|---|---|
| `tsx` | Run TypeScript CLI scripts without a build step. |
| `fast-check` | Generated mutation and resolver stress lanes with shrinking/replay. |
| `adm-zip` | Read local CAP corpus zip volumes, matching existing scripts. |

Defer `commander`, `tinybench`, `zod`, `p-limit`, AI SDKs, and CSV/BZip libraries.

## CLI Surface

### `run`

```bash
pnpm bughunt run --lane all --sample 200 --seed 1234
pnpm bughunt run --lane resolver --focus supra --seed 1234
pnpm bughunt run --lane mutate --num-runs 1000 --seed 1234
pnpm bughunt run --lane perf --timeout-ms 1000 --seed 1234
```

Responsibilities:

- create a new `.bughunt/runs/<timestamp>-seed-<seed>/` directory
- run selected lanes
- stream JSONL events
- write `manifest.json`, `findings.jsonl`, `cases.jsonl`, `events.jsonl`, `report.json`, and `summary.md`
- update `.bughunt/latest.json`
- print a compact terminal summary with reproduction commands

### `inspect`

```bash
pnpm bughunt inspect .bughunt/latest.json --id F123
```

Responsibilities:

- resolve `.bughunt/latest.json` to its run directory
- locate one finding by ID
- print the source key, lane, command, signature, input/minimal input, relevant citations, resolver target, spans, and suggested test

### `promote`

```bash
pnpm bughunt promote .bughunt/latest.json --id F123
pnpm bughunt promote .bughunt/latest.json --id F123 --write
```

Default behavior is preview-only. With `--write`, the command writes either:

- a fixture under `tests/fixtures/bughunt/`, or
- a focused test file under the nearest matching test area.

Promoted tests must include the finding ID, original command, seed/path/replay data, source key if any, minimized input, and expected behavior.

### `report`

```bash
pnpm bughunt report .bughunt/latest.json
pnpm bughunt report .bughunt/runs/2026-05-20T143000Z-seed-1234 --format markdown
```

Responsibilities:

- summarize findings by lane, severity, type, and signature
- list top crash signatures and perf outliers
- produce Markdown suitable for a local handoff or later PR comment

### `diff`

```bash
pnpm bughunt diff .bughunt/runs/before .bughunt/runs/after
```

Responsibilities:

- compare finding IDs and signatures across two runs
- report fixed, new, and persistent findings
- report citation-count, type-count, span, and resolver-target deltas when both runs contain comparable cases

## Artifacts

Use local-only artifacts:

```text
.bughunt/
  latest.json
  runs/
    2026-05-20T143000Z-seed-1234/
      manifest.json
      findings.jsonl
      cases.jsonl
      events.jsonl
      report.json
      summary.md
```

`.bughunt/` must be gitignored.

`latest.json` is a small pointer instead of a symlink:

```json
{
  "runDir": ".bughunt/runs/2026-05-20T143000Z-seed-1234",
  "createdAt": "2026-05-20T14:30:00.000Z"
}
```

## Finding Schema

```ts
export type BughuntSeverity =
  | "crash"
  | "invariant"
  | "suspicious"
  | "perf"
  | "diff";

export interface BughuntFinding {
  id: string;
  runId: string;
  lane: string;
  severity: BughuntSeverity;
  source: {
    kind: "cap" | "fixture" | "synthetic" | "inline";
    key?: string;
    seed?: number;
    path?: string;
    replayPath?: string;
  };
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
```

IDs are stable hashes over lane, source key, signature, and normalized snippet. Stable IDs make `inspect`, `diff`, and `promote` reliable across repeated runs.

## Lanes

### Corpus

Runs extraction and optional resolution over real documents.

Sources:

- `tests/fixtures/*.json`
- local CAP corpus when available through `CAP_ROOT`
- existing `scripts/judge` processed keys as replay inputs when useful

Findings:

- extraction crash
- resolution crash
- suspicious count/type outlier
- suspicious long match
- slow document
- span outside source bounds

### Invariants

Checks impossible internal states on extracted citations:

- non-empty clean and original spans
- original spans inside source bounds
- matched text reconciles with source slice under documented normalization
- `fullSpan` contains the citation core and case name when present
- citations are sorted by original position
- no incoherent overlap except documented parallel/parenthetical cases
- type-specific metadata is internally consistent

### Mutate

Uses `fast-check` and domain-specific generators.

Mutations:

- whitespace expansion and collapse
- line breaks inside citation-like tokens
- HTML tag insertion
- smart quotes, NBSP, em dash variants
- footnote marker insertion
- punctuation movement around parentheticals
- OCR-like near misses where semantics are intended to remain stable

Use `fc.check` so the CLI can serialize structured run details. Persist `seed`, `counterexamplePath`, `counterexample`, `numRuns`, `numShrinks`, and replay config. Replay normal failures with `{ seed, path, endOnFailure: true }`.

### Resolver

Generates and audits short-form chains:

- full case citation followed by `Id.`
- unresolved short form followed by `Id.`
- supra with distractor full citations
- full captions with overlapping party halves
- footnote/body scope boundaries
- parenthetical child citations
- parallel citations and subsequent history

Findings:

- future target
- self target
- wrong generated-model target
- `Id.` crosses a strict scope boundary
- supra or short form prefers a distractor over the intended antecedent

### Annotate

Runs annotation on extracted spans and checks:

- annotation preserves source text order
- inserted tags are balanced
- adjacent and overlapping citations are deterministic
- original offsets are used for source annotation, not clean offsets

### Perf

Runs pathological regex and cleaner inputs in child-process isolation.

Findings:

- timeout
- duration over threshold
- memory/exit failure when observable

Perf lane uses coarse per-case timing in v1. Vitest bench can be added later if microbenchmarking becomes useful.

## Minimization

Use two paths:

1. Real document structural minimizer:
   - paragraph deletion
   - window narrowing around relevant citations
   - line deletion
   - token deletion
   - whitespace normalization toggles

2. Generated-input minimizer:
   - rely on `fast-check` shrinking
   - preserve `seed`, `path`, and future `replayPath`
   - optionally replay external examples with `examples` and `numRuns: 1`

Every minimized finding keeps the original source reference and original input or context snippet.

## Error Handling

- A lane failure should not corrupt the run directory.
- Crashes are findings unless the CLI itself cannot continue.
- Invalid CLI options exit non-zero with usage text.
- Missing optional CAP corpus disables CAP source with a warning; fixture and synthetic lanes still run.
- Perf/ReDoS candidates run in child processes with hard timeouts because event-loop blocking cannot be cancelled reliably in-process.
- Artifact writes are append-only JSONL during a run, then summarized at the end.

## Testing

Implementation should add focused tests for:

- CLI option parsing and invalid option behavior
- artifact writer and `.bughunt/latest.json`
- stable finding ID generation
- invariant checks on small inline examples
- `fast-check` failure serialization using a deterministic seed
- `inspect` output for a fixture finding
- `promote` preview output

Do not begin by asserting exact output for every terminal line. Stable artifact shape matters more than terminal formatting.

## Rollout

Phase 1 should build a thin but usable loop:

1. package script and dev dependencies
2. CLI dispatcher
3. artifact writer
4. `corpus` and `invariants` lanes by extracting shared logic from existing scripts
5. `inspect`
6. `promote` preview

Phase 2 adds generated mutation and resolver lanes with `fast-check`.

Phase 3 adds annotation/perf lanes, diff/report polish, and optional `--write` promotion.

CI/PR-comment integration should wait until the local artifacts prove useful.
