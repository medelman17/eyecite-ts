/**
 * Vitest globalSetup: materialize the gitignored `src/data/reporters.gen.ts`
 * before any test runs.
 *
 * The canonical "run all tests once" command (`pnpm exec vitest run`, per
 * CLAUDE.md) bypasses pnpm lifecycle hooks, so the `pretest` hook does not fire
 * for it. Without this, DB-backed tests fail at runtime on a fresh clone with
 * `Cannot find module './reporters.gen.js'`. Importing the codegen script
 * executes its top-level generation (idempotent — skips the write when current).
 * See #642.
 */
export default async function setup(): Promise<void> {
  await import("../../scripts/generate-reporters-data.ts")
}
