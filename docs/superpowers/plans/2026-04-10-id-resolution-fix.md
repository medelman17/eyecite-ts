# Fix #170: Id. Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Id. citation resolution so it correctly resolves through short-form citations, supra, and non-case citation types, matching Bluebook rules and Python eyecite behavior.

**Architecture:** Replace the backward search in `resolveId` with a forward-tracking `lastResolvedIndex` pointer that updates after every successfully resolved citation (full or short-form). Remove dead `lastFullCitation` field.

**Tech Stack:** TypeScript, Vitest

---

### Task 1: Write Failing Tests for Id. After Short-Form

**Files:**
- Modify: `tests/integration/resolution.test.ts`

These tests capture the bug from #170 and the additional scenarios from the spec.

- [ ] **Step 1: Add new test describe block with all five test cases**

Add inside the top-level `describe("Resolution Integration Tests")`, after the existing `"Id. Citation Resolution"` block:

```typescript
describe("Id. Resolution Through Short-Form Citations (#170)", () => {
  it("resolves Id. through preceding short-form case citation", () => {
    const text =
      "Smith v. Jones, 500 F.2d 123 (2020). " +
      "Celotex Corp. v. Catrett, 477 U.S. 317 (1986). " +
      "500 F.2d at 128. " +
      "Id. at 129."

    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

    // Find citations by type
    const smith = citations.find(c => c.type === "case" && c.reporter === "F.2d")
    const celotex = citations.find(c => c.type === "case" && c.reporter === "U.S.")
    const shortForm = citations.find(c => c.type === "shortFormCase")
    const id = citations.find(c => c.type === "id")

    expect(smith).toBeDefined()
    expect(celotex).toBeDefined()
    expect(shortForm).toBeDefined()
    expect(id).toBeDefined()

    const smithIndex = citations.indexOf(smith!)

    // Short-form resolves to Smith (not Celotex)
    expect(shortForm!.resolution?.resolvedTo).toBe(smithIndex)

    // Id. resolves to Smith (via short-form), NOT Celotex
    expect(id!.resolution?.resolvedTo).toBe(smithIndex)
    expect(id!.resolution?.confidence).toBe(1.0)
  })

  it("resolves Id. through preceding supra citation", () => {
    const text =
      "Smith v. Jones, 500 F.2d 123 (2020). " +
      "Brown v. Board, 347 U.S. 483 (1954). " +
      "Smith, supra, at 130. " +
      "Id. at 131."

    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

    const smith = citations.find(c => c.type === "case" && c.reporter === "F.2d")
    const id = citations.find(c => c.type === "id")

    expect(smith).toBeDefined()
    expect(id).toBeDefined()

    const smithIndex = citations.indexOf(smith!)

    // Id. resolves to Smith (via supra), NOT Brown
    expect(id!.resolution?.resolvedTo).toBe(smithIndex)
  })

  it("fails Id. when preceding short-form fails to resolve", () => {
    const text = "400 F.3d at 200. Id. at 201."

    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

    const shortForm = citations.find(c => c.type === "shortFormCase")
    const id = citations.find(c => c.type === "id")

    expect(shortForm).toBeDefined()
    expect(id).toBeDefined()

    // Short-form fails (no matching full citation)
    expect(shortForm!.resolution?.resolvedTo).toBeUndefined()

    // Id. also fails (preceding resolution failed)
    expect(id!.resolution?.resolvedTo).toBeUndefined()
    expect(id!.resolution?.failureReason).toBeDefined()
  })

  it("resolves Id. after statute citation", () => {
    const text =
      "Smith v. Jones, 500 F.2d 123 (2020). " +
      "42 U.S.C. § 1983. " +
      "Id."

    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

    const statute = citations.find(c => c.type === "statute")
    const id = citations.find(c => c.type === "id")

    expect(statute).toBeDefined()
    expect(id).toBeDefined()

    const statuteIndex = citations.indexOf(statute!)

    // Id. resolves to statute (the most recently cited authority)
    expect(id!.resolution?.resolvedTo).toBe(statuteIndex)
  })

  it("resolves chain of Id. through short-form", () => {
    const text =
      "Smith v. Jones, 500 F.2d 123 (2020). " +
      "Celotex Corp. v. Catrett, 477 U.S. 317 (1986). " +
      "500 F.2d at 128. " +
      "Id. at 129. " +
      "Id. at 130."

    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]

    const smith = citations.find(c => c.type === "case" && c.reporter === "F.2d")
    const ids = citations.filter(c => c.type === "id")

    expect(smith).toBeDefined()
    expect(ids).toHaveLength(2)

    const smithIndex = citations.indexOf(smith!)

    // Both Id. citations resolve to Smith
    expect(ids[0].resolution?.resolvedTo).toBe(smithIndex)
    expect(ids[1].resolution?.resolvedTo).toBe(smithIndex)
  })
})
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `pnpm exec vitest run tests/integration/resolution.test.ts -t "Id. Resolution Through Short-Form"`

Expected: At least the first test (`resolves Id. through preceding short-form case citation`) and the statute test fail. The Id. resolves to Celotex instead of Smith, and the statute test fails because `resolveId` only looks for `type === "case"`.

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/integration/resolution.test.ts
git commit -m "test: add failing tests for Id. resolution through short-form citations (#170)"
```

---

### Task 2: Update ResolutionContext Type

**Files:**
- Modify: `src/resolve/types.ts:118-143`

- [ ] **Step 1: Replace `lastFullCitation` with `lastResolvedIndex` in ResolutionContext**

Replace the `lastFullCitation` field:

```typescript
export interface ResolutionContext {
  /** Current citation index being processed */
  citationIndex: number

  /** All citations in document (for lookback) */
  allCitations: Citation[]

  /**
   * Index of the full citation most recently cited (directly or via resolution).
   * Updated after every successfully resolved citation.
   * Used by Id. resolution -- Id. inherits this value.
   *
   * For full citations: set to the citation's own index.
   * For resolved short-form/supra/Id.: set to resolvedTo (the full antecedent index).
   * For failed resolutions: NOT updated (Id. after a failed citation also fails).
   */
  lastResolvedIndex?: number

  /**
   * History of all full citations by party name.
   * Maps normalized party name to citation index.
   * Used for supra resolution.
   */
  fullCitationHistory: Map<string, number>

  /**
   * Map of citation index to paragraph number.
   * Used for scope boundary checking.
   */
  paragraphMap: Map<number, number>
}
```

- [ ] **Step 2: Run typecheck to see what breaks**

Run: `pnpm typecheck`

Expected: Error in `DocumentResolver.ts` at lines 73 and 121 where `lastFullCitation` is referenced.

- [ ] **Step 3: Commit type change**

```bash
git add src/resolve/types.ts
git commit -m "refactor: replace dead lastFullCitation with lastResolvedIndex in ResolutionContext (#170)"
```

---

### Task 3: Update DocumentResolver

**Files:**
- Modify: `src/resolve/DocumentResolver.ts:70-168`

- [ ] **Step 1: Update context initialization (line 70-76)**

Replace:

```typescript
    // Initialize resolution context
    this.context = {
      citationIndex: 0,
      allCitations: citations,
      lastFullCitation: undefined,
      fullCitationHistory: new Map(),
      paragraphMap: new Map(),
    }
```

With:

```typescript
    // Initialize resolution context
    this.context = {
      citationIndex: 0,
      allCitations: citations,
      lastResolvedIndex: undefined,
      fullCitationHistory: new Map(),
      paragraphMap: new Map(),
    }
```

- [ ] **Step 2: Update the resolve() loop (lines 98-136)**

Replace the entire `resolve()` method:

```typescript
  resolve(): ResolvedCitation[] {
    const resolved: ResolvedCitation[] = []

    for (let i = 0; i < this.citations.length; i++) {
      this.context.citationIndex = i
      const citation = this.citations[i]

      // Resolve based on citation type
      let resolution: ResolutionResult | undefined

      switch (citation.type) {
        case "id":
          resolution = this.resolveId(citation)
          break
        case "supra":
          resolution = this.resolveSupra(citation)
          break
        case "shortFormCase":
          resolution = this.resolveShortFormCase(citation)
          break
        default:
          // Full citation - update context for future resolutions
          if (isFullCitation(citation)) {
            this.context.lastResolvedIndex = i
            this.trackFullCitation(citation, i)
          }
          break
      }

      // After resolving a short-form citation, update lastResolvedIndex
      // to the full citation it resolved to (transitive resolution).
      // If resolution failed, lastResolvedIndex is NOT updated --
      // a subsequent Id. will also fail (matching Python eyecite behavior).
      if (resolution?.resolvedTo !== undefined) {
        this.context.lastResolvedIndex = resolution.resolvedTo
      }

      // Add citation with resolution metadata
      // Type assertion is safe: runtime logic only sets resolution on short-form citations
      resolved.push({
        ...citation,
        resolution,
      } as ResolvedCitation)
    }

    return resolved
  }
```

- [ ] **Step 3: Replace resolveId (lines 141-168)**

Replace the entire `resolveId` method:

```typescript
  /**
   * Resolves Id. citation to the most recently cited authority.
   * Uses lastResolvedIndex which tracks the most recent successfully
   * resolved citation (full, short-form, supra, or Id.).
   */
  private resolveId(_citation: IdCitation): ResolutionResult | undefined {
    const currentIndex = this.context.citationIndex
    const antecedentIndex = this.context.lastResolvedIndex

    // No preceding citation has been resolved yet
    if (antecedentIndex === undefined) {
      return this.createFailureResult("No preceding citation found")
    }

    // Check scope boundary
    if (!this.isWithinScope(antecedentIndex, currentIndex)) {
      return this.createFailureResult("Antecedent citation outside scope boundary")
    }

    return {
      resolvedTo: antecedentIndex,
      confidence: 1.0, // Id. resolution is unambiguous when successful
    }
  }
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`

Expected: PASS — no type errors.

- [ ] **Step 5: Run all resolution tests**

Run: `pnpm exec vitest run tests/integration/resolution.test.ts`

Expected: All tests pass, including the new #170 tests from Task 1.

- [ ] **Step 6: Run full test suite**

Run: `pnpm exec vitest run`

Expected: All tests pass. No regressions.

- [ ] **Step 7: Commit implementation**

```bash
git add src/resolve/DocumentResolver.ts
git commit -m "fix: resolve Id. through short-form/supra citations (#170)

Replace backward search in resolveId with forward-tracking
lastResolvedIndex pointer that updates after every successfully
resolved citation. Matches Python eyecite's last_resolution pattern
and Bluebook Rule 4.1.

Fixes: Id. after short-form, Id. after supra, Id. after statute,
failed-preceding-propagation."
```

---

### Task 4: Update Error Message in Existing Test and README

**Files:**
- Modify: `tests/integration/resolution.test.ts:57`
- Modify: `README.md:350`

The error message changed from `"No preceding full case citation found"` to `"No preceding citation found"`.

- [ ] **Step 1: Update the existing test assertion**

In `tests/integration/resolution.test.ts`, line 57, replace:

```typescript
      expect(citations[0].resolution?.failureReason).toContain("No preceding full case citation")
```

With:

```typescript
      expect(citations[0].resolution?.failureReason).toContain("No preceding citation found")
```

- [ ] **Step 2: Update README example**

In `README.md`, line 350, replace:

```
// citations[0].resolution.failureReason === 'No preceding full case citation found'
```

With:

```
// citations[0].resolution.failureReason === 'No preceding citation found'
```

- [ ] **Step 3: Run the updated test**

Run: `pnpm exec vitest run tests/integration/resolution.test.ts -t "fails to resolve orphan Id"`

Expected: PASS

- [ ] **Step 4: Run full test suite one final time**

Run: `pnpm exec vitest run`

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/resolution.test.ts README.md
git commit -m "docs: update Id. resolution error message in test and README (#170)"
```
