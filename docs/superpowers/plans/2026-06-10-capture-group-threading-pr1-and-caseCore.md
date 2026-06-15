# Capture-Group Threading — PR 1 (substrate) + caseCore migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thread each matched pattern's named capture groups onto the `Token` (so extractors read `token.groups.x` instead of re-running a structural "twin" regex), and prove the mechanism end-to-end on the hardest production (case core).

**Architecture:** Two PRs. **PR 1** is the substrate — additive `Token.groups`/`groupSpans` populated by the tokenizer *only for patterns that declare named groups*, a typed-decline accessor, a runtime-floor bump to Node ≥ 22 (which permits ES2025 duplicate named groups), and a grammar-invariant test. Zero extraction-behavior change. **PR 2** migrates `parseCaseCitationCore`: add named groups to the three case tokenizer patterns (incl. capturing the currently-non-capturing nominative, and a duplicate `(?<page>…)` across the space/comma branches), then read the threaded groups + re-express the twin's accept/reject gate, and delete the duplicate re-exec. Behavior-preserving, guarded by the real-opinion corpus + seeded blind spots + a characterization test.

**Tech Stack:** TypeScript (ESM, isolatedDeclarations), Vitest 4, Biome, pnpm 10, tsdown. Spec: `docs/superpowers/specs/2026-06-09-capture-group-threading-design.md` (read it first).

**Hard constraints (from the spec):**
- Behavior-preserving — the corpus snapshot (`tests/integration/corpus.test.ts`) + the seeded blind spots stay green at every step.
- Delete only the **duplicate re-exec**; keep the **accept/reject gate** + residual structuring (reporter-trim, nominative, blank-page) + any out-of-token lookahead.
- `groupSpans` are token-relative; **skip non-participating groups** (the `lib.es2022` type for `match.indices.groups` is unsound — values are `undefined` at runtime).
- Never run `pnpm format` (CI lints, not formats). Each PR gets a changeset. Work on a feature branch, never `main`.

---

## File Structure

**PR 1 (substrate):**
- Modify `package.json:57-59` — `engines.node` `>=18.0.0` → `>=22.0.0`.
- Modify `.github/workflows/ci.yml:34,102` — test + tarball matrices `[18, 20, 22]` → `[22, 24, 26]`.
- Modify `src/tokenize/tokenizer.ts:27-39` (the `Token` interface) and `:91-102` (the threading loop in `tokenize()`).
- Create `src/extract/groupAccessor.ts` — `requireGroup`/`optionalGroup`/`groupSpan` (the typed-decline accessor).
- Modify the 15 pattern modules under `src/patterns/*.ts` — add the `d` flag to every `regex`.
- Create `tests/tokenize/threading.test.ts` — threading unit tests.
- Create `tests/extract/groupAccessor.test.ts` — accessor unit tests.
- Modify `tests/patterns/grammarOrder.test.ts` — add the grammar-invariant block (compiles + `g`+`d`).
- Create `.changeset/capture-group-threading-substrate.md`.

**PR 2 (caseCore migration):**
- Modify `src/patterns/casePatterns.ts:62-161` — add named groups to all three patterns.
- Modify `src/extract/caseCore.ts:29-91` — read threaded groups; delete the twin regexes.
- Modify `scripts/corpus/seeds.ts:13-31` — add the nominative + comma-form blind-spot seeds.
- Regenerate `tests/fixtures/corpus/projections.json` via `pnpm corpus:regen`.
- Create `tests/extract/caseCoreCharacterization.test.ts` — full-output characterization at the extraction level.
- Modify `tests/extract/caseCore.test.ts` — update direct-unit tokens to carry `groups` (a small helper).
- Modify `tests/patterns/grammarOrder.test.ts` — add the read-set ⊆ declared-groups check for case patterns.
- Create `.changeset/capture-group-threading-caseCore.md`.

---

## PHASE 1 — PR 1: Threading substrate (zero extraction-behavior change)

Branch: `git checkout -b feat/capture-group-threading-substrate` (off `main`).

### Task 1: Bump the Node floor (engines + CI matrices)

**Files:**
- Modify: `package.json:57-59`
- Modify: `.github/workflows/ci.yml` (test matrix `:34`, tarball matrix `:102`)
- Create: `.changeset/capture-group-threading-substrate.md`

- [ ] **Step 1: Bump `engines.node`.** In `package.json`, change:

```json
  "engines": {
    "node": ">=22.0.0"
  },
```

- [ ] **Step 2: Bump both CI matrices.** In `.github/workflows/ci.yml`, change the two occurrences of `node-version: [18, 20, 22]` (the `Test` job ~line 34 and the `Tarball consumer` job ~line 102) to:

```yaml
        node-version: [22, 24, 26]
```

Leave the standalone `node-version: 22` jobs (lint/typecheck, build, and the `if: matrix.node-version == 22` coverage guards) as-is — 22 is still in the matrix, so the coverage leg still runs.

- [ ] **Step 3: Write the changeset** (`.changeset/capture-group-threading-substrate.md`):

```markdown
---
"eyecite-ts": minor
---

Thread regex capture groups from tokenize→extract, and raise the Node floor to >=22.

**BREAKING (runtime floor):** the minimum supported Node is now 22 (was 18); the CI matrix is 22/24/26. This unlocks ES2025 duplicate named capturing groups, which the extraction refactor relies on.

Internally, `Token` now carries optional `groups`/`groupSpans` (the named capture groups of the matching pattern) so extractors can read structured terminals instead of re-running a second regex. This PR is the additive substrate; it changes no extraction output.
```

- [ ] **Step 4: Verify the workflow file is valid YAML.**

Run: `node -e "require('node:fs').readFileSync('.github/workflows/ci.yml','utf8')" && echo OK`
Expected: `OK` (and visually confirm both matrices read `[22, 24, 26]`).

- [ ] **Step 5: Commit.**

```bash
git add package.json .github/workflows/ci.yml .changeset/capture-group-threading-substrate.md
git commit -m "build: raise Node floor to >=22 (CI 22/24/26) for capture-group threading"
```

### Task 2: Grammar-invariant test — every pattern compiles and carries `g`+`d` (write the failing test first)

**Files:**
- Modify: `tests/patterns/grammarOrder.test.ts`

- [ ] **Step 1: Add the failing invariant block.** Append inside `tests/patterns/grammarOrder.test.ts` (after the existing `describe`), using the already-imported `orderedPatterns`:

```ts
describe("capture-group threading invariants (#844)", () => {
  it("every pattern compiles on the minimum supported Node", () => {
    for (const p of orderedPatterns) {
      // Recompiling proves the source+flags are valid on THIS runtime (CI floor = Node 22),
      // catching e.g. duplicate-named-group syntax that older engines reject.
      expect(() => new RegExp(p.regex.source, p.regex.flags), p.id).not.toThrow()
    }
  })

  it("every pattern carries the g and d flags", () => {
    for (const p of orderedPatterns) {
      expect(p.regex.flags, `${p.id} missing g`).toContain("g")
      expect(p.regex.flags, `${p.id} missing d`).toContain("d")
    }
  })
})
```

- [ ] **Step 2: Run it to confirm it FAILS** (no pattern has `d` yet).

Run: `pnpm exec vitest run tests/patterns/grammarOrder.test.ts`
Expected: FAIL — "`<id>` missing d" on the first pattern (the `g`/compile assertions pass; `d` fails).

- [ ] **Step 3: Commit the test (red).**

```bash
git add tests/patterns/grammarOrder.test.ts
git commit -m "test(patterns): assert every pattern compiles + carries g and d (red)"
```

### Task 3: The `d`-flag sweep across all pattern modules (make Task 2 pass)

**Files:**
- Modify: all 15 `src/patterns/*.ts` modules that define `regex:`

- [ ] **Step 1: Add `d` to every pattern regex.** For each `regex` in `src/patterns/*.ts`:
  - `new RegExp(<src>, "g")` → `new RegExp(<src>, "gd")`
  - literal `/<...>/g` → `/<...>/gd`
  - any other flag combo → append `d` (e.g. `"gi"` → `"gid"`, `/.../gi` → `/.../gid`).

The modules are: `casePatterns.ts`, `neutralPatterns.ts`, `statutePatterns.ts`, `journalPatterns.ts`, `constitutionalPatterns.ts`, `federalRulePatterns.ts`, `stateRulePatterns.ts`, `docketPatterns.ts`, `shortForm.ts`, `treatyPatterns.ts`, `legislativeMaterialPatterns.ts`, `localOrdinancePatterns.ts`, `canonPatterns.ts`, `sessionLawPatterns.ts`, `secondaryAuthorityPatterns.ts`. (Find every `regex:` site: `grep -rn "regex:" src/patterns/`.)

Example (`src/patterns/casePatterns.ts:78`): `"g"` → `"gd"` on all three case patterns; (`src/patterns/journalPatterns.ts`) the literal `/…/g` → `/…/gd`.

- [ ] **Step 2: Run the invariant test — now GREEN.**

Run: `pnpm exec vitest run tests/patterns/grammarOrder.test.ts`
Expected: PASS (compiles + g + d all green).

- [ ] **Step 3: Run the full suite — behavior unchanged** (adding `d` is inert without consumers).

Run: `pnpm exec vitest run`
Expected: PASS, same counts as before (4795+ pass, 0 fail). The corpus test is green.

- [ ] **Step 4: Commit.**

```bash
git add src/patterns
git commit -m "feat(patterns): add the d flag to every pattern (enables group-index threading)"
```

### Task 4: Add the additive `Token.groups`/`groupSpans` fields

**Files:**
- Modify: `src/tokenize/tokenizer.ts:27-39`

- [ ] **Step 1: Extend the `Token` interface.** Replace the interface body (`tokenizer.ts:27-39`) with:

```ts
export interface Token {
  /** Matched text from input */
  text: string

  /** Position in cleaned text (cleanStart/cleanEnd only, no original positions yet) */
  span: Pick<Span, "cleanStart" | "cleanEnd">

  /** Pattern type that matched this token */
  type: Pattern["type"]

  /** Pattern ID that matched this token */
  patternId: string

  /**
   * Named capture groups of the matching pattern. Present only for patterns
   * that declare named groups; non-participating groups are omitted. (#844)
   */
  groups?: Record<string, string>

  /**
   * Token-relative [start, end] offsets for each participating named group.
   * Same key set as `groups`. (#844)
   */
  groupSpans?: Record<string, [number, number]>
}
```

- [ ] **Step 2: Verify it type-checks** (additive optional fields — every existing `Token` literal stays valid).

Run: `pnpm typecheck`
Expected: clean (no errors).

- [ ] **Step 3: Commit.**

```bash
git add src/tokenize/tokenizer.ts
git commit -m "feat(tokenize): add additive Token.groups/groupSpans fields"
```

### Task 5: Thread named groups in `tokenize()`

**Files:**
- Modify: `src/tokenize/tokenizer.ts:91-102`
- Create: `tests/tokenize/threading.test.ts`

- [ ] **Step 1: Write the failing test.** Create `tests/tokenize/threading.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { tokenize } from "@/tokenize"
import type { Pattern } from "@/patterns"

// A throwaway pattern with named groups + an optional (non-participating) group.
const NAMED: Pattern = {
  id: "test-named",
  regex: /(?<vol>\d+)\s+(?<rep>U\.S\.)(?:\s+\((?<nom>\d+)\))?\s+(?<page>\d+)/gd,
  description: "test",
  type: "case",
}

describe("tokenize() threads named groups (#844)", () => {
  it("threads groups + token-relative spans, omitting non-participating groups", () => {
    const text = "see 410 U.S. 113 here"
    const [tok] = tokenize(text, [NAMED])
    expect(tok.groups).toEqual({ vol: "410", rep: "U.S.", page: "113" }) // no `nom`
    // token starts at index 4 ("410..."); spans are token-relative.
    expect(tok.groupSpans?.vol).toEqual([0, 3])
    expect(tok.groupSpans?.page).toEqual([9, 12])
    expect(tok.groupSpans?.nom).toBeUndefined()
  })

  it("threads nothing for a pattern without named groups", () => {
    const positional: Pattern = { id: "pos", regex: /(\d+) U\.S\. (\d+)/gd, description: "x", type: "case" }
    const [tok] = tokenize("410 U.S. 113", [positional])
    expect(tok.groups).toBeUndefined()
    expect(tok.groupSpans).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it to confirm it FAILS.**

Run: `pnpm exec vitest run tests/tokenize/threading.test.ts`
Expected: FAIL — `tok.groups` is `undefined` (not threaded yet).

- [ ] **Step 3: Implement threading.** In `src/tokenize/tokenizer.ts`, replace the token-push block (`:92-101`) with:

```ts
        // Create token from match
        const token: Token = {
          text: match[0],
          span: {
            cleanStart: match.index!,
            cleanEnd: match.index! + match[0].length,
          },
          type: pattern.type,
          patternId: pattern.id,
        }

        // Thread named groups (#844). Only patterns with named groups populate
        // `match.groups`; positional patterns thread nothing.
        if (match.groups) {
          const groups: Record<string, string> = {}
          const groupSpans: Record<string, [number, number]> = {}
          // NOTE: lib types `indices.groups` as non-optional [number,number];
          // at runtime a non-participating named group is `undefined`. Guard it.
          const indices = match.indices?.groups as
            | Record<string, [number, number] | undefined>
            | undefined
          for (const name of Object.keys(match.groups)) {
            const value = match.groups[name]
            if (value === undefined) continue
            groups[name] = value
            const gi = indices?.[name]
            if (gi) groupSpans[name] = [gi[0] - match.index!, gi[1] - match.index!]
          }
          if (Object.keys(groups).length > 0) {
            token.groups = groups
            token.groupSpans = groupSpans
          }
        }

        tokens.push(token)
```

(`match` here is the `matchAll` result; with the `d` flag added in Task 3 it carries `.indices`. `matchAll` returns `RegExpExecArray`-shaped matches, so `match.indices` is available.)

- [ ] **Step 4: Run the test — GREEN.**

Run: `pnpm exec vitest run tests/tokenize/threading.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Run the full suite — still behavior-unchanged** (no extractor reads `groups` yet).

Run: `pnpm exec vitest run`
Expected: PASS, same counts. Corpus green.

- [ ] **Step 6: Commit.**

```bash
git add src/tokenize/tokenizer.ts tests/tokenize/threading.test.ts
git commit -m "feat(tokenize): thread named groups + token-relative spans onto Token"
```

### Task 6: The typed-decline accessor

**Files:**
- Create: `src/extract/groupAccessor.ts`
- Create: `tests/extract/groupAccessor.test.ts`

- [ ] **Step 1: Write the failing test.** Create `tests/extract/groupAccessor.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { CitationParseError } from "@/extract"
import { groupSpan, optionalGroup, requireGroup } from "@/extract/groupAccessor"
import type { Token } from "@/tokenize"

const tok = (groups?: Record<string, string>, groupSpans?: Record<string, [number, number]>): Token => ({
  text: "410 U.S. 113",
  span: { cleanStart: 0, cleanEnd: 12 },
  type: "case",
  patternId: "t",
  groups,
  groupSpans,
})

describe("groupAccessor (#844)", () => {
  it("requireGroup returns the value or declines via CitationParseError", () => {
    expect(requireGroup(tok({ volume: "410" }), "volume")).toBe("410")
    expect(() => requireGroup(tok({ volume: "410" }), "page")).toThrow(CitationParseError)
    expect(() => requireGroup(tok(undefined), "volume")).toThrow(CitationParseError)
  })

  it("optionalGroup returns the value or undefined", () => {
    expect(optionalGroup(tok({ volume: "410" }), "volume")).toBe("410")
    expect(optionalGroup(tok({ volume: "410" }), "page")).toBeUndefined()
    expect(optionalGroup(tok(undefined), "volume")).toBeUndefined()
  })

  it("groupSpan returns the token-relative span or undefined", () => {
    expect(groupSpan(tok({ volume: "410" }, { volume: [0, 3] }), "volume")).toEqual([0, 3])
    expect(groupSpan(tok({ volume: "410" }), "volume")).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it to confirm it FAILS** (module not found).

Run: `pnpm exec vitest run tests/extract/groupAccessor.test.ts`
Expected: FAIL — cannot find `@/extract/groupAccessor`.

- [ ] **Step 3: Implement the accessor.** Create `src/extract/groupAccessor.ts`:

```ts
/**
 * Typed access to a Token's threaded named groups (#844). Extractors read
 * groups through these helpers instead of touching the raw record, so a
 * missing required group declines via CitationParseError (the #881 path) in
 * one audited place. Per-extractor `GroupName` unions narrow the `name` arg
 * to compile-time-checked literals at the call site.
 *
 * @module extract/groupAccessor
 */

import type { Token } from "@/tokenize"
import { CitationParseError } from "./errors"

/** Returns the named group's value, or declines (the tokenizer admitted a token the extractor can't parse). */
export function requireGroup<N extends string>(token: Token, name: N): string {
  const value = token.groups?.[name]
  if (value === undefined) {
    throw new CitationParseError(`Missing required capture group "${name}" in token: ${token.text}`)
  }
  return value
}

/** Returns the named group's value, or undefined if it did not participate. */
export function optionalGroup<N extends string>(token: Token, name: N): string | undefined {
  return token.groups?.[name]
}

/** Returns the named group's token-relative [start, end] span, or undefined. */
export function groupSpan<N extends string>(token: Token, name: N): [number, number] | undefined {
  return token.groupSpans?.[name]
}
```

- [ ] **Step 4: Run the test — GREEN.**

Run: `pnpm exec vitest run tests/extract/groupAccessor.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint + typecheck.**

Run: `pnpm lint && pnpm typecheck`
Expected: lint exit 0; typecheck clean.

- [ ] **Step 6: Commit.**

```bash
git add src/extract/groupAccessor.ts tests/extract/groupAccessor.test.ts
git commit -m "feat(extract): add requireGroup/optionalGroup/groupSpan accessor"
```

**PR 1 is complete.** Push, open a PR titled `feat(extract): capture-group threading substrate + Node >=22`, get CI green (the new 22/24/26 matrix), merge on the maintainer's go. Full suite + corpus unchanged → zero extraction-behavior change.

---

## PHASE 2 — PR 2: Migrate `parseCaseCitationCore` (the template)

Branch (off updated `main` after PR 1 merges): `git checkout -b feat/thread-caseCore`.

> **Why caseCore first + why it's the hardest:** three tokenizer patterns (`federal-reporter`, `supreme-court`, `state-reporter`) feed one `parseCaseCitationCore`; the page sits in two alternation branches (space-form vs comma-form); `supreme-court`'s nominative reporter is currently a **non-capturing** group; and the extractor trims reporter whitespace. All four must be handled or behavior drifts (panel findings DRIFT-1..4).

### Task 7: Seed the corpus blind spots BEFORE migrating

**Files:**
- Modify: `scripts/corpus/seeds.ts:13-31`
- Regenerate: `tests/fixtures/corpus/projections.json`

- [ ] **Step 1: Add the blind-spot seeds.** In `scripts/corpus/seeds.ts`, append to the `SEEDS` array (after id -3):

```ts
  {
    // #844: SCOTUS nominative reporter. The corpus has zero of these (verified),
    // so threading must not drop nominativeVolume/nominativeReporter.
    entry: { id: -4, court: "seed", era: "seed", type: "seed", ocr: false },
    text: "The rule traces to Marbury v. Madison, 5 U.S. (1 Cranch) 137 (1803).",
  },
  {
    // #844/#570: comma-form case cite — exercises the comma alternation branch.
    entry: { id: -5, court: "seed", era: "seed", type: "seed", ocr: false },
    text: "As held in Roe, 3 Den., 594 (N.Y. 1846), the rule is settled.",
  },
```

- [ ] **Step 2: Regenerate the projection + confirm the seeds extract as expected.**

Run: `pnpm corpus:regen`
Then inspect: `pnpm exec vitest run tests/integration/corpus.test.ts`
Expected: PASS (now includes opinions -4 and -5). Open `tests/fixtures/corpus/projections.json` and confirm `-4` projects a `case` cite keyed `5 U.S. 137` (nominative present in the underlying citation) and `-5` projects `3 Den. 594`.

- [ ] **Step 3: Commit.**

```bash
git add scripts/corpus/seeds.ts tests/fixtures/corpus
git commit -m "test(corpus): seed SCOTUS-nominative + comma-form blind spots before caseCore threading"
```

### Task 8: Characterization test for the case core (full output, on UNCHANGED code)

**Files:**
- Create: `tests/extract/caseCoreCharacterization.test.ts`

This test runs at the **extraction level** (`extractCitations(text)`) so its input (citation strings) is stable across the migration — `parseCaseCitationCore`'s input contract changes from text-parsing to groups-reading, so a token-level test would not survive the change. It is the equivalence oracle: written now against current behavior, it must stay green through Tasks 9–10.

- [ ] **Step 1: Write the characterization test.** Create `tests/extract/caseCoreCharacterization.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const caseOf = (text: string): CaseCitation => {
  const c = extractCitations(text).find((x) => x.type === "case")
  if (!c || c.type !== "case") throw new Error(`no case cite in: ${text}`)
  return c
}

describe("caseCore characterization (#844 — must survive threading migration)", () => {
  it("space-form: volume/reporter/page + spans", () => {
    const c = caseOf("Smith v. Jones, 100 Cal. App. 4th 1 (2002).")
    expect(c.volume).toBe(100)
    expect(c.reporter).toBe("Cal. App. 4th")
    expect(c.page).toBe(1)
    expect(c.spans?.reporter).toBeDefined()
    // reporter span covers exactly "Cal. App. 4th" (the trim is load-bearing).
    const { reporter } = c.spans!
    expect(c.matchedText.slice(reporter!.originalStart - c.span.originalStart, reporter!.originalEnd - c.span.originalStart)).toBe("Cal. App. 4th")
  })

  it("comma-form: 3 Den., 594", () => {
    const c = caseOf("As held in Roe, 3 Den., 594 (N.Y. 1846), the rule is settled.")
    expect(c.volume).toBe(3)
    expect(c.reporter).toBe("Den.")
    expect(c.page).toBe(594)
  })

  it("nominative reporter: 5 U.S. (1 Cranch) 137", () => {
    const c = caseOf("Marbury v. Madison, 5 U.S. (1 Cranch) 137 (1803).")
    expect(c.volume).toBe(5)
    expect(c.reporter).toBe("U.S.")
    expect(c.page).toBe(137)
    expect(c.nominativeVolume).toBe(1)
    expect(c.nominativeReporter).toBe("Cranch")
  })

  it("blank page placeholder", () => {
    const c = caseOf("Smith v. Jones, 100 F.3d ___ (2d Cir. 2020).")
    expect(c.volume).toBe(100)
    expect(c.page).toBeUndefined()
    expect(c.hasBlankPage).toBe(true)
  })
})
```

- [ ] **Step 2: Run it on the UNCHANGED code — it must PASS.** (If any assertion is wrong, fix the *test* to match current behavior — it is a characterization of today, not a wish.)

Run: `pnpm exec vitest run tests/extract/caseCoreCharacterization.test.ts`
Expected: PASS (all 4). This pins current behavior.

- [ ] **Step 3: Commit.**

```bash
git add tests/extract/caseCoreCharacterization.test.ts
git commit -m "test(extract): characterize caseCore output before threading migration"
```

### Task 9: Add named groups to the three case patterns (guarded match change)

**Files:**
- Modify: `src/patterns/casePatterns.ts:62-161`

Group contract (the union `parseCaseCitationCore` will read): `volume`, `reporter`, `page` (both branches, duplicate name — Node ≥ 22), and on `supreme-court` also `nominativeVolume`, `nominativeReporter`.

- [ ] **Step 1: Name the groups.** Edit each pattern's `String.raw` source, converting the relevant positional groups to named (leaving all other regex text byte-identical):
  - **`federal-reporter`** (`:77`): `(\d+(?:-\d+)?)` → `(?<volume>\d+(?:-\d+)?)`; the reporter group `(F\.\s?Supp\.…)` → `(?<reporter>F\.\s?Supp\.…)`; the space-form page `(\d+-\d+|\d+|_{3,}|-{3,})` → `(?<page>\d+-\d+|\d+|_{3,}|-{3,})`; the comma-form page `(\d+|_{3,}|-{3,})` → `(?<page>\d+|_{3,}|-{3,})` (same name — duplicate group, valid on Node ≥ 22).
  - **`supreme-court`** (`:92`): name `(?<volume>…)`, `(?<reporter>…)`, both pages `(?<page>…)`, **and make the nominative capturing + named**: `(?:\(\d+\s+[A-Z][A-Za-z.]+\)\s+)?` → `(?:\((?<nominativeVolume>\d+)\s+(?<nominativeReporter>[A-Z][A-Za-z.]+)\)\s+)?`.
  - **`state-reporter`** (`:154`): name `(?<volume>…)`, `(?<reporter>…)`, both pages `(?<page>…)`.

- [ ] **Step 2: Confirm the patterns still compile + the grammar invariant holds** (the compile smoke test catches a duplicate-name mistake on the Node 22 floor).

Run: `pnpm exec vitest run tests/patterns/grammarOrder.test.ts`
Expected: PASS.

- [ ] **Step 3: Run the corpus + characterization — match behavior unchanged.** Naming existing captures is inert; the only *new* capture is `supreme-court`'s nominative, which was already consumed (non-capturing) — so the token text/spans are unchanged. Capturing it does not alter what `parseCaseCitationCore` (still running its own twin) produces yet.

Run: `pnpm exec vitest run tests/integration/corpus.test.ts tests/extract/caseCoreCharacterization.test.ts tests/extract/caseCore.test.ts tests/extract/extractCase.test.ts`
Expected: PASS (all green — no behavior change yet; this PR step only changed pattern *capture surface*).

- [ ] **Step 4: Commit.**

```bash
git add src/patterns/casePatterns.ts
git commit -m "feat(patterns): name case-pattern groups (volume/reporter/page + SCOTUS nominative)"
```

### Task 10: Migrate `parseCaseCitationCore` to read threaded groups; delete the twin

**Files:**
- Modify: `src/extract/caseCore.ts:29-91`
- Modify: `tests/extract/caseCore.test.ts` (token construction)

- [ ] **Step 1: Update the direct-unit test tokens to carry groups.** `tests/extract/caseCore.test.ts` builds `Token` literals with just `text`/`span`; post-migration `parseCaseCitationCore` reads `token.groups`. Add a helper at the top of that file and route the constructed tokens through the real tokenizer so they carry threaded groups:

```ts
import { tokenize } from "@/tokenize"
import { casePatterns } from "@/patterns/casePatterns"

/** Build the case token the tokenizer would produce for `text` (with threaded groups). */
function caseToken(text: string) {
  const t = tokenize(text, casePatterns)[0]
  if (!t) throw new Error(`no case token for: ${text}`)
  return t
}
```

Replace each hand-built `{ text, span, type, patternId }` token passed to `parseCaseCitationCore` with `caseToken(text)`. (Spans become real cleaned-text offsets; assertions on `volume/reporter/page/nominative*` are unaffected.)

- [ ] **Step 2: Run that test — confirm it FAILS** (the migrated reads aren't there yet, so the unchanged extractor still parses `token.text` and passes; if it passes, that's fine — proceed. The real red/green is the rewrite below). Then rewrite `parseCaseCitationCore`.

- [ ] **Step 3: Rewrite `parseCaseCitationCore` to read threaded groups.** Replace `src/extract/caseCore.ts:29-91` (the two regex consts, `BLANK_PAGE_REGEX` stays) with:

```ts
/** Detects blank page placeholders (3+ underscores or dashes). */
const BLANK_PAGE_REGEX = /^[_-]{3,}$/

export function parseCaseCitationCore({
  token,
  transformationMap,
}: ParseCaseCitationCoreInput): CaseCitationCoreSyntax {
  type CaseGroup = "volume" | "reporter" | "page" | "nominativeVolume" | "nominativeReporter"

  // Accept/reject gate: the three case patterns guarantee volume+reporter+page
  // when they match, so absence means the tokenizer admitted a shape this
  // extractor can't parse — decline (the #881 path), preserving the old twin's
  // match/no-match behavior.
  const volumeRaw = requireGroup<CaseGroup>(token, "volume")
  const reporterRaw = requireGroup<CaseGroup>(token, "reporter")
  const pageStr = requireGroup<CaseGroup>(token, "page")

  const volume = parseVolume(volumeRaw)
  const reporter = reporterRaw.trim()
  const nominativeVolumeRaw = optionalGroup<CaseGroup>(token, "nominativeVolume")
  const nominativeVolume = nominativeVolumeRaw ? Number.parseInt(nominativeVolumeRaw, 10) : undefined
  const nominativeReporter = optionalGroup<CaseGroup>(token, "nominativeReporter")
  const isBlankPage = BLANK_PAGE_REGEX.test(pageStr)
  const page = isBlankPage ? undefined : Number.parseInt(pageStr, 10)
  const spans: Pick<CaseComponentSpans, "volume" | "reporter" | "page"> = {}

  const volumeSpan = groupSpan<CaseGroup>(token, "volume")
  if (volumeSpan) spans.volume = spanFromGroupIndex(token.span.cleanStart, volumeSpan, transformationMap)

  const reporterSpan = groupSpan<CaseGroup>(token, "reporter")
  if (reporterSpan) {
    // Residual structuring: the reporter capture can include surrounding
    // whitespace; trim it for the component span (load-bearing — the corpus
    // projection asserts reporter spans).
    const [rStart, rEnd] = reporterSpan
    const rawReporter = token.text.substring(rStart, rEnd)
    const leadTrim = rawReporter.length - rawReporter.trimStart().length
    const trailTrim = rawReporter.length - rawReporter.trimEnd().length
    spans.reporter = spanFromGroupIndex(
      token.span.cleanStart,
      [rStart + leadTrim, rEnd - trailTrim],
      transformationMap,
    )
  }

  const pageSpan = groupSpan<CaseGroup>(token, "page")
  if (pageSpan) spans.page = spanFromGroupIndex(token.span.cleanStart, pageSpan, transformationMap)

  return {
    volume,
    reporter,
    ...(page !== undefined ? { page } : {}),
    ...(nominativeVolume !== undefined ? { nominativeVolume } : {}),
    ...(nominativeReporter !== undefined ? { nominativeReporter } : {}),
    ...(isBlankPage ? { hasBlankPage: true as const } : {}),
    spans,
  }
}
```

- [ ] **Step 4: Update the imports** at the top of `src/extract/caseCore.ts`:

```ts
import type { Token } from "@/tokenize"
import type { CaseComponentSpans } from "@/types/componentSpans"
import { spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { groupSpan, optionalGroup, requireGroup } from "./groupAccessor"
```

(`CitationParseError` is no longer thrown directly here — `requireGroup` throws it — so its import can be removed. `parseVolume` and the interfaces stay.)

- [ ] **Step 5: Run the case tests + corpus — must be GREEN (behavior preserved).**

Run: `pnpm exec vitest run tests/extract/caseCoreCharacterization.test.ts tests/extract/caseCore.test.ts tests/extract/extractCase.test.ts tests/integration/corpus.test.ts`
Expected: PASS. Characterization (incl. nominative + comma-form + blank-page + reporter-span-trim) green; corpus (incl. seeds -4/-5) green.

- [ ] **Step 6: Run the full suite + the #881 decline tests by name.**

Run: `pnpm exec vitest run`
Expected: PASS, same counts. Confirm `tests/extract/issue881ExtractorDecline.test.ts`, `issue881ExtractorSentinel.test.ts`, `issue881PropagateGenuineErrors.test.ts` are green (the decline path still fires via `requireGroup`).

- [ ] **Step 7: Lint + typecheck.**

Run: `pnpm lint && pnpm typecheck`
Expected: lint exit 0; typecheck clean.

- [ ] **Step 8: Commit.**

```bash
git add src/extract/caseCore.ts tests/extract/caseCore.test.ts
git commit -m "refactor(extract): read threaded groups in caseCore; delete the twin regex"
```

### Task 11: Extend the grammar invariant — caseCore's read-set ⊆ the case patterns' declared groups

**Files:**
- Modify: `tests/patterns/grammarOrder.test.ts`

- [ ] **Step 1: Add the read-set check.** Append to the threading-invariants `describe` in `tests/patterns/grammarOrder.test.ts`:

```ts
  it("case patterns declare every group caseCore reads (#844)", () => {
    const caseReads = ["volume", "reporter", "page", "nominativeVolume", "nominativeReporter"]
    for (const p of casePatterns) {
      const declared = new Set([...p.regex.source.matchAll(/\(\?<([a-zA-Z]+)>/g)].map((m) => m[1]))
      // Every group caseCore reads that this pattern is responsible for must be declared.
      // federal/state patterns have no nominative; assert the core three at least.
      for (const g of ["volume", "reporter", "page"]) {
        expect(declared.has(g), `${p.id} missing group ${g}`).toBe(true)
      }
      // supreme-court must additionally declare the nominative pair.
      if (p.id === "supreme-court") {
        for (const g of ["nominativeVolume", "nominativeReporter"]) {
          expect(declared.has(g), `${p.id} missing ${g}`).toBe(true)
        }
      }
    }
    expect(caseReads.length).toBe(5) // documents the full read-set
  })
```

- [ ] **Step 2: Run it — GREEN.**

Run: `pnpm exec vitest run tests/patterns/grammarOrder.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit.**

```bash
git add tests/patterns/grammarOrder.test.ts
git commit -m "test(patterns): assert case patterns declare caseCore's group read-set"
```

### Task 12: Changeset + final verification

**Files:**
- Create: `.changeset/capture-group-threading-caseCore.md`

- [ ] **Step 1: Write the changeset:**

```markdown
---
"eyecite-ts": patch
---

Internal: `parseCaseCitationCore` now reads the named capture groups threaded onto the token by the tokenizer (#844), instead of re-running a second volume-reporter-page regex. Behavior-preserving — the same volume/reporter/page/nominative/blank-page output and component spans, verified against the real-opinion corpus + a characterization suite. First production migrated under the capture-group-threading design.
```

- [ ] **Step 2: Full verification sweep.**

Run: `pnpm exec vitest run && pnpm lint && pnpm typecheck && pnpm build && pnpm size`
Expected: tests pass (same counts, corpus green); lint exit 0; typecheck clean; build succeeds; size within limit.

- [ ] **Step 3: Commit.**

```bash
git add .changeset/capture-group-threading-caseCore.md
git commit -m "chore: changeset for caseCore capture-group threading"
```

**PR 2 is complete.** Push, open `refactor(extract): thread capture groups in caseCore`, get CI green (22/24/26), merge on the maintainer's go.

---

## Follow-on (NOT this plan)

Subsequent per-production migrations repeat Tasks 8–10 (characterize → name groups → read + gate + delete twin), one PR each, in spec order: `supra`/`Id.`/short-form case (give the three supra patterns distinct ids first, per spec §3.3) → journal → neutral → federal-register → rules → statute *shell* (locator stays in `parseBody`). `regulation` and the `detectBare*` synthesized citations are out of scope by construction (spec §9).

---

## Self-Review

**Spec coverage:** PR 1 covers spec §3.2/§4/§5 (additive Token + threading rules + lazy build), §3.4 (typed accessor), decision #2 (Node ≥ 22 floor), §7.4 (grammar invariant: compiles + g+d). PR 2 covers §3.1/§6 (per-pattern named groups, duplicate `(?<page>)`, delete duplicate re-exec, keep gate + reporter-trim/nominative residual structuring), §7.1–7.3 (characterization-first, full-field + decline parity, seed blind spots), §7.4 (read-set ⊆ declared). Deferred per spec §9: supra distinct-ids, statute shell, regulation out-of-scope — noted in Follow-on. Coverage gap: none for this plan's scope.

**Placeholder scan:** no TBD/TODO; every code step shows the actual code; commands have expected output.

**Type consistency:** `Token.groups: Record<string,string>` / `groupSpans: Record<string,[number,number]>` used consistently in Tasks 4/5/6/10; accessor signatures (`requireGroup`/`optionalGroup`/`groupSpan`, generic over `N extends string`) match between Task 6 (definition) and Task 10 (use with `CaseGroup`); `CaseCitationCoreSyntax` return shape unchanged from the original `caseCore.ts`. The `caseToken` helper (Task 10) uses `tokenize`/`casePatterns` consistently with Task 9's named groups.
