# Fix #168 + #169: Case Name Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `extractCaseName` so it no longer captures preceding sentence text (e.g., "The court cited") as part of the plaintiff name.

**Architecture:** Add a post-match validation step after `V_CASE_NAME_REGEX` matches. A `isLikelyPartyName` function checks that every word in the plaintiff is either capitalized or a known legal connector (of, the, and, etc.). When validation fails, trim from the left to the first valid party name start, preserving any signal word prefix for downstream handling.

**Tech Stack:** TypeScript, Vitest

---

### File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/extract/extractCase.ts:259-325` | Modify | Add `isLikelyPartyName` and trimming logic to `extractCaseName` |
| `tests/extract/extractCase.test.ts` | Modify | Add tests for sentence context trimming |

---

### Task 1: Write Failing Tests

**Files:**
- Modify: `tests/extract/extractCase.test.ts`

- [ ] **Step 1: Add test describe block for case name sentence trimming**

Add inside the existing `describe("case name extraction (Phase 6)")` block (around line 673), after the existing tests:

```typescript
  describe("sentence context trimming (#168, #169)", () => {
    it("trims short sentence context from plaintiff", () => {
      const citations = extractCitations(
        "The court cited Smith v. Jones, 500 F.2d 123 (2020).",
      )
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].caseName).toBe("Smith v. Jones")
        expect(citations[0].plaintiff).toBe("Smith")
      }
    })

    it("trims long sentence context from plaintiff", () => {
      const citations = extractCitations(
        "The Ninth Circuit addressed this issue in Smith v. Jones, 500 F.2d 123 (2020).",
      )
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].caseName).toBe("Smith v. Jones")
        expect(citations[0].plaintiff).toBe("Smith")
      }
    })

    it("trims very long sentence context", () => {
      const citations = extractCitations(
        "As the court explained in its thorough opinion discussing the standard of review in Smith v. Jones, 500 F.2d 123 (2020).",
      )
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].caseName).toBe("Smith v. Jones")
      }
    })

    it("preserves multi-word party names", () => {
      const citations = extractCitations(
        "United States v. Jones, 500 F.2d 123 (2020).",
      )
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].caseName).toBe("United States v. Jones")
        expect(citations[0].plaintiff).toBe("United States")
      }
    })

    it("preserves long party names with connectors", () => {
      const citations = extractCitations(
        "People of the State of New York v. Jones, 500 F.2d 123 (2020).",
      )
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].caseName).toBe("People of the State of New York v. Jones")
        expect(citations[0].plaintiff).toBe("People of the State of New York")
      }
    })

    it("preserves corporate party names with abbreviations", () => {
      const citations = extractCitations(
        "Heart of Atlanta Motel, Inc. v. United States, 500 F.2d 123 (2020).",
      )
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].caseName).toBe(
          "Heart of Atlanta Motel, Inc. v. United States",
        )
      }
    })

    it("preserves signal words for downstream extraction", () => {
      const citations = extractCitations(
        "See also Smith v. Jones, 500 F.3d 100 (9th Cir. 2007).",
      )
      const cite = citations.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case") {
        expect(cite.caseName).toBe("Smith v. Jones")
        expect(cite.signal).toBe("see also")
      }
    })

    it("trims context but preserves signal when both present", () => {
      // "See" is a signal word — should be preserved for extractPartyNames.
      // When only a signal precedes the party name, extractPartyNames handles it.
      const citations = extractCitations(
        "See Smith v. Jones, 500 F.2d 123 (2020).",
      )
      const cite = citations.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case") {
        expect(cite.caseName).toBe("Smith v. Jones")
        expect(cite.signal).toBe("see")
      }
    })

    it("adjusts fullSpan.originalStart after trimming", () => {
      const text =
        "The court cited Smith v. Jones, 500 F.2d 123 (2020)."
      const citations = extractCitations(text)
      const cite = citations.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case" && cite.fullSpan) {
        // fullSpan should start at "Smith", not "The"
        const highlighted = text.slice(
          cite.fullSpan.originalStart,
          cite.fullSpan.originalEnd,
        )
        expect(highlighted).toMatch(/^Smith v\. Jones/)
        expect(highlighted).not.toMatch(/^The court/)
      }
    })
  })
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/extractCase.test.ts -t "sentence context trimming"`

Expected: The three "trims" tests and the fullSpan test fail. The "preserves" and "signal" tests should already pass.

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/extract/extractCase.test.ts
git commit -m "test: add failing tests for case name sentence context trimming (#168, #169)"
```

---

### Task 2: Implement isLikelyPartyName and Plaintiff Trimming

**Files:**
- Modify: `src/extract/extractCase.ts:259-325`

- [ ] **Step 1: Add the PARTY_NAME_CONNECTORS set and isLikelyPartyName function**

Add these ABOVE the `extractCaseName` function (around line 257, after the `PROCEDURAL_PREFIX_REGEX` constant at line 221):

```typescript
/**
 * Lowercase words that legitimately appear in legal party names.
 * Articles, prepositions, and legal connectors (e.g., "of", "the", "ex", "rel").
 * Used to distinguish real party names from sentence context captured by the regex.
 */
const PARTY_NAME_CONNECTORS = new Set([
  "of",
  "the",
  "and",
  "for",
  "in",
  "on",
  "by",
  "a",
  "an",
  "to",
  "at",
  "as",
  "de",
  "la",
  "el",
  "del",
  "von",
  "van",
  "ex",
  "rel",
  "et",
  "al",
  "d",
])

/**
 * Check whether a string looks like a legal party name vs. sentence context.
 *
 * Valid party names consist of capitalized words and legal connectors:
 *   "Smith" ✓, "United States" ✓, "People of the State of New York" ✓
 *
 * Sentence context contains lowercase non-connector words (verbs, nouns):
 *   "The court cited Smith" ✗ ("court", "cited" are not connectors)
 */
function isLikelyPartyName(name: string): boolean {
  const words = name.split(/\s+/)
  for (const word of words) {
    if (!word) continue
    // Strip trailing punctuation for comparison (handles "Inc.", "Corp.,")
    const clean = word.toLowerCase().replace(/[.,']+$/, "")
    if (PARTY_NAME_CONNECTORS.has(clean)) continue
    if (/^[A-Z]/.test(word)) continue
    // Lowercase non-connector word → not a party name
    return false
  }
  return true
}
```

- [ ] **Step 2: Update the V_CASE_NAME_REGEX match block to add validation and trimming**

In `extractCaseName`, replace the existing V_CASE_NAME_REGEX block (lines 301-311):

```typescript
  // Priority 1: Standard "v." or "vs." format with comma before citation
  // Match party names with letters, numbers (for "Doe No. 2"), periods, apostrophes, ampersands, hyphens, slashes
  const vMatch = V_CASE_NAME_REGEX.exec(precedingText)
  if (vMatch) {
    // Check for semicolon in matched text (multi-citation separator)
    if (!vMatch[0].includes(";")) {
      const caseName = `${vMatch[1].trim()} v. ${vMatch[2].trim()}`
      const nameStart = adjustedSearchStart + vMatch.index
      return { caseName, nameStart }
    }
  }
```

With:

```typescript
  // Priority 1: Standard "v." or "vs." format with comma before citation
  // Match party names with letters, numbers (for "Doe No. 2"), periods, apostrophes, ampersands, hyphens, slashes
  const vMatch = V_CASE_NAME_REGEX.exec(precedingText)
  if (vMatch) {
    // Check for semicolon in matched text (multi-citation separator)
    if (!vMatch[0].includes(";")) {
      let plaintiff = vMatch[1].trim()
      let trimOffset = 0

      // Validate plaintiff: real party names are capitalized words + legal connectors.
      // If the plaintiff contains lowercase non-connector words (e.g., "The court cited Smith"),
      // it captured sentence context. Trim from the left to the first valid party name start.
      if (!isLikelyPartyName(plaintiff)) {
        // Check if the prefix starts with a signal word (See, See also, But see, etc.).
        // If so, keep it — extractPartyNames handles signal stripping downstream.
        const signalMatch = SIGNAL_STRIP_REGEX.exec(plaintiff)
        if (!signalMatch) {
          const words = plaintiff.split(/\s+/)
          for (let i = 1; i < words.length; i++) {
            const candidate = words.slice(i).join(" ")
            if (/^[A-Z]/.test(candidate) && isLikelyPartyName(candidate)) {
              trimOffset = plaintiff.indexOf(candidate)
              plaintiff = candidate
              break
            }
          }
        }
      }

      const caseName = `${plaintiff} v. ${vMatch[2].trim()}`
      const nameStart = adjustedSearchStart + vMatch.index + trimOffset
      return { caseName, nameStart }
    }
  }
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`

Expected: PASS

- [ ] **Step 4: Run the new sentence context tests**

Run: `pnpm exec vitest run tests/extract/extractCase.test.ts -t "sentence context trimming"`

Expected: ALL pass

- [ ] **Step 5: Run all extractCase tests**

Run: `pnpm exec vitest run tests/extract/extractCase.test.ts`

Expected: ALL pass — no regressions in existing case name, party name, signal word, or fullSpan tests.

- [ ] **Step 6: Run full test suite**

Run: `pnpm exec vitest run`

Expected: ALL pass. No regressions.

- [ ] **Step 7: Commit**

```bash
git add src/extract/extractCase.ts
git commit -m "fix: trim sentence context from case name plaintiff (#168, #169)

Add isLikelyPartyName validation after V_CASE_NAME_REGEX matches.
Party names must consist of capitalized words and legal connectors
(of, the, and, etc.). When sentence context is detected, trim from
the left to the first valid party name start. Preserve signal word
prefixes for downstream handling by extractPartyNames.

Closes #168, closes #169."
```
