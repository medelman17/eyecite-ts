# Parallel Citation Detection (Pincite-Between) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `detectParallel.ts` to accept the Bluebook-canonical pincite-between form (`vol rep page, pincite, vol rep page`), so parallel citations like `374 N.J. Super. 448, 453–55, 864 A.2d 1191` are correctly grouped via `groupId` and `parallelCitations[]`.

**Architecture:** Replace the `MAX_PROXIMITY = 5` numeric check with a structural classifier that accepts two gap shapes: tight comma (existing) and pincite-between (new). The pincite-between path delegates to the existing `parsePincite` helper from `src/extract/pincite.ts` as the single source of truth for "what counts as a pincite." No new types; no consumer-facing API change.

**Tech Stack:** TypeScript, Vitest 4, pnpm 10, Biome 2. Zero new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-05-19-parallel-cites-pincite-between-design.md`
**Research:** `docs/research/2026-05-19-parallel-citation-detection.md`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/extract/detectParallel.ts` | Modify | Replace `MAX_PROXIMITY` check with tight-or-pincite-between classifier. Import `parsePincite`. Widen `MAX_GAP_FOR_PARALLEL` to 80. Remove `MAX_PROXIMITY` constant. |
| `tests/extract/detectParallelPinciteBetween.test.ts` | Create | Focused unit tests for new gap shapes (page, range, multi-pincite, star, paragraph, footnote; negative cases) |
| `tests/extract/randolphFixture.test.ts` | Create | End-to-end fixture from the bug report; asserts all three parallel pairs detected + string-cite anomaly auto-resolves |
| `.changeset/parallel-cites-pincite-between.md` | Create | Patch bump for the detection fix |

---

## Pre-flight

Verify branch + spec are in place:

```bash
git rev-parse --abbrev-ref HEAD
# Expected: fix/parallel-cites-in-subsequent-history

ls docs/superpowers/specs/2026-05-19-parallel-cites-pincite-between-design.md
ls docs/research/2026-05-19-parallel-citation-detection.md
# Both should exist.
```

If you're elsewhere, switch back and pop any lock-file stash (per `project_persistent_drift` memory: `package.json` + `pnpm-lock.yaml` are expected to show as modified — leave alone or stash during branch switches).

**Known LSP noise:** Every new test file under `tests/` in this codebase triggers spurious LSP `Cannot find module '@/extract'` and "Parameter 'c' implicitly has 'any' type" warnings. `pnpm typecheck` and `pnpm exec vitest run` are the authoritative checks; ignore the LSP diagnostics on the new test files.

---

## Task 1: Write Failing Randolph Test + Implement Classifier (TDD red→green)

The canonical bug-report scenario drives the implementation. Single task because the test file and the source change are committed together in a TDD red→green cycle (avoids leaving uncommitted state for a subsequent subagent to pick up).

**Files:**
- Create: `tests/extract/randolphFixture.test.ts`
- Modify: `src/extract/detectParallel.ts`

- [ ] **Step 1.1: Create the failing test file**

```ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, FullCaseCitation } from "@/types/citation"

describe("Randolph fixture — all parallel pairs across pincite-between gaps detect", () => {
  // The actual passage from the user's brief (HOA / adverse-possession context).
  // Three logical authorities, each with parallel citations:
  //   - Randolph App. Div. 2005: 374 N.J. Super. 448 + 864 A.2d 1191
  //   - Randolph N.J. 2006 (affirmance): 186 N.J. 78 + 891 A.2d 1202
  //   - Yellen App. Div. 2010: 416 N.J. Super. 113 + 3 A.3d 584
  const text = `The prescriptive period in New Jersey is not twenty years, as was formerly assumed, but thirty years for developed land (or sixty years for woodlands or uncultivated tracts), by analogy to the adverse-possession periods set forth in N.J.S.A. 2A:14-30. Randolph Town Ctr., L.P. v. County of Morris, 374 N.J. Super. 448, 453–55, 864 A.2d 1191 (App. Div. 2005), aff'd in part, 186 N.J. 78, 891 A.2d 1202 (2006); see also Yellen v. Kassin, 416 N.J. Super. 113, 120, 3 A.3d 584 (App. Div. 2010).`

  it("all three parallel pairs detected with correct groupIds", () => {
    const cites = extractCitations(text, { resolve: true })
    const caseCites = cites.filter(
      (c): c is FullCaseCitation => c.type === "case",
    )
    expect(caseCites).toHaveLength(6)

    // Pair 1: Randolph App. Div. 2005
    expect(caseCites[0].text).toContain("374 N.J. Super. 448")
    expect(caseCites[1].text).toContain("864 A.2d 1191")
    expect(caseCites[0].groupId).toBeDefined()
    expect(caseCites[0].groupId).toBe(caseCites[1].groupId)
    expect(caseCites[0].parallelCitations).toEqual([
      { volume: 864, reporter: "A.2d", page: 1191 },
    ])

    // Pair 2: Randolph N.J. 2006 (affirmance)
    expect(caseCites[2].text).toContain("186 N.J. 78")
    expect(caseCites[3].text).toContain("891 A.2d 1202")
    expect(caseCites[2].groupId).toBeDefined()
    expect(caseCites[2].groupId).toBe(caseCites[3].groupId)
    expect(caseCites[2].parallelCitations).toEqual([
      { volume: 891, reporter: "A.2d", page: 1202 },
    ])

    // Pair 3: Yellen App. Div. 2010
    expect(caseCites[4].text).toContain("416 N.J. Super. 113")
    expect(caseCites[5].text).toContain("3 A.3d 584")
    expect(caseCites[4].groupId).toBeDefined()
    expect(caseCites[4].groupId).toBe(caseCites[5].groupId)
    expect(caseCites[4].parallelCitations).toEqual([
      { volume: 3, reporter: "A.3d", page: 584 },
    ])

    // Three logical authorities → three distinct groupIds
    const distinctGroupIds = new Set([
      caseCites[0].groupId,
      caseCites[2].groupId,
      caseCites[4].groupId,
    ])
    expect(distinctGroupIds.size).toBe(3)
  })

  it("string-cite anomaly auto-resolves — Randolph affirmance secondary does not share sc group with Yellen primary", () => {
    // Pre-fix: 891 A.2d 1202 (Randolph affirmance secondary, currently extracted
    // as a standalone primary because parallel detection fails) shared a
    // stringCitationGroupId with 416 N.J. Super. 113 (Yellen primary across `;`).
    // Post-fix: 891 A.2d 1202 is now a parallel secondary, no longer a
    // string-cite primary candidate; the walker pairs the correct primaries
    // across the `;` separator (or leaves them ungrouped — exact behavior
    // depends on detectStringCites's logic, but the cross-authority pairing
    // must NOT persist).
    const cites = extractCitations(text, { resolve: true })
    const caseCites = cites.filter(
      (c): c is FullCaseCitation => c.type === "case",
    )

    const randolphAffirmanceSecondary = caseCites[3] // 891 A.2d 1202
    const yellenPrimary = caseCites[4] // 416 N.J. Super. 113

    // The affirmance secondary and the Yellen primary should NOT share a
    // stringCitationGroupId after the fix.
    expect(
      randolphAffirmanceSecondary.stringCitationGroupId !== undefined &&
        randolphAffirmanceSecondary.stringCitationGroupId ===
          yellenPrimary.stringCitationGroupId,
    ).toBe(false)
  })
})
```

- [ ] **Step 1.2: Run the test to verify it fails**

```bash
pnpm exec vitest run tests/extract/randolphFixture.test.ts 2>&1 | tail -20
```

Expected: **FAIL.** The first test "all three parallel pairs detected" fails because the `374 N.J. Super.` and `416 N.J. Super.` pairs (with pincite between) aren't being grouped. The second test may pass or fail depending on current string-cite behavior — note the result.

- [ ] **Step 1.3: Add the `parsePincite` import**

Open `src/extract/detectParallel.ts`. Find the existing imports at the top (around line 13: `import type { Token } from "@/tokenize/tokenizer"`). Add this import below it:

```ts
import { parsePincite } from "./pincite"
```

- [ ] **Step 1.4: Widen `MAX_GAP_FOR_PARALLEL` and remove `MAX_PROXIMITY`**

In the same file, find the existing constants block (around lines 17-27):

```ts
/**
 * Maximum characters allowed between end of comma and start of next citation.
 * Bluebook standard uses tight spacing: "500 F.2d 123, 200 F. Supp. 456"
 */
const MAX_PROXIMITY = 5

/**
 * Maximum total gap (chars) between end of one citation and start of next
 * to even consider them as parallel candidates. Beyond this distance, we can
 * skip all other checks (comma, parenthetical, etc.) for performance.
 * Includes comma, spaces, and potential pincite: ", 125, " = ~10 chars
 */
const MAX_GAP_FOR_PARALLEL = 20
```

Replace with:

```ts
/**
 * Maximum total gap (chars) between end of one citation and start of next
 * to even consider them as parallel candidates. Beyond this distance, we can
 * skip all other checks (comma, parenthetical, etc.) for performance.
 *
 * Sized to comfortably hold a comma-separated pincite list like
 * `, 410-13 nn. 5-10, ` (~17 chars) or `, 453-55, 460, ` (14 chars). The
 * pincite-validation gate inside the loop is the real false-positive
 * defense; this cap is just an early-exit performance optimization.
 */
const MAX_GAP_FOR_PARALLEL = 80
```

(`MAX_PROXIMITY` is removed entirely — replaced by the structural classifier below.)

- [ ] **Step 1.5: Replace the MAX_PROXIMITY check with the structural classifier**

In the same file, find this block inside the for-loop (around lines 122-134):

```ts
      // Bluebook requires comma separator for parallel citations
      if (!gapText.includes(",")) {
        break // No comma = not parallel, stop looking
      }

      // Check proximity: distance from comma to next citation start
      // MAX_PROXIMITY enforces tight spacing: "A, B" not "A,      B"
      const commaIndex = gapText.indexOf(",")
      const distanceAfterComma = gapText.length - commaIndex - 1

      if (distanceAfterComma > MAX_PROXIMITY) {
        break // Too far apart, stop looking
      }
```

Replace with:

```ts
      // Gap text between primary and secondary cite must be one of two shapes:
      //
      //   Tight comma: ", " (no pincite between cites)
      //     "374 N.J. Super. 448, 864 A.2d 1191"
      //
      //   Pincite-between: ", PINCITE_LIST, " — the Bluebook-canonical form
      //   per Indigo Book R12.3, where the primary's pincite sits between
      //   the two parallel cites.
      //     "374 N.J. Super. 448, 453-55, 864 A.2d 1191"
      //     "410 U.S. 113, 115, 153, 93 S. Ct. 705"  (multi-pincite list)
      //
      // A PINCITE is anything `parsePincite()` accepts — page, range, star,
      // paragraph, footnote, etc. Reusing parsePincite keeps it as the single
      // source of truth for "what counts as a pincite" and means future
      // pincite improvements propagate here automatically.
      //
      // Punctuation other than commas inside the segment list (e.g.
      // `, 453; 460, `) deliberately fails — `parsePincite("453; 460")`
      // returns null, the segment-by-segment validation fails, and the gap
      // is rejected. That's correct: semicolons don't appear in legitimate
      // pincite lists.
      const tight = /^,\s*$/.test(gapText)
      let pinciteBetween = false
      if (!tight) {
        const inner = gapText.match(/^,\s*(.+?)\s*,\s*$/)
        if (inner) {
          const segments = inner[1].split(/\s*,\s*/)
          pinciteBetween =
            segments.length > 0 && segments.every((s) => parsePincite(s) !== null)
        }
      }
      if (!tight && !pinciteBetween) break
```

- [ ] **Step 1.6: Run the Randolph fixture tests**

```bash
pnpm exec vitest run tests/extract/randolphFixture.test.ts 2>&1 | tail -15
```

Expected: the first test "all three parallel pairs detected with correct groupIds" PASSES. The second "string-cite anomaly auto-resolves" should also pass (the affirmance secondary is no longer a primary-shape candidate for string-cite walker).

If a test fails, print the extracted citations to understand actual vs expected, then debug from there.

- [ ] **Step 1.7: Run the full test suite**

```bash
pnpm exec vitest run 2>&1 | tail -5
```

Expected: full suite passes (~2995 + 2 new tests = ~2997). If any existing test fails, investigate:
- Tests that previously asserted "this pair is NOT a parallel because the gap is too wide" — flip the assertion AND update the test description to reflect the new (correct) behavior. Mention in commit message.
- Tests that count distinct citations in a fixture — counts may drop because previously-unpaired cites now collapse into parallel groups when `groupByCase()` is invoked.
- If something fails that doesn't fit either pattern, surface it — don't silently adjust.

- [ ] **Step 1.8: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint 2>&1 | tail -5
```

Expected: both pass (Biome may report pre-existing warnings; those are fine).

- [ ] **Step 1.9: Commit (test + implementation together)**

```bash
git add src/extract/detectParallel.ts tests/extract/randolphFixture.test.ts
git commit -m "$(cat <<'EOF'
fix(extract): parallel detection across pincite-between gaps (Bluebook canonical)

Replaces MAX_PROXIMITY=5 with a structural classifier that accepts two
gap shapes between candidate parallel cites:
- Tight comma: ", " (existing behavior, unchanged)
- Pincite-between: ", PINCITE_LIST, " — the Bluebook-canonical form per
  Indigo Book R12.3, validated by delegating to the existing parsePincite
  helper as single source of truth for pincite shapes.

Widens MAX_GAP_FOR_PARALLEL from 20 to 80 to accommodate realistic
multi-pincite gaps (e.g., ", 410-13 nn. 5-10, "). The structural
classifier inside the loop is the real false-positive defense; the
gap cap is now just an early-exit performance optimization.

Fixes the Randolph fixture from the bug report: three parallel pairs
across pincite-between gaps now correctly grouped via groupId and
parallelCitations[]. Indirect win: the string-cite walker no longer
mis-groups parallel secondaries with unrelated authorities across `;`
separators, because they're now properly classified as secondaries.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Focused Unit Tests for Each Gap Shape

The Randolph fixture proves the algorithm works end-to-end on a representative real-world input. This task adds finer-grained unit tests so future regressions on specific gap shapes get caught immediately.

**Files:**
- Create: `tests/extract/detectParallelPinciteBetween.test.ts`

- [ ] **Step 2.1: Create the unit test file**

```ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, FullCaseCitation } from "@/types/citation"

function caseCites(text: string): FullCaseCitation[] {
  return extractCitations(text).filter(
    (c): c is FullCaseCitation => c.type === "case",
  )
}

describe("detectParallel — pincite-between gap shapes", () => {
  it("accepts single page pincite (', NNN, ')", () => {
    const text = "Smith v. Jones, 374 N.J. Super. 448, 453, 864 A.2d 1191 (2005)."
    const cites = caseCites(text)
    expect(cites).toHaveLength(2)
    expect(cites[0].groupId).toBeDefined()
    expect(cites[0].groupId).toBe(cites[1].groupId)
    expect(cites[0].parallelCitations).toEqual([
      { volume: 864, reporter: "A.2d", page: 1191 },
    ])
  })

  it("accepts page range (', NNN-NN, ')", () => {
    const text =
      "Smith v. Jones, 374 N.J. Super. 448, 453-55, 864 A.2d 1191 (2005)."
    const cites = caseCites(text)
    expect(cites).toHaveLength(2)
    expect(cites[0].groupId).toBe(cites[1].groupId)
  })

  it("accepts en-dash page range (', NNN–NN, ')", () => {
    // En-dash (U+2013) is common in published opinions.
    const text =
      "Smith v. Jones, 374 N.J. Super. 448, 453–55, 864 A.2d 1191 (2005)."
    const cites = caseCites(text)
    expect(cites).toHaveLength(2)
    expect(cites[0].groupId).toBe(cites[1].groupId)
  })

  it("accepts multi-pincite list (', NNN, NNN, ')", () => {
    const text =
      "Roe v. Wade, 410 U.S. 113, 115, 153, 93 S. Ct. 705 (1973)."
    const cites = caseCites(text)
    expect(cites).toHaveLength(2)
    expect(cites[0].groupId).toBe(cites[1].groupId)
    expect(cites[0].parallelCitations).toEqual([
      { volume: 93, reporter: "S. Ct.", page: 705 },
    ])
  })

  it("accepts footnote pincite (', NNN n.N, ')", () => {
    // Note: this synthetic uses F.2d (federal) + A.2d (regional reporter) as
    // a parallel pair, which isn't a real-world combination but exercises the
    // classifier in isolation. If the test fails, print the extracted tokens
    // first — the tokenizer may treat one of these as non-case-shape in this
    // exact context, in which case substitute a more realistic reporter combo
    // (e.g. two state-court reporters that legitimately appear as parallels).
    const text = "Smith v. Jones, 100 F.2d 50, 55 n.3, 200 A.2d 100 (1990)."
    const cites = caseCites(text)
    expect(cites).toHaveLength(2)
    expect(cites[0].groupId).toBe(cites[1].groupId)
  })

  it("REJECTS gap with prose text (', see also, ')", () => {
    // ", see also, " between cites is two separate cases joined by a signal,
    // not a parallel pair. Must NOT be detected as parallel.
    const text =
      "Smith v. Jones, 374 N.J. Super. 448, see also, 864 A.2d 1191 (2005)."
    const cites = caseCites(text)
    // Two valid outcomes both count as "rejected":
    //   (a) tokenizer doesn't extract both as case-shape (length < 2)
    //   (b) both extracted but without a shared groupId
    if (cites.length >= 2 && cites[0].groupId !== undefined && cites[1].groupId !== undefined) {
      expect(cites[0].groupId).not.toBe(cites[1].groupId)
    }
  })

  it("REJECTS gap with mixed prose and digits (', page 453 of, ')", () => {
    const text =
      "Smith v. Jones, 374 N.J. Super. 448, page 453 of, 864 A.2d 1191 (2005)."
    const cites = caseCites(text)
    if (cites.length >= 2 && cites[0].groupId !== undefined && cites[1].groupId !== undefined) {
      expect(cites[0].groupId).not.toBe(cites[1].groupId)
    }
  })

  it("tight comma (', ') still works (regression for existing behavior)", () => {
    // Pre-existing canonical case — `186 N.J. 78, 891 A.2d 1202` with no
    // pincite between — must continue to detect.
    const text = "Smith v. Jones, 186 N.J. 78, 891 A.2d 1202 (2006)."
    const cites = caseCites(text)
    expect(cites).toHaveLength(2)
    expect(cites[0].groupId).toBe(cites[1].groupId)
  })
})
```

- [ ] **Step 2.2: Run the new tests**

```bash
pnpm exec vitest run tests/extract/detectParallelPinciteBetween.test.ts 2>&1 | tail -15
```

Expected: all 8 tests PASS.

If any test fails:
- For "accepts" failures: print the extracted citations and inspect the `groupId` / `parallelCitations` fields. Likely cause is that the test text doesn't tokenize as expected — verify by minimizing the input.
- For "REJECTS" failures: this would mean the structural classifier is too permissive. Print the gap text and the segments array — confirm `parsePincite` correctly returns null for the prose.

- [ ] **Step 2.3: Run the full suite**

```bash
pnpm exec vitest run 2>&1 | tail -5
```

Expected: full suite still passes.

- [ ] **Step 2.4: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint 2>&1 | tail -5
```

Expected: both pass.

- [ ] **Step 2.5: Commit**

```bash
git add tests/extract/detectParallelPinciteBetween.test.ts
git commit -m "$(cat <<'EOF'
test(extract): cover pincite-between gap shapes in detectParallel

Focused unit tests for each pincite shape the classifier accepts
(single page, page range, en-dash range, multi-pincite list, footnote)
and the prose shapes it must reject (signal words, mixed digits/text).
Plus a regression test for the existing tight-comma case.

Locks in the gap-classifier behavior so future changes to parsePincite
or the detectParallel logic don't silently regress any individual form.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Changeset

**Files:**
- Create: `.changeset/parallel-cites-pincite-between.md`

- [ ] **Step 3.1: Write the changeset**

```markdown
---
"eyecite-ts": patch
---

fix(extract): detect parallel citations across pincite-between gaps (Bluebook canonical)

`detectParallel` now accepts the **Bluebook-canonical pincite-between form** per Indigo Book R12.3, where the primary's pincite sits between the two parallel cites:

```
374 N.J. Super. 448, 453–55, 864 A.2d 1191 (App. Div. 2005)
```

Previously, `MAX_PROXIMITY = 5` chars after the comma rejected this form, so eyecite-ts only detected the less-common no-pincite variant (`186 N.J. 78, 891 A.2d 1202`). The fix delegates to the existing `parsePincite` helper as single source of truth for "what counts as a pincite," automatically covering all forms (page, range, star, paragraph, footnote, etc.).

**Behavior changes:**

- Parallel citations across pincite-between gaps are now grouped via `groupId` and `parallelCitations[]`. Consumers calling `groupByCase()` will see fewer logical case groups for inputs containing this form (parallel pairs now collapse from two groups into one — correct behavior).
- Indirect win: the string-cite walker (`detectStringCites.ts`) no longer mis-groups parallel secondaries with unrelated authorities across `;` separators, because they're now properly classified as secondaries.

**No API changes.** Existing `groupId`, `parallelCitations[]`, and `groupByCase()` work as before; they just get populated correctly for more inputs.

See `docs/superpowers/specs/2026-05-19-parallel-cites-pincite-between-design.md` for the full design and `docs/research/2026-05-19-parallel-citation-detection.md` for the Bluebook + Python eyecite + industry reference validation.
```

- [ ] **Step 3.2: Commit**

```bash
git add .changeset/parallel-cites-pincite-between.md
git commit -m "$(cat <<'EOF'
chore: changeset for parallel-cite pincite-between detection fix

Patch bump — bug fix only, no API change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Final Verification

- [ ] **Step 4.1: Full suite + typecheck + lint + build + size**

```bash
pnpm exec vitest run && pnpm typecheck && pnpm lint && pnpm build && pnpm size 2>&1 | tail -15
```

Expected: all five pass. Tests should show ~2995 baseline + 10 new (2 Randolph fixture + 8 unit tests) = ~3005 passing.

- [ ] **Step 4.2: Review the diff**

```bash
git log --oneline main..HEAD
git diff main..HEAD --stat
```

Expected: **3 commits** (Tasks 1, 2, 3 each create one). Stat shows changes concentrated in `src/extract/detectParallel.ts`, `tests/extract/`, and `.changeset/`.

- [ ] **Step 4.3: Hand off**

Implementation complete. Open a PR (don't push automatically — confirm with the user first per project conventions). Suggested PR title: **"fix(extract): detect parallel cites across pincite-between gaps (Bluebook canonical)"**.
