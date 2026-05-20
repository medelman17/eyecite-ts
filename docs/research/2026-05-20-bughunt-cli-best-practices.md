# Research: Local Bughunt CLI for eyecite-ts

**Date:** 2026-05-20
**Query:** Deep dive on best practices, dependencies, and architecture for a repo-local eyecite-ts bug-hunting CLI inspired by Python eyecite's PR benchmark, optimized for local discovery rather than public API or CI gating.
**Depth:** deep
**Status:** Recommends a dependency-light internal CLI that consolidates existing audit/repro scripts into reproducible local runs.

## Summary

Build a repo-local `pnpm bughunt` CLI, but keep the first version small and deterministic. The core should use Node's built-in argument parsing, local JSONL artifacts, deterministic seeds, and custom domain-specific generators. Add `fast-check` where shrinking and replay help, add `tsx` so TypeScript scripts run predictably, and use `adm-zip` only for CAP corpus loading if that corpus remains the primary real-world source.

Do not expose the CLI as a package binary. Do not make AI judging, PR comments, GitHub artifacts, or Python-compatible CourtListener CSV benchmarking the first milestone. Those are useful later lanes, but the local bug-hunting product is: run a focused lane, get a small repro, preserve the seed, inspect the exact invariant failure, and promote it into a Vitest regression.

## Current Repo Context

The repository already has many local exploratory scripts:

- `scripts/sample-and-judge.ts`: CAP corpus sampling plus optional Anthropic judging.
- `scripts/audit-crashes.ts`: seeded CAP crash hunt.
- `scripts/audit-span-fidelity.ts`: span and full-span invariant audit over CAP plus synthetic HTML/Unicode/footnote transforms.
- `scripts/audit-annotate-roundtrip.ts`, `scripts/audit-resolution.ts`, `scripts/audit-perf-outliers.ts`, and many `scripts/repro-*` files.
- `scripts/judge/*`: large accumulated JSONL/text/log outputs from previous sampling runs.

This means v1 should consolidate rather than invent. The first milestone should factor shared pieces: argument parsing, corpus loading, seeded sampling, finding schema, artifact writer, invariant runners, and promotion.

## Recommended CLI Shape

```bash
pnpm bughunt run --lane all --sample 200 --seed 1234
pnpm bughunt run --lane resolver --focus supra --seed 1234
pnpm bughunt inspect .bughunt/latest.json --id F123
pnpm bughunt minimize .bughunt/runs/2026-05-20T.../findings.jsonl --id F123
pnpm bughunt promote .bughunt/runs/2026-05-20T.../findings.jsonl --id F123
pnpm bughunt diff .bughunt/runs/before .bughunt/runs/after
pnpm bughunt report .bughunt/runs/2026-05-20T...
```

Package wiring:

```json
{
  "scripts": {
    "bughunt": "tsx scripts/bughunt/index.ts"
  }
}
```

Keep it internal:

- no `bin`
- no export path
- no `dist` entry
- no public CLI docs in the package README yet
- `.bughunt/` gitignored

## Dependency Recommendations

### Add in v1

| Dependency | Type | Why | Notes |
|---|---:|---|---|
| `tsx` | dev | Predictable TypeScript script execution from `pnpm bughunt` | Existing package scripts already assume `tsx` through `npx tsx`; make it explicit. |
| `fast-check` | dev | Property-based mutation lanes with shrinking, seed replay, and bounded runs | Use for synthetic/metamorphic inputs, not for every lane. |
| `adm-zip` | dev | Read local CAP zip volumes, matching existing scripts | Acceptable for local-only corpus loading. Revisit if streaming large zips becomes necessary. |

### Defer

| Dependency | Decision | Rationale |
|---|---|---|
| `commander` | Defer | Good CLI framework, but v1 can use Node `util.parseArgs` plus a small subcommand dispatcher. |
| `tinybench` | Defer as direct dep | Vitest already uses Tinybench for benchmark mode; the bughunt CLI mostly needs per-document timing and outlier detection, not microbench precision. |
| `zod` | Defer | Useful for AI output and external artifact validation, but hand-typed artifact writers are enough for deterministic v1. |
| `p-limit` | Avoid | A tiny internal worker pool is enough and avoids another dep. |
| `@anthropic-ai/sdk` | Optional plugin only | AI judging is powerful but non-deterministic, costly, and not part of the core local bughunt loop. |
| CSV/BZip libraries | Defer | Start from existing CAP zip corpus and fixtures. Add CourtListener CSV support after the local harness is stable. |

## Why These Choices

### CLI Parsing

Node's `node:util.parseArgs` returns structured `values` and `positionals` from a declared option spec, which is enough for an internal CLI with a handful of subcommands. This avoids a dependency while keeping parsing less brittle than manual `process.argv` slicing. If help text, nested commands, and validation become painful, migrate to Commander later; Commander is a mature and lightweight Node CLI framework, but it does not need to be in v1.

Recommendation:

- Use `parseArgs` per subcommand.
- Treat the first positional as the command.
- Keep command modules explicit: `run.ts`, `inspect.ts`, `promote.ts`, `diff.ts`, `report.ts`.
- Add a small hand-written `help()` function instead of a CLI framework.

### TypeScript Execution

Use `tsx` explicitly as a dev dependency. It runs TypeScript/ESM scripts without a build step and supports watch mode, which is useful for iterating on the CLI itself. Because this is repo-local tooling, the extra dev dependency does not affect the runtime package.

### Property-Based Testing and Mutations

`fast-check` is valuable because it generates inputs, runs assertions across many cases, shrinks failures to smaller counterexamples, and exposes seed/path configuration for replay. Its docs also support model-based testing, but we should not start there.

Use `fast-check` for:

- whitespace/HTML/Unicode mutation of a known citation snippet
- citation-chain generation for resolver stress
- punctuation, parenthetical, and OCR-noise mutation
- footnote boundary mutation

Do not use `fast-check` for:

- walking the CAP corpus
- comparing branch-level corpus outputs
- replacing domain-specific generators

The right model is "domain generator first, fast-check runner/shrinker second." For real corpus failures, use a custom minimizer; property shrinkers are not ideal when the failing input is a whole opinion from disk.

Recommended `fast-check` API usage for the CLI:

- Use `fc.check(property, params)` rather than only `fc.assert(...)` inside the CLI. `check` returns structured run details that can be serialized into `findings.jsonl` instead of scraping thrown error text.
- Persist `seed`, `counterexamplePath`, `counterexample`, `numRuns`, `numShrinks`, `numSkips`, and the run configuration for every generated-input failure.
- Replay normal property failures with `{ seed, path, endOnFailure: true }`. `endOnFailure` skips re-shrinking and jumps straight to the counterexample path when inspecting a known finding.
- Replay external failures with `examples: [[...valueTuple]]` and `numRuns: 1` when the source is not a fast-check-generated case but we want fast-check to try shrinking it.
- Use `verbose: 1` only for debug runs or minimized repro work. `verbose: 2` can capture successes and skipped cases as an execution tree, but it is too noisy for normal bughunt artifacts.
- For future command/model-based resolver tests, persist both `seed`/`path` for `fc.assert` and `replayPath` for `fc.commands(...)`. That combination replays the minimal failing command sequence.

Example local wrapper shape:

```ts
const details = fc.check(
  fc.property(domainCitationMutation(), (input) => {
    const citations = extractCitations(input.text, input.options);
    return invariantHolds(input, citations);
  }),
  {
    seed,
    numRuns,
    endOnFailure: false,
    verbose: debug ? 1 : 0,
  },
);

if (details.failed) {
  writeFinding({
    seed: details.seed,
    path: details.counterexamplePath,
    counterexample: details.counterexample,
    numRuns: details.numRuns,
    numShrinks: details.numShrinks,
  });
}
```

### Minimize Strategy

Use two minimizers:

1. **Structural minimizer for real documents**
   - paragraph deletion
   - sentence/window narrowing around citations
   - line deletion
   - token deletion
   - whitespace normalization toggles

2. **fast-check shrinking for generated inputs**
   - record `seed`, `path`, and, for model/command-based generators, `replayPath`
   - emit a reproduction command and a Vitest skeleton

Every finding should preserve the original input reference even when a minimized input exists.

### ReDoS and Timeout Isolation

Citation extraction is regex-heavy. OWASP describes ReDoS as crafted inputs causing regex engines to hit extreme slow paths, and JavaScript/Node regex work can block the event loop. For performance and ReDoS lanes, in-process timeouts are not enough.

Recommendation:

- Run normal invariant/corpus lanes in-process for speed.
- Run ReDoS/perf-probe cases in a child process with a hard timeout.
- Prefer `child_process.execFile`/`fork` over shell execution.
- Capture timeout findings as first-class findings with `phase`, `durationMs`, `timeoutMs`, `inputLength`, and a minimized input.

### Benchmarking

Do not begin with microbenchmarks. Python eyecite's benchmark is closer to a corpus differential and throughput chart than a rigorous microbenchmark. For local bug hunting, use:

- per-document elapsed time
- per-lane elapsed time
- slowest N documents
- timeout findings
- before/after diff across two bughunt runs

If we later add microbenchmarks, use Vitest's `bench` mode instead of adding a separate benchmark stack. Vitest benchmark mode uses Tinybench underneath and can output JSON for comparison.

## Artifact Design

Write all local outputs under `.bughunt/runs/<timestamp>-<seed>/`.

Use files:

```text
.bughunt/
  latest.json
  runs/
    2026-05-20T143000Z-seed-1234/
      manifest.json
      findings.jsonl
      cases.jsonl
      events.jsonl
      summary.md
      report.json
```

Avoid a `latest` symlink. Symlinks are awkward on Windows and in some sandboxed environments. Use `.bughunt/latest.json`:

```json
{
  "runDir": ".bughunt/runs/2026-05-20T143000Z-seed-1234",
  "createdAt": "2026-05-20T14:30:00.000Z"
}
```

Finding shape:

```ts
type BughuntFinding = {
  id: string;
  runId: string;
  lane: string;
  severity: "crash" | "invariant" | "suspicious" | "perf" | "diff";
  source: {
    kind: "cap" | "fixture" | "synthetic" | "inline";
    key?: string;
    seed?: number;
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
};
```

Finding IDs should be stable hashes of lane, source key, signature, and the relevant normalized snippet. Stable IDs make `inspect`, `diff`, and `promote` usable across repeated runs.

## Lane Design

### 1. Corpus Sweep

Purpose: find crashes, suspicious extraction behavior, and performance outliers in real opinions.

Sources:

- existing CAP corpus loader
- `tests/fixtures/*.json`
- later: CourtListener CSV/BZip lane

Checks:

- extraction does not crash
- resolution does not crash
- citation count outliers
- type distribution outliers
- slow documents
- suspicious long matches
- citation spans outside source bounds

### 2. Invariant Sweep

Purpose: catch impossible internal states.

Checks:

- `span.cleanEnd > span.cleanStart`
- `span.originalEnd > span.originalStart`
- original span within source bounds
- matched text can be related back to source slice under documented normalization
- `fullSpan` contains the core citation and, when applicable, case name
- citations sorted by original span
- no incoherent overlaps except documented parenthetical/parallel cases
- metadata fields match type expectations

### 3. Metamorphic Mutation

Purpose: take known snippets and perturb them without changing the intended citation semantics.

Mutations:

- whitespace expansion/collapse
- line breaks between reporter tokens
- smart quotes, em dashes, NBSP
- HTML tag insertion between words
- footnote marker insertion
- OCR confusions like `l`/`1`, `O`/`0` where safe
- parenthetical wrapping and punctuation movement

Checks:

- core citation still found
- type remains stable
- original span remains valid
- resolver target remains stable when mutation should be semantics-preserving

### 4. Resolver Stress

Purpose: find wrong targets for `Id.`, supra, short-form case, bare party forms, parenthetical children, footnote boundaries, and full-caption split cases.

Generate documents with:

- multiple full citations with overlapping party names
- full captions with plaintiff/defendant halves
- short forms near distractor citations
- `Id.` chains through unresolved or parenthetical citations
- footnote/body boundaries
- parallel citations and subsequent history

Checks:

- no future target
- no self target
- `Id.` stays inside required scope
- supra/short-form target is the intended full citation under generated model
- resolver does not choose a split-caption half when the full citation is the modeled antecedent

### 5. Annotation Round Trip

Purpose: ensure extracted spans can drive annotation without corrupting source text.

Checks:

- annotation preserves unannotated text order
- inserted tags are balanced
- no citation produces invalid start/end ranges
- overlapping/adjacent citations are handled deterministically
- annotation over HTML-cleaned inputs does not use clean offsets as original offsets

### 6. Perf/ReDoS Probe

Purpose: find regex or cleaner paths that hang or blow up.

Inputs:

- nested punctuation
- repeated reporter-like tokens
- long repeated section markers
- pathological parenthetical chains
- long strings with near-miss citation forms
- HTML tag storms around reporter-like tokens

Execution:

- child process per case or small batch
- strict timeout
- collect timing histogram
- promote timeouts into regression tests with conservative thresholds only when stable

### 7. Differential Run

Purpose: compare two local runs before/after a fix.

Command:

```bash
pnpm bughunt diff .bughunt/runs/before .bughunt/runs/after
```

Report:

- fixed crashes
- new crashes
- stable findings
- citation count deltas
- type deltas
- span drift
- resolver target deltas

This becomes the local predecessor to a future PR comment.

## Promotion Workflow

The strongest part of the CLI should be promotion.

```bash
pnpm bughunt promote .bughunt/latest.json --id F123
```

Promotion should generate one of:

- a Vitest test snippet printed to stdout
- a new fixture under `tests/fixtures/bughunt/`
- a targeted test appended to an existing test file, only with explicit `--write`

Default should be non-writing preview. This avoids accidental churn while debugging.

Promoted tests must include:

- finding ID
- original command
- seed/path/replayPath if any
- minimized input
- expected behavior
- comment with source key if from CAP

## CI and PR Comments Later

Once local runs are useful, add CI wrappers:

- `pnpm bughunt run --preset smoke`: small deterministic sample, required gate.
- `pnpm bughunt run --preset nightly`: larger corpus and mutation run, scheduled.
- `pnpm bughunt report --format markdown`: future sticky PR comment.
- `actions/upload-artifact`: store `.bughunt/runs/...` with short retention.

GitHub Actions supports uploading files/directories as artifacts and configuring retention days, so CI can keep bughunt reports without copying Python eyecite's long-lived `artifacts` branch pattern at first.

## Dependency Decision Matrix

| Capability | Best v1 Choice | Why |
|---|---|---|
| CLI parsing | `node:util.parseArgs` | Built-in, typed enough, no dep. |
| TS execution | `tsx` | Existing repo style, fast local iteration, dev-only. |
| Deterministic RNG | Internal Mulberry32 or similar | Already used in scripts; no dep required. |
| Property shrinking | `fast-check` | Best JS/TS option; seeds and shrinking are the point. |
| Real corpus zips | `adm-zip` | Existing scripts already use it; local dev-only. |
| Artifact validation | TypeScript types first | Add `zod` later if artifact ingestion gets complex. |
| Microbench | Vitest bench later | Already in stack, Tinybench underneath. |
| Timeout isolation | Node child process | Robust against event-loop blocking ReDoS. |
| AI judging | Optional plugin | Keep deterministic core clean. |

## Recommended v1 Scope

Build only:

1. `run`
   - lanes: `corpus`, `invariants`, `resolver`, `mutate`, `annotate`, `perf`
   - artifact writer
   - deterministic seed

2. `inspect`
   - pretty-print a finding
   - show repro command and minimal/context input

3. `promote`
   - preview Vitest repro
   - optional `--write`

4. Shared internals
   - corpus loader
   - seeded sampler
   - finding schema
   - invariant helpers
   - minimizer interface, even if only one minimizer is implemented

Defer:

- PR comments
- CourtListener CSV/BZip download
- branch-vs-main Git automation
- AI judge integration
- public CLI exposure
- model-based fast-check commands

## Sources

- [Python eyecite benchmark workflow](https://github.com/freelawproject/eyecite/blob/main/.github/workflows/benchmark.yml) — upstream differential benchmark model.
- [Python eyecite benchmark script](https://github.com/freelawproject/eyecite/blob/main/benchmark/benchmark.py) — gains/losses and timing chart behavior.
- [fast-check introduction](https://fast-check.dev/docs/introduction/) — property-based testing, shrinking, and generated cases.
- [fast-check configuration](https://fast-check.dev/docs/configuration/) — seed, run count, input size, timeout, and reporting configuration.
- [fast-check test reports](https://fast-check.dev/docs/tutorials/quick-start/read-test-reports/) — failure report shape, `seed`, `path`, `endOnFailure`, counterexamples, and verbosity.
- [fast-check fuzzing](https://fast-check.dev/docs/advanced/fuzzing/) — replaying external reported errors with `examples` and `numRuns: 1`.
- [fast-check model-based testing](https://fast-check.dev/docs/advanced/model-based-testing/) — command replay and `replayPath`; useful later for resolver scenarios.
- [Node.js `util.parseArgs`](https://nodejs.org/api/util.html#utilparseargsconfig) — built-in command-line parsing.
- [Commander.js docs](https://tj.github.io/commander.js/) — mature fallback if built-in parsing becomes too small.
- [Vitest benchmark configuration](https://vitest.dev/config/benchmark.html) — future microbenchmark comparison using existing test stack.
- [OWASP ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS) — regex denial-of-service risk and evil-regex shapes.
- [Snyk ReDoS and catastrophic backtracking](https://snyk.io/blog/redos-and-catastrophic-backtracking/) — JavaScript event-loop blocking risk.
- [Node.js child_process docs](https://nodejs.org/api/child_process.html) — child process timeouts and abort signals for isolation.
- [GitHub Actions artifacts docs](https://docs.github.com/en/actions/tutorials/store-and-share-data) — later CI artifact upload and retention.
