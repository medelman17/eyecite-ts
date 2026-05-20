# Session Handoff: eyecite-ts Internal Bughunt CLI Planning

**Created:** 2026-05-20 16:51 EDT
**Branch:** `main`
**Previous handoff:** [`docs/handoffs/2026-05-10-200029-issue-triage-and-parser-improvements.md`](2026-05-10-200029-issue-triage-and-parser-improvements.md)

## Goal

Build a repo-local, internal `pnpm bughunt` CLI for `eyecite-ts` that consolidates the existing ad hoc audit/repro scripts into reproducible local bug-hunting lanes. The CLI should optimize for local discovery, not public package surface or PR automation: run lanes, write `.bughunt/` artifacts, inspect findings, and preview promotion into Vitest regressions.

## Current State

No implementation has started. The session produced research, a design spec, and an implementation plan. The next agent should start from the plan and implement task-by-task.

### Completed

- [x] Investigated Python `freelawproject/eyecite` benchmark workflow and script.
- [x] Decided to adapt it as one future "corpus differential" lane, not as the whole system.
- [x] Decided the first product is a repo-local CLI optimized for local bug hunting.
- [x] Confirmed the CLI must remain internal: no `bin`, no package export, no `dist` entry.
- [x] Added `CONTEXT7_API_KEY` to ignored local `mise.local.toml`.
- [x] Updated Codex MCP config so future `context7` launches include `CONTEXT7_API_KEY`; Context7 now works after reload.
- [x] Used Context7 to validate `fast-check` details: `fc.check`, `seed`, `path`, `counterexamplePath`, `examples`, `endOnFailure`, verbosity, and future `replayPath`.
- [x] Wrote research note: [`docs/research/2026-05-20-bughunt-cli-best-practices.md`](../research/2026-05-20-bughunt-cli-best-practices.md).
- [x] Wrote design spec: [`docs/superpowers/specs/2026-05-20-bughunt-cli-design.md`](../superpowers/specs/2026-05-20-bughunt-cli-design.md).
- [x] Wrote implementation plan: [`docs/superpowers/plans/2026-05-20-bughunt-cli.md`](../superpowers/plans/2026-05-20-bughunt-cli.md).

### In Progress

Implementation is ready to begin but has not started. The approved next step is to execute [`docs/superpowers/plans/2026-05-20-bughunt-cli.md`](../superpowers/plans/2026-05-20-bughunt-cli.md).

The plan's first milestone builds:

- dev dependencies and `pnpm bughunt`
- `.bughunt/` gitignore entry
- core types, seeded RNG, finding IDs, JSONL artifact writer
- extraction wrapper and invariant checks
- inline corpus, corpus lane, invariant lane
- CLI dispatcher and `run`
- `inspect`
- `promote` preview
- a first `fast-check` mutation lane

### Not Started

- [ ] Implement `scripts/bughunt/`.
- [ ] Add `tests/bughunt/`.
- [ ] Add `tsx`, `fast-check`, and `adm-zip` as dev dependencies.
- [ ] Add `.bughunt/` to `.gitignore`.
- [ ] Run targeted tests and smoke CLI.
- [ ] Decide after v1 whether to add CAP zip loading, `diff`, `report`, ReDoS child-process isolation, annotation lane, PR comments, or CourtListener CSV support.

## Key Decisions Made

- **Local-first CLI:** The first useful workflow is local bug discovery, not CI. CI/PR comments wait until `.bughunt/` artifacts prove useful.
- **Private tooling:** The CLI lives under `scripts/bughunt/` and is invoked only through `package.json` scripts. It must not alter public exports.
- **Dependency-light:** Use `node:util.parseArgs` for v1 instead of Commander. Add `tsx`, `fast-check`, and `adm-zip` as dev dependencies.
- **`fast-check` scope:** Use it for generated/metamorphic lanes where shrinking and replay matter. Do not use it for CAP corpus walking or as a substitute for legal citation domain generators.
- **Artifact contract:** Use `.bughunt/latest.json` instead of a symlink for portability. Write `manifest.json`, `findings.jsonl`, `cases.jsonl`, `events.jsonl`, `report.json`, and `summary.md`.
- **Promotion is preview-first:** `promote` should print a Vitest repro by default. Writing files is deliberately deferred until the preview path is useful.

## Failed Approaches & Gotchas

- Context7 initially failed with a quota message because the running MCP server had no `CONTEXT7_API_KEY`.
- Adding the key to `mise.local.toml` was not enough for the already-running MCP process.
- `codex mcp get context7` showed the global MCP entry had `env: -`.
- Updating Codex MCP config with `codex mcp add --env CONTEXT7_API_KEY=... context7 -- npx -y @upstash/context7-mcp` fixed future launches. The tool worked only after the session/app reloaded the MCP server.
- The repo has many untracked local scripts and artifacts. Do not assume the worktree is clean, and do not remove or stage unrelated files.
- `tsconfig.json` currently includes only `src`, so `pnpm typecheck` may not typecheck `scripts/bughunt`. The plan explicitly relies on Vitest and Biome for v1 script coverage unless the implementing agent chooses to add a dedicated script tsconfig.

## Critical File Locations

- Research: [`docs/research/2026-05-20-bughunt-cli-best-practices.md`](../research/2026-05-20-bughunt-cli-best-practices.md)
- Design: [`docs/superpowers/specs/2026-05-20-bughunt-cli-design.md`](../superpowers/specs/2026-05-20-bughunt-cli-design.md)
- Plan: [`docs/superpowers/plans/2026-05-20-bughunt-cli.md`](../superpowers/plans/2026-05-20-bughunt-cli.md)
- Current package config: `package.json`
- Current ignore file: `.gitignore`
- Existing audit source material:
  - `scripts/sample-and-judge.ts`
  - `scripts/audit-crashes.ts`
  - `scripts/audit-span-fidelity.ts`
  - `scripts/audit-annotate-roundtrip.ts`
  - `scripts/audit-resolution.ts`
  - `scripts/audit-perf-outliers.ts`
  - `scripts/judge/*`
- Existing tests and fixtures:
  - `tests/extract/*`
  - `tests/integration/*`
  - `tests/fixtures/*`

## Environment State

- Current branch: `main`.
- Recent HEAD: `6f10815 feat(extract): Sprint I — new extractor types + Fed.R. FP cluster (#576, #577, #578, #579, #581, #582, #585) (#626)`.
- `package.json` currently has version `0.22.1`.
- `mise.local.toml` is ignored and now contains `CONTEXT7_API_KEY`; do not print the key.
- Codex global MCP `context7` is configured with `CONTEXT7_API_KEY` and Context7 works after reload.
- The visible `git status --short` is mostly untracked local files, including the new docs from this session and many pre-existing scripts/artifacts. There are no tracked diffs from the planning docs because the files are untracked.

## Current Git Status Snapshot

Notable new files from this session:

- `docs/research/2026-05-20-bughunt-cli-best-practices.md`
- `docs/superpowers/specs/2026-05-20-bughunt-cli-design.md`
- `docs/superpowers/plans/2026-05-20-bughunt-cli.md`
- `docs/handoffs/2026-05-20-165124-bughunt-cli-planning.md`

Pre-existing/unrelated local files include:

- `.agents/`
- `.codex/`
- `AGENTS.md`
- `citation-diagram.html`
- `docs/superpowers/plans/2026-04-11-readme-overhaul.md`
- `docs/superpowers/specs/2026-04-11-readme-overhaul-design.md`
- `issue-drafts/`
- many `scripts/audit-*`, `scripts/repro-*`, `scripts/judge/*`
- `tests/fixtures/docket-citations.json`

Do not clean these unless the user explicitly asks.

## Next Steps

1. Start a goal for implementation using the prompt below.
2. Read the research, design, and plan in that order.
3. Execute [`docs/superpowers/plans/2026-05-20-bughunt-cli.md`](../superpowers/plans/2026-05-20-bughunt-cli.md) task-by-task.
4. Use TDD as written in the plan: failing targeted test, minimal implementation, targeted pass.
5. Keep staging narrow. Do not stage unrelated untracked files.
6. Treat the plan's **Definition Of Done** as the completion gate. In short, implementation is not done until:
   - the CLI remains internal-only (`bughunt` script, no `bin`, no public export, no `dist` entry)
   - `run`, `inspect`, and `promote` preview work
   - `corpus`, `invariants`, and `mutate` lanes exist
   - `.bughunt/latest.json` and all expected run artifacts are written
   - findings are stable, reproducible, and inspectable
   - no `.bughunt/` artifacts or secrets are staged
7. Before finalizing implementation, run:
   - `pnpm exec vitest run tests/bughunt/core.test.ts tests/bughunt/commands.test.ts`
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm bughunt run --lane all --seed 1234 --sample 5`
8. Report any typecheck limitation caused by `tsconfig.json` excluding `scripts/`.

## Linked Artifacts

- Research: [`docs/research/2026-05-20-bughunt-cli-best-practices.md`](../research/2026-05-20-bughunt-cli-best-practices.md)
- Design: [`docs/superpowers/specs/2026-05-20-bughunt-cli-design.md`](../superpowers/specs/2026-05-20-bughunt-cli-design.md)
- Plan: [`docs/superpowers/plans/2026-05-20-bughunt-cli.md`](../superpowers/plans/2026-05-20-bughunt-cli.md)
