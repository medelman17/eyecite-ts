# Pincite Inheritance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Bluebook Rule 4.1-correct pincite inheritance for bare `Id.` / `supra` / short-form-case citations: each inherits the pincite of its *immediately preceding same-authority* citation, not the terminal full citation. Fixes the bug where intermediate `Id. at X` pincites are dropped.

**Architecture:** A single post-resolution pass on `DocumentResolver` walks each short-form citation's predecessors backward, stops at authority boundaries (different `resolvedTo`) or successful inheritance, skips citations nested in explanatory parentheticals (Rule 4.1 explicit exception), and copies pincite + pinciteInfo from the first eligible predecessor. Two new optional fields (`pinciteInherited`, `pinciteInheritedFrom`) carry provenance.

**Tech Stack:** TypeScript, Vitest 4, pnpm 10, Biome 2. Zero new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-05-19-pincite-inheritance-design.md`
**Research:** `docs/research/2026-05-19-pincite-inheritance.md`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/types/citation.ts` | Modify | Add `pinciteInherited?` + `pinciteInheritedFrom?` to `IdCitation`, `SupraCitation`, `ShortFormCaseCitation` |
| `src/resolve/DocumentResolver.ts` | Modify | Remove pincite/pinciteInfo lines from the existing inline `if (citation.type === "id" && resolution?.resolvedTo !== undefined)` block. Add `private inheritPincites(resolved)` method. Call it once at the end of `resolve()`. |
| `tests/resolve/idInheritsPincite.test.ts` | Modify + extend | Flip the codified-bug test expectation (line ~88-103) to Bluebook-correct behavior. Add new `describe` blocks for chains, parentheticals, authority boundaries, supra/short-form intermediates, statute chains, signals, footnotes. |
| `.changeset/pincite-inheritance.md` | Create | Minor bump describing the inheritance fix and the two new optional fields. |

No changes to `src/index.ts` (new fields ride on already-exported interfaces).

---

## Pre-flight: Branch & Workspace

The work happens on `feat/confidence-scoring-phase-1-2` (the spec and research already live there). Verify:

```bash
git rev-parse --abbrev-ref HEAD
# Expected: feat/confidence-scoring-phase-1-2

git status
# Expected: modified package.json + pnpm-lock.yaml (persistent drift — leave alone),
#           plus untracked dev scripts. No staged changes.
```

If you're on a different branch, switch back and pop the lock-file stash if present (see project memory `feedback_feature_branches.md` and `project_persistent_drift.md`).

---

## Task 1: Add Type Fields

**Files:**
- Modify: `src/types/citation.ts` (three interfaces: `IdCitation` ~line 721, `SupraCitation` ~line 763, `ShortFormCaseCitation` ~line 787)

- [ ] **Step 1.1: Add fields to `IdCitation`**

Find the existing `pinciteInfo?:` line inside `IdCitation` (~line 725). Insert these two field declarations immediately after it:

```ts
  /**
   * True if `pincite` was inherited from a preceding same-authority citation
   * per Bluebook Rule 4.1. Undefined when `pincite` was extracted directly
   * from this citation's text or when no pincite was set.
   */
  pinciteInherited?: boolean
  /**
   * Array index of the citation from which `pincite` was inherited.
   * Indexes into the same array this citation appears in — i.e., the
   * output of `extractCitations(...).citations` (or
   * `DocumentResolver.resolve()`'s output, which preserves input order).
   * Set only when `pinciteInherited` is true. Records the immediate
   * predecessor; follow transitively for the chain's originator.
   */
  pinciteInheritedFrom?: number
```

- [ ] **Step 1.2: Add the same two fields to `SupraCitation`**

Find `SupraCitation`'s `pinciteInfo?:` line (~line 770). Insert the same two declarations after it (copy verbatim — the JSDoc applies identically).

- [ ] **Step 1.3: Add the same two fields to `ShortFormCaseCitation`**

Find `ShortFormCaseCitation`'s `pinciteInfo?:` line (~line 794). Insert the same two declarations after it.

- [ ] **Step 1.4: Run typecheck**

```bash
pnpm typecheck
```

Expected: passes with zero errors. The new fields are optional and don't affect existing consumers.

- [ ] **Step 1.5: Run lint**

```bash
pnpm lint
```

Expected: passes.

- [ ] **Step 1.6: Commit**

```bash
git add src/types/citation.ts
git commit -m "$(cat <<'EOF'
types: add pinciteInherited/pinciteInheritedFrom to short-form citations

Adds two optional provenance fields to IdCitation, SupraCitation, and
ShortFormCaseCitation in preparation for Bluebook Rule 4.1 pincite
inheritance. No runtime change in this commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Flip the Codified-Bug Test (TDD Red)

The existing test at `tests/resolve/idInheritsPincite.test.ts` lines ~88-103 asserts buggy behavior (`ids[1].pincite === 55`) where Bluebook Rule 4.1 actually requires `62`. We flip the expectation first so it becomes our failing test.

**Files:**
- Modify: `tests/resolve/idInheritsPincite.test.ts`

- [ ] **Step 2.1: Update the test expectations and comment**

Find the existing `it("\`Id. at 62.\` then \`Id.\` — second Id. inherits 62 from chain root's pincite", ...)` block. Replace the entire `it(...)` block with:

```ts
    it("`Id. at 62.` then `Id.` — second Id. inherits 62 from immediate predecessor (Rule 4.1)", () => {
      // Bluebook Rule 4.1: `Id.` refers to the immediately preceding cited
      // authority. A bare `Id.` after `Id. at 62.` inherits the pincite of
      // that immediate predecessor (62), NOT the terminal full citation's
      // pincite (55). See docs/research/2026-05-19-pincite-inheritance.md.
      const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. at 62. Id."
      const cites = extractCitations(text, { resolve: true })
      const ids = cites.filter((c): c is IdCitation => c.type === "id")
      expect(ids).toHaveLength(2)
      expect(ids[0].pincite).toBe(62)
      expect(ids[1].pincite).toBe(62)
      expect(ids[1].pinciteInherited).toBe(true)
      expect(ids[1].pinciteInheritedFrom).toBe(/* index of ids[0] in cites */ 1)
    })
```

Note the `pinciteInheritedFrom` assertion: in the citation array, the full `Smith` is index 0, the `Id. at 62` is index 1, the bare `Id.` is index 2. So `ids[1]` (the bare `Id.`) inherited from index 1.

- [ ] **Step 2.2: Run just this test to see it fail**

```bash
pnpm exec vitest run tests/resolve/idInheritsPincite.test.ts -t "second Id. inherits 62 from immediate predecessor"
```

Expected: **FAIL.** The current implementation produces `ids[1].pincite === 55` (chases to Smith), but we now expect `62`. The `pinciteInherited` and `pinciteInheritedFrom` assertions also fail because those fields don't exist yet at runtime.

- [ ] **Step 2.3: Do NOT commit**

Stay red. The commit happens at end of Task 3 once the implementation makes the test green.

---

## Task 3: Implement `inheritPincites` (TDD Green)

This task adds the new pass and calls it. We do NOT yet remove the existing inline inheritance — that comes in Task 4. The new pass runs *after* the inline block, so for the test from Task 2 the new pass overwrites whatever the inline block produced.

**Files:**
- Modify: `src/resolve/DocumentResolver.ts`

- [ ] **Step 3.1: Add the helper to determine pincite family**

At the top of `src/resolve/DocumentResolver.ts`, find the existing `import { isFullCitation } from "../types/guards"` line. After it, add (or extend) imports so the resolver can name the types it inspects:

```ts
import type { Citation, FullCitation } from "../types/citation"
```

(Skip any types already imported — Biome will flag duplicates.)

Then, near the other private helpers in the class (look for `computeParenDepths` around line 361), add this private static-style helper as a method:

```ts
  /**
   * Returns the expected pincite shape ("numeric" | "string") for the
   * given full citation. Case-family citations carry numeric pincites;
   * statute-family citations carry string pincites. Returns "unknown"
   * if the type doesn't carry a pincite.
   */
  private pinciteFamily(cit: FullCitation): "numeric" | "string" | "unknown" {
    switch (cit.type) {
      case "case":
      case "journal":
      case "neutral":
        return "numeric"
      case "statute":
        return "string"
      default:
        return "unknown"
    }
  }
```

- [ ] **Step 3.2: Add the `inheritPincites` private method**

Immediately after the new `pinciteFamily` helper, add:

```ts
  /**
   * Post-resolution pass: propagate pincite from the immediately preceding
   * same-authority citation per Bluebook Rule 4.1. Mutates `resolved` in
   * place. Idempotent — re-running is a no-op since already-inherited
   * pincites are skipped by the eligibility gate.
   *
   * See docs/superpowers/specs/2026-05-19-pincite-inheritance-design.md.
   */
  private inheritPincites(resolved: ResolvedCitation[]): void {
    for (let i = 0; i < resolved.length; i++) {
      const cit = resolved[i]

      // Eligibility: only short-forms with a successful resolution and no
      // explicit pincite/pinciteInfo of their own.
      if (cit.type !== "id" && cit.type !== "supra" && cit.type !== "shortFormCase") continue
      const myResolution = this.resolutions[i]
      if (!myResolution || myResolution.resolvedTo === undefined) continue
      if (cit.pincite !== undefined || cit.pinciteInfo !== undefined) continue

      const targetPrimary = myResolution.resolvedTo
      const currentParenDepth = this.parenDepths[i] ?? 0

      // Family lookup uses the terminal full citation (where pincite shape
      // is unambiguous). resolved[targetPrimary] is guaranteed full because
      // resolvedTo always points at a full citation.
      const targetFull = resolved[targetPrimary] as FullCitation
      const targetFamily = this.pinciteFamily(targetFull)
      if (targetFamily === "unknown") continue

      for (let j = i - 1; j >= 0; j--) {
        // Rule 4.1 explicit exception: explanatory-parenthetical cites
        // are not "intervening authorities."
        if ((this.parenDepths[j] ?? 0) > currentParenDepth) continue

        const cand = resolved[j]
        const candPrimary = isFullCitation(cand)
          ? j
          : this.resolutions[j]?.resolvedTo

        // Authority boundary: stop scanning at any prior cite that resolves
        // to a different primary (or fails to resolve).
        if (candPrimary !== targetPrimary) break

        // Skip candidates without a pincite to inherit. Continue scanning —
        // earlier same-authority cites may still carry one.
        if (cand.pincite === undefined) continue

        // Type compatibility: numeric pincite for case-family; string for
        // statute. Wrong family means a parser oddity; stop rather than
        // silently mismatching.
        const candIsNumeric = typeof cand.pincite === "number"
        const candIsString = typeof cand.pincite === "string"
        if (targetFamily === "numeric" && !candIsNumeric) break
        if (targetFamily === "string" && !candIsString) break

        // Inherit. Cast through `as` because the discriminated union'd
        // pincite types are interface-specific. Runtime check above gates it.
        ;(cit as IdCitation | SupraCitation | ShortFormCaseCitation).pincite =
          cand.pincite as never
        ;(cit as IdCitation | SupraCitation | ShortFormCaseCitation).pinciteInfo =
          cand.pinciteInfo
        ;(cit as IdCitation | SupraCitation | ShortFormCaseCitation).pinciteInherited = true
        ;(cit as IdCitation | SupraCitation | ShortFormCaseCitation).pinciteInheritedFrom = j
        break
      }
    }
  }
```

If `IdCitation`, `SupraCitation`, or `ShortFormCaseCitation` aren't already imported, add them to the existing type import block (search for `import type {` near the top — the file already imports several types from `../types/citation`).

- [ ] **Step 3.3: Call `inheritPincites` from `resolve()`**

Find the end of the `resolve()` method (around line 350, the `return resolved` line). Insert a call to the new pass on the line immediately before `return resolved`:

```ts
    this.inheritPincites(resolved)
    return resolved
```

- [ ] **Step 3.4: Run the test from Task 2 to verify it passes**

```bash
pnpm exec vitest run tests/resolve/idInheritsPincite.test.ts -t "second Id. inherits 62 from immediate predecessor"
```

Expected: PASS. Both `ids[1].pincite === 62` and the new provenance fields are populated.

- [ ] **Step 3.5: Run the whole test suite**

```bash
pnpm exec vitest run
```

Expected: ALL TESTS PASS. The new pass runs after the existing inline block, so any test that depended on the inline block's single-hop inheritance still gets the same result (the new pass either does the same thing or is a no-op when the inline block already set `pincite`).

If any test fails, **stop and investigate.** Likely candidates: a test asserting `pinciteInherited === undefined` on a citation that now has the flag set, or a previously-passing assertion that the bug-codifying test was the only canary for.

- [ ] **Step 3.6: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 3.7: Commit**

```bash
git add src/resolve/DocumentResolver.ts tests/resolve/idInheritsPincite.test.ts
git commit -m "$(cat <<'EOF'
fix(resolve): inherit pincite from immediate same-authority predecessor (Rule 4.1)

Bluebook Rule 4.1 anchors a bare Id./supra/shortFormCase to the
immediately preceding cited authority — including its pincite. The
existing inline inheritance only inherits from the terminal full
citation (resolvedTo), dropping any pincite introduced mid-chain by
an intermediate Id. at X or supra, at X.

Adds DocumentResolver.inheritPincites: post-resolution backward walk
stopping at authority boundaries, skipping parenthetical-nested cites
per Rule 4.1's explicit exception, with a family-shape gate so
numeric pincites never propagate to statutes and vice versa.

Flips the bug-codifying test in idInheritsPincite.test.ts to match
the correct Rule 4.1 semantics.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Remove the Now-Redundant Inline Inheritance

Now that `inheritPincites` handles every case the inline block handled (and more), remove the inline pincite/pinciteInfo lines. Keep the case-name inheritance and the re-scoring — those remain correct and in-scope.

**Files:**
- Modify: `src/resolve/DocumentResolver.ts`

- [ ] **Step 4.1: Locate the inline block**

Inside `DocumentResolver.resolve()`, find the block:

```ts
      let citationOut: Citation = citation
      if (citation.type === "id" && resolution?.resolvedTo !== undefined) {
        const antecedent = this.citations[resolution.resolvedTo]
        if (antecedent) {
          const idOut: IdCitation = { ...(citation as IdCitation) }

          // Pincite inheritance (when Id. has none explicit).
          if (
            idOut.pincite === undefined &&
            "pincite" in antecedent &&
            typeof antecedent.pincite === "number"
          ) {
            idOut.pincite = antecedent.pincite
            if ("pinciteInfo" in antecedent && antecedent.pinciteInfo) {
              idOut.pinciteInfo = antecedent.pinciteInfo
            }
          }

          // Case-name inheritance (only when antecedent is a `case`).
          if (antecedent.type === "case") {
            // ... keep this block intact ...
          }

          citationOut = idOut
        }
      }
```

- [ ] **Step 4.2: Remove only the pincite-inheritance lines**

Delete the entire `// Pincite inheritance (when Id. has none explicit).` comment and the `if (idOut.pincite === undefined && ...)` block (the ~10 lines that set `idOut.pincite` and `idOut.pinciteInfo`). **Leave the surrounding structure intact:** the `idOut = { ...citation }` spread, the case-name inheritance block, the `citationOut = idOut` assignment.

After the removal, the relevant section should look like:

```ts
      let citationOut: Citation = citation
      if (citation.type === "id" && resolution?.resolvedTo !== undefined) {
        const antecedent = this.citations[resolution.resolvedTo]
        if (antecedent) {
          const idOut: IdCitation = { ...(citation as IdCitation) }

          // Case-name inheritance (only when antecedent is a `case`).
          if (antecedent.type === "case") {
            // ... unchanged ...
          }

          citationOut = idOut
        }
      }
```

- [ ] **Step 4.3: Run the full test suite**

```bash
pnpm exec vitest run
```

Expected: ALL TESTS PASS. `inheritPincites` now handles every single-hop case that the inline block used to handle, so the behavior is preserved for existing tests.

If any test fails, the most likely cause is that `inheritPincites`'s eligibility/family gate is stricter than the inline block was. Investigate before re-trying: re-read the failing test, check whether the citation type or pincite shape falls through the new gate.

- [ ] **Step 4.4: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/resolve/DocumentResolver.ts
git commit -m "$(cat <<'EOF'
refactor(resolve): remove inline pincite inheritance superseded by inheritPincites

The inline block inside DocumentResolver.resolve() inherited pincite
only from the terminal full citation (resolvedTo). That behavior is
now subsumed by inheritPincites, which does the same for the
single-hop case plus the correct multi-hop walk. Keeps the inline
case-name inheritance and re-scoring untouched — those remain
correct and in-scope.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Parenthetical Exception + Test

The algorithm already implements the parenthetical-depth skip (Step 3.2, `if ((this.parenDepths[j] ?? 0) > currentParenDepth) continue`). Add a regression test to lock it in.

**Files:**
- Modify: `tests/resolve/idInheritsPincite.test.ts`

- [ ] **Step 5.1: Add a new `describe` block for parenthetical-exception tests**

Inside the top-level `describe("Id. inherits pincite from antecedent (Bluebook 4.1)", ...)` block, add a new nested `describe` (place it after the `chained Id. citations` block):

```ts
  describe("Rule 4.1 parenthetical exception", () => {
    it("`Id.` after `Smith, at 100 (citing Other, 2 F.3d 1, 5)` inherits Smith's 100", () => {
      // Bluebook Rule 4.1 explicitly excludes parenthetical-nested cites
      // ("citing", "quoting", etc.) from the "intervening authority" rule.
      // The Id. inherits from Smith (the host citation), not from Other.
      const text =
        "Smith v. Jones, 100 F.2d 50, 100 (1990) (citing Other v. Else, 2 F.3d 1, 5). Id."
      const cites = extractCitations(text, { resolve: true })
      const id = cites.find((c): c is IdCitation => c.type === "id")
      expect(id?.pincite).toBe(100)
      expect(id?.pinciteInherited).toBe(true)
    })
  })
```

- [ ] **Step 5.2: Run the test**

```bash
pnpm exec vitest run tests/resolve/idInheritsPincite.test.ts -t "Rule 4.1 parenthetical exception"
```

Expected: PASS. The parenDepth skip is already in `inheritPincites`, so the test should pass on the first run.

If it fails (the parenthetical isn't actually detected as `parenDepths[j] > 0`, or `Other` somehow shares Smith's primary), investigate `computeParenDepths` and confirm `parenDepths` is correctly tagging the inner citation. The fallback is to debug by logging `this.parenDepths` for that input.

- [ ] **Step 5.3: Run full suite to confirm nothing regressed**

```bash
pnpm exec vitest run
```

Expected: ALL TESTS PASS.

- [ ] **Step 5.4: Commit**

```bash
git add tests/resolve/idInheritsPincite.test.ts
git commit -m "$(cat <<'EOF'
test(resolve): cover Rule 4.1 parenthetical exception for pincite inheritance

Locks in the behavior that parenthetical-nested citations
("citing X", "quoting Y") do not break an Id. chain — the Id.
correctly inherits from the host citation rather than the nested one.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Add Remaining Regression Tests (Chains, Boundaries, Supra, Statute, Signals)

Batch the rest of the spec's test cases into focused `describe` blocks. The algorithm already covers them; this task locks them in as regression tests.

**Files:**
- Modify: `tests/resolve/idInheritsPincite.test.ts`

- [ ] **Step 6.1: Add the chains describe block**

After the existing `chained Id. citations` block (or after the parenthetical block from Task 5), add:

```ts
  describe("chains with intermediate pincite changes (Rule 4.1)", () => {
    it("Smith, at 55 → Id. at 115 → Id. at 200 → bare Id. inherits 200", () => {
      const text =
        "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. at 115. Id. at 200. Id."
      const cites = extractCitations(text, { resolve: true })
      const ids = cites.filter((c): c is IdCitation => c.type === "id")
      expect(ids).toHaveLength(3)
      expect(ids[0].pincite).toBe(115)
      expect(ids[1].pincite).toBe(200)
      expect(ids[2].pincite).toBe(200)
      expect(ids[2].pinciteInherited).toBe(true)
    })

    it("Smith, at 55 → Id. at 115 → bare Id. → bare Id. both inherit 115", () => {
      const text =
        "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. at 115. Id. Id."
      const cites = extractCitations(text, { resolve: true })
      const ids = cites.filter((c): c is IdCitation => c.type === "id")
      expect(ids).toHaveLength(3)
      expect(ids[0].pincite).toBe(115)
      expect(ids[1].pincite).toBe(115)
      expect(ids[1].pinciteInherited).toBe(true)
      expect(ids[2].pincite).toBe(115)
      expect(ids[2].pinciteInherited).toBe(true)
      // Provenance: third Id. inherited from the second (which itself
      // inherited from `Id. at 115`).
      expect(ids[2].pinciteInheritedFrom).toBe(ids[1].pinciteInheritedFrom! + 1)
    })
  })
```

- [ ] **Step 6.2: Add the authority-boundary describe block**

```ts
  describe("authority boundaries break the chain", () => {
    it("Smith → Id. at 115 → Jones, at 50 → Id. inherits 50 (Jones is new authority)", () => {
      const text =
        "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. at 115. Other v. Else, 200 F.3d 1, 50 (1991). Id."
      const cites = extractCitations(text, { resolve: true })
      const ids = cites.filter((c): c is IdCitation => c.type === "id")
      expect(ids).toHaveLength(2)
      // ids[0] is the `Id. at 115` referring to Smith — keeps its explicit 115.
      expect(ids[0].pincite).toBe(115)
      // ids[1] is the bare `Id.` referring to the Other v. Else citation —
      // inherits Other's pincite 50, not Smith's 55 nor the intermediate 115.
      expect(ids[1].pincite).toBe(50)
      expect(ids[1].pinciteInherited).toBe(true)
    })

    it("Smith → Id. at 115 → Other (no pincite) → Id. → undefined (Other has none)", () => {
      const text =
        "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. at 115. Other v. Else, 200 F.3d 1 (1991). Id."
      const cites = extractCitations(text, { resolve: true })
      const ids = cites.filter((c): c is IdCitation => c.type === "id")
      expect(ids).toHaveLength(2)
      expect(ids[0].pincite).toBe(115)
      // Bare Id. after Other (which has no pincite) → no inheritance; chain
      // cannot cross back to Smith because Other is an authority boundary.
      expect(ids[1].pincite).toBeUndefined()
      expect(ids[1].pinciteInherited).toBeUndefined()
    })
  })
```

- [ ] **Step 6.3: Add the supra/short-form intermediate describe block**

```ts
  describe("supra and short-form-case as intermediates", () => {
    it("Smith → Other → Smith, supra, at 50 → Id. inherits 50 from supra", () => {
      const text =
        "Smith v. Jones, 100 F.2d 50, 55 (1990). Other v. Else, 200 F.3d 1 (1991). Smith, supra, at 50. Id."
      const cites = extractCitations(text, { resolve: true })
      const id = cites.find((c): c is IdCitation => c.type === "id")
      expect(id?.pincite).toBe(50)
      expect(id?.pinciteInherited).toBe(true)
    })

    it("Smith → Smith, 100 F.2d at 115 → Id. inherits 115 from short-form", () => {
      const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Smith, 100 F.2d at 115. Id."
      const cites = extractCitations(text, { resolve: true })
      const id = cites.find((c): c is IdCitation => c.type === "id")
      expect(id?.pincite).toBe(115)
      expect(id?.pinciteInherited).toBe(true)
    })
  })
```

- [ ] **Step 6.4: Add the statute-chain describe block**

```ts
  describe("statute section-style chain", () => {
    it("28 U.S.C. § 1331 → Id. § 1331(a) → bare Id. inherits § 1331(a)", () => {
      const text = "See 28 U.S.C. § 1331. Id. § 1331(a). Id."
      const cites = extractCitations(text, { resolve: true })
      const ids = cites.filter((c): c is IdCitation => c.type === "id")
      expect(ids).toHaveLength(2)
      // ids[0] has explicit subsection — keeps it.
      expect(ids[0].pincite).toBe("(a)")
      // ids[1] inherits the string-style pincite from the immediate
      // predecessor. Family-compat gate accepts string for statute family.
      expect(ids[1].pincite).toBe("(a)")
      expect(ids[1].pinciteInherited).toBe(true)
    })
  })
```

Note on the assertion `expect(ids[0].pincite).toBe("(a)")`: statute-pincite shape is determined by the eyecite-ts extractor; the exact string value (`"(a)"` vs `"1331(a)"` vs `"§ 1331(a)"`) depends on how the statute extractor structures it. If this assertion fails, first run the test, inspect the actual value, and update both `ids[0]` and `ids[1]` expectations to match. The point of the test is provenance — that `ids[1]` carries the same string `ids[0]` does, plus `pinciteInherited === true`.

- [ ] **Step 6.5: Add the signals-don't-break-chains describe block**

```ts
  describe("signals do not break Id. chains", () => {
    it("Smith → see also Id. at 115 → see Id. inherits 115", () => {
      const text =
        "Smith v. Jones, 100 F.2d 50, 55 (1990). See also Id. at 115. See Id."
      const cites = extractCitations(text, { resolve: true })
      const ids = cites.filter((c): c is IdCitation => c.type === "id")
      expect(ids).toHaveLength(2)
      expect(ids[0].pincite).toBe(115)
      expect(ids[1].pincite).toBe(115)
      expect(ids[1].pinciteInherited).toBe(true)
    })
  })
```

- [ ] **Step 6.6: Add the footnotes describe block**

```ts
  describe("footnote-bounded chains", () => {
    it("cross-footnote chain with single-authority footnotes inherits correctly", () => {
      // Each footnote carries exactly one citation, so Rule 4.1's
      // single-authority cross-footnote rule applies. The existing
      // "footnote" scope strategy allows Id. to cross into the body
      // for supra/short-form but is strict for Id. — for this test we
      // place all three citations in a single contiguous body region
      // since footnote detection requires specific markup.
      // (Equivalent semantics test without footnote markup.)
      const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. at 115. Id."
      const cites = extractCitations(text, {
        resolve: true,
        detectFootnotes: true,
      })
      const ids = cites.filter((c): c is IdCitation => c.type === "id")
      expect(ids).toHaveLength(2)
      expect(ids[1].pincite).toBe(115)
      expect(ids[1].pinciteInherited).toBe(true)
    })
  })
```

Note: if the eyecite-ts test fixtures include actual footnote-markup samples (e.g., HTML with `<footnote>` tags), prefer adapting one of those over the inline-body equivalent. Search `tests/footnotes/` for examples. The minimum bar for this test is that `inheritPincites` works correctly when `detectFootnotes: true` is enabled — not whether the footnote-detector itself is right (that's covered by its own tests).

- [ ] **Step 6.7: Run the full pincite-inheritance file**

```bash
pnpm exec vitest run tests/resolve/idInheritsPincite.test.ts
```

Expected: ALL TESTS PASS, including the new blocks from Tasks 5 and 6.

If a test fails, investigate the **actual** value the algorithm produced — most likely an off-by-one on indices, an unexpected family-gate stop, or (for the statute test) a different pincite-string shape than guessed. Adjust the test to match the algorithm's actual (Bluebook-correct) output, OR fix the algorithm if the test reveals a real bug.

- [ ] **Step 6.8: Run the entire test suite**

```bash
pnpm exec vitest run
```

Expected: ALL TESTS PASS.

- [ ] **Step 6.9: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 6.10: Commit**

```bash
git add tests/resolve/idInheritsPincite.test.ts
git commit -m "$(cat <<'EOF'
test(resolve): lock in pincite inheritance across chains, authorities, statutes, signals, footnotes

Adds regression tests for every case enumerated in the design spec:
- Multi-hop chains with mid-chain pincite changes
- Authority boundaries (different resolvedTo) breaking the chain
- Supra and short-form-case as intermediates
- Statute section-style pincite inheritance (preserves string shape)
- Signals (see, see also, cf.) do not break Id. chains
- Footnote-aware chains via detectFootnotes: true

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Add Changeset

**Files:**
- Create: `.changeset/pincite-inheritance.md`

- [ ] **Step 7.1: Write the changeset file**

Create the file with this content:

```markdown
---
"eyecite-ts": minor
---

fix(resolve): inherit pincite from immediate same-authority predecessor (Bluebook Rule 4.1)

`Id.`, `supra`, and short-form-case citations now inherit their pincite from the **immediately preceding same-authority citation** — including from intermediate `Id. at X` or `supra, at X` predecessors — rather than only from the terminal full citation. This matches Bluebook Rule 4.1 and fixes a real bug.

**Behavior changes:**

- `Smith → Id. at 115 → bare Id.` now produces `pincite = 115` on the bare `Id.` (previously `undefined`).
- `Smith → Jones → Smith, supra, at 50 → bare Id.` now produces `pincite = 50` (previously `undefined`).
- `Smith, at 100 → Id. at 115 → Id. → Id.` — all three trailing citations now correctly inherit `115`.
- `Supra` and `ShortFormCaseCitation` gain pincite inheritance for the first time. Previously only `Id.` inherited.

**New optional fields on `IdCitation`, `SupraCitation`, `ShortFormCaseCitation`:**

- `pinciteInherited?: boolean` — true when `pincite` was inherited per Rule 4.1.
- `pinciteInheritedFrom?: number` — array index (in `extractCitations(...).citations`) of the immediate predecessor that supplied the pincite. Follow transitively for the chain's originator.

**Migration:** No code changes required for consumers reading `pincite`. The inherited value is semantically equivalent to one extracted directly (Rule 4.1 makes them identical). Consumers wanting to distinguish "explicit in text" from "inherited per rule" should branch on `pinciteInherited`.

**Non-goals (future work):** `MAX_OPINION_PAGE_COUNT`-style range validation on inherited pincites; expanding case-name inheritance to `Supra` and `ShortFormCaseCitation`.

See `docs/superpowers/specs/2026-05-19-pincite-inheritance-design.md` for the full design and `docs/research/2026-05-19-pincite-inheritance.md` for the Bluebook + Python eyecite reference validation.
```

- [ ] **Step 7.2: Commit**

```bash
git add .changeset/pincite-inheritance.md
git commit -m "$(cat <<'EOF'
chore: changeset for pincite inheritance fix

Minor bump — adds two optional provenance fields and a Bluebook
Rule 4.1-correct behavior change for short-form pincite inheritance.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Final Verification

- [ ] **Step 8.1: Full test suite, typecheck, lint, build**

```bash
pnpm exec vitest run && pnpm typecheck && pnpm lint && pnpm build
```

Expected: all four pass.

- [ ] **Step 8.2: Run the size check**

```bash
pnpm size
```

Expected: within configured limits. The new code is small (~50 lines in `DocumentResolver.ts`); should be well within budget.

- [ ] **Step 8.3: Review the diff one last time**

```bash
git log --oneline main..HEAD
git diff main..HEAD --stat
```

Expected: ~5 commits (Tasks 1, 3, 4, 5, 6, 7) plus the spec/research commits that were already on the branch. Stat should show changes to `src/types/citation.ts`, `src/resolve/DocumentResolver.ts`, `tests/resolve/idInheritsPincite.test.ts`, `.changeset/pincite-inheritance.md`, and the docs files.

- [ ] **Step 8.4: Hand off**

Implementation complete. Open a PR (don't push automatically — confirm with the user first per project conventions). Suggested PR title: **"fix(resolve): inherit pincite from immediate same-authority predecessor (Bluebook Rule 4.1)"**.
