# Core Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three core extraction enhancements: reporter spacing normalization (#93), structured pincite parsing (#92), and structured court normalization (#91).

**Architecture:** Three independent changes: (1) a new cleaner function added to the default pipeline, (2) a new `parsePincite` function called during extraction to populate a `pinciteInfo` field, (3) a `normalizeCourt` function called during extraction to populate a `normalizedCourt` field. Each is additive — existing fields are unchanged.

**Tech Stack:** TypeScript 5.9+, Vitest 4

**Spec:** `docs/superpowers/specs/2026-04-02-post-extraction-utils-design.md` (Part 1)
**Issues:** #91, #92, #93

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/clean/cleaners.ts` | (modify) Add `normalizeReporterSpacing` function |
| `src/clean/cleanText.ts` | (modify) Add to default pipeline |
| `src/extract/pincite.ts` | (create) `parsePincite` function + `PinciteInfo` type |
| `src/extract/extractCase.ts` | (modify) Call `parsePincite`, call `normalizeCourt`, add fields to return |
| `src/types/citation.ts` | (modify) Add `pinciteInfo` and `normalizedCourt` fields to `FullCaseCitation` |
| `src/index.ts` | (modify) Export `parsePincite` and `PinciteInfo` |
| `tests/clean/cleaners.test.ts` | (modify or create) Tests for reporter spacing |
| `tests/extract/pincite.test.ts` | (create) Tests for pincite parsing |
| `tests/extract/courtNormalization.test.ts` | (create) Tests for court normalization |

---

### Task 1: Reporter spacing normalization (#93)

**Files:**
- Modify: `src/clean/cleaners.ts`
- Modify: `src/clean/cleanText.ts`
- Create or modify: `tests/clean/reporterSpacing.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/clean/reporterSpacing.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { normalizeReporterSpacing } from "../../src/clean/cleaners"

describe("normalizeReporterSpacing", () => {
  it("normalizes 'U. S.' to 'U.S.'", () => {
    expect(normalizeReporterSpacing("550 U. S. 544")).toBe("550 U.S. 544")
  })

  it("normalizes 'F. 2d' to 'F.2d'", () => {
    expect(normalizeReporterSpacing("500 F. 2d 123")).toBe("500 F.2d 123")
  })

  it("normalizes 'S. Ct.' to 'S.Ct.'", () => {
    expect(normalizeReporterSpacing("127 S. Ct. 1955")).toBe("127 S.Ct. 1955")
  })

  it("normalizes 'F. Supp. 2d' to 'F.Supp.2d'", () => {
    expect(normalizeReporterSpacing("300 F. Supp. 2d 100")).toBe("300 F.Supp.2d 100")
  })

  it("normalizes 'L. Ed. 2d' to 'L.Ed.2d'", () => {
    expect(normalizeReporterSpacing("35 L. Ed. 2d 147")).toBe("35 L.Ed.2d 147")
  })

  it("leaves already-normalized text unchanged", () => {
    expect(normalizeReporterSpacing("550 U.S. 544")).toBe("550 U.S. 544")
  })

  it("does not affect non-reporter text", () => {
    expect(normalizeReporterSpacing("Corp. v. Doe")).toBe("Corp. v. Doe")
  })

  it("handles multiple reporters in same text", () => {
    const input = "550 U. S. 544, 127 S. Ct. 1955"
    expect(normalizeReporterSpacing(input)).toBe("550 U.S. 544, 127 S.Ct. 1955")
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run tests/clean/reporterSpacing.test.ts`
Expected: FAIL — `normalizeReporterSpacing` is not exported

- [ ] **Step 3: Implement the cleaner**

Add to the bottom of `src/clean/cleaners.ts`:

```typescript
/**
 * Normalize spacing in reporter abbreviations.
 *
 * Collapses "letter. space" sequences common in legal reporter abbreviations
 * where the space is inconsistent (e.g., OCR or copy-paste artifacts).
 *
 * @example
 * normalizeReporterSpacing("550 U. S. 544")    // => "550 U.S. 544"
 * normalizeReporterSpacing("500 F. 2d 123")    // => "500 F.2d 123"
 * normalizeReporterSpacing("127 S. Ct. 1955")  // => "127 S.Ct. 1955"
 */
export function normalizeReporterSpacing(text: string): string {
  // Match sequences of "letter(s). space letter/digit" that look like reporter abbreviations
  // Pattern: single uppercase letter followed by ". " before another letter or digit
  // This handles: "U. S." → "U.S.", "F. 2d" → "F.2d", "S. Ct." → "S.Ct.", "L. Ed. 2d" → "L.Ed.2d"
  return text.replace(/\b([A-Z])\.\s(?=[A-Za-z0-9])/g, "$1.")
}
```

- [ ] **Step 4: Add to default cleaners pipeline**

In `src/clean/cleanText.ts`, add the import and add `normalizeReporterSpacing` to the default array. The import line becomes:

```typescript
import {
  decodeHtmlEntities,
  fixSmartQuotes,
  normalizeDashes,
  normalizeReporterSpacing,
  normalizeUnicode,
  normalizeWhitespace,
  stripHtmlTags,
} from "./cleaners"
```

And the default cleaners array becomes:

```typescript
  cleaners: Array<(text: string) => string> = [
    stripHtmlTags,
    decodeHtmlEntities,
    normalizeWhitespace,
    normalizeUnicode,
    normalizeDashes,
    fixSmartQuotes,
    normalizeReporterSpacing,
  ],
```

Also update the JSDoc `@param cleaners` line to include `normalizeReporterSpacing`.

- [ ] **Step 5: Run tests**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run tests/clean/reporterSpacing.test.ts`
Expected: All 8 tests pass

- [ ] **Step 6: Run full suite (some existing tests may need updating)**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run`

**IMPORTANT:** Adding a new cleaner to the default pipeline changes the cleaned text, which may cause existing extraction tests to fail if they rely on exact text matching. If tests fail:
- Check if the failure is because the cleaned text now has different spacing
- The failing tests should now produce BETTER extraction results (the whole point)
- Update test expectations to match the new (correct) cleaned text
- Do NOT remove the cleaner from the default pipeline

- [ ] **Step 7: Commit**

```bash
git add src/clean/cleaners.ts src/clean/cleanText.ts tests/clean/reporterSpacing.test.ts
# Also add any updated test files if expectations changed
git commit -m "feat: add normalizeReporterSpacing cleaner (#93)

Collapses inconsistent spaces in reporter abbreviations:
U. S. → U.S., F. 2d → F.2d, S. Ct. → S.Ct., L. Ed. 2d → L.Ed.2d
Added to default cleaner pipeline.

Closes #93"
```

---

### Task 2: Structured pincite parsing (#92)

**Files:**
- Create: `src/extract/pincite.ts`
- Modify: `src/types/citation.ts`
- Modify: `src/extract/extractCase.ts`
- Modify: `src/index.ts`
- Create: `tests/extract/pincite.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/extract/pincite.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { parsePincite } from "../../src/extract/pincite"

describe("parsePincite", () => {
  it("parses a simple page number", () => {
    expect(parsePincite("570")).toEqual({
      page: 570,
      isRange: false,
      raw: "570",
    })
  })

  it("strips 'at' prefix", () => {
    expect(parsePincite("at 570")).toEqual({
      page: 570,
      isRange: false,
      raw: "at 570",
    })
  })

  it("parses a page range with full end page", () => {
    expect(parsePincite("570-580")).toEqual({
      page: 570,
      endPage: 580,
      isRange: true,
      raw: "570-580",
    })
  })

  it("parses a page range with abbreviated end page", () => {
    expect(parsePincite("570-75")).toEqual({
      page: 570,
      endPage: 575,
      isRange: true,
      raw: "570-75",
    })
  })

  it("parses a footnote reference", () => {
    expect(parsePincite("570 n.3")).toEqual({
      page: 570,
      footnote: 3,
      isRange: false,
      raw: "570 n.3",
    })
  })

  it("parses a footnote with 'note' spelled out", () => {
    expect(parsePincite("570 note 3")).toEqual({
      page: 570,
      footnote: 3,
      isRange: false,
      raw: "570 note 3",
    })
  })

  it("parses a range with footnote", () => {
    expect(parsePincite("570-75 n.3")).toEqual({
      page: 570,
      endPage: 575,
      footnote: 3,
      isRange: true,
      raw: "570-75 n.3",
    })
  })

  it("returns null for unparseable input", () => {
    expect(parsePincite("")).toBeNull()
    expect(parsePincite("abc")).toBeNull()
  })

  it("handles 'at' with range", () => {
    expect(parsePincite("at 570-75")).toEqual({
      page: 570,
      endPage: 575,
      isRange: true,
      raw: "at 570-75",
    })
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run tests/extract/pincite.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/extract/pincite.ts`**

```typescript
/**
 * Structured pincite information parsed from citation text.
 */
export interface PinciteInfo {
  /** Primary page number */
  page: number
  /** End page for ranges: "570-75" → 575 */
  endPage?: number
  /** Footnote number: "570 n.3" → 3 */
  footnote?: number
  /** True if this is a page range */
  isRange: boolean
  /** Original text before parsing */
  raw: string
}

/** Matches: optional "at ", digits, optional "-digits", optional "n./note digits" */
const PINCITE_PARSE_REGEX =
  /^(?:at\s+)?(\d+)(?:-(\d+))?\s*(?:(?:n|note)\s*\.?\s*(\d+))?$/i

/**
 * Parse a pincite string into structured components.
 *
 * Handles simple pages, ranges (with abbreviated end pages),
 * footnote references, and "at" prefixes.
 *
 * @example
 * parsePincite("570")       // { page: 570, isRange: false, raw: "570" }
 * parsePincite("570-75")    // { page: 570, endPage: 575, isRange: true, raw: "570-75" }
 * parsePincite("570 n.3")   // { page: 570, footnote: 3, isRange: false, raw: "570 n.3" }
 *
 * @returns Parsed pincite info, or null if unparseable
 */
export function parsePincite(raw: string): PinciteInfo | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const match = PINCITE_PARSE_REGEX.exec(trimmed)
  if (!match) return null

  const page = Number.parseInt(match[1], 10)
  const endRaw = match[2]
  const footnoteRaw = match[3]

  let endPage: number | undefined
  let isRange = false

  if (endRaw) {
    isRange = true
    const endNum = Number.parseInt(endRaw, 10)
    // Handle abbreviated end pages: "570-75" means 575
    // If endRaw is shorter than the start page, it's abbreviated
    if (endRaw.length < match[1].length) {
      const prefix = match[1].slice(0, match[1].length - endRaw.length)
      endPage = Number.parseInt(prefix + endRaw, 10)
    } else {
      endPage = endNum
    }
  }

  const footnote = footnoteRaw ? Number.parseInt(footnoteRaw, 10) : undefined

  const result: PinciteInfo = { page, isRange, raw: trimmed }
  if (endPage !== undefined) result.endPage = endPage
  if (footnote !== undefined) result.footnote = footnote

  return result
}
```

- [ ] **Step 4: Run pincite tests**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run tests/extract/pincite.test.ts`
Expected: All 10 tests pass

- [ ] **Step 5: Add `pinciteInfo` field to `FullCaseCitation`**

In `src/types/citation.ts`, after the existing `pincite?: number` field (line 196), add:

```typescript
  /** Structured pincite information (page, range, footnote) */
  pinciteInfo?: import("../extract/pincite").PinciteInfo
```

**Note:** Using an import type here avoids circular dependencies. Alternatively, define PinciteInfo in types/citation.ts and import from there in pincite.ts. Choose whichever approach passes typecheck — if the inline import doesn't work, move the `PinciteInfo` interface to `src/types/citation.ts` and import from there in `src/extract/pincite.ts`.

- [ ] **Step 6: Wire up in extractCase.ts**

In `src/extract/extractCase.ts`:

Add import at the top:
```typescript
import { parsePincite } from "./pincite"
```

After line 707 (where `pincite` is assigned), add:
```typescript
  const pinciteRaw = pinciteMatch ? pinciteMatch[1] : undefined
  const pinciteInfo = pinciteRaw ? parsePincite(pinciteRaw) : undefined
```

After line 750 (look-ahead pincite), add:
```typescript
        // Also parse look-ahead pincite info if not already set
        if (!pinciteInfo) {
          const laRaw = laPinciteMatch[1]
          pinciteInfo = parsePincite(laRaw)
        }
```

(Change `const pinciteInfo` to `let pinciteInfo` to allow reassignment.)

In the return object (around line 939), add `pinciteInfo` after `pincite`:
```typescript
    pincite,
    pinciteInfo,
```

- [ ] **Step 7: Export from main entry point**

In `src/index.ts`, add:
```typescript
export { parsePincite } from "./extract/pincite"
export type { PinciteInfo } from "./extract/pincite"
```

- [ ] **Step 8: Run full test suite**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm typecheck && pnpm vitest run`
Expected: All pass

- [ ] **Step 9: Commit**

```bash
git add src/extract/pincite.ts src/types/citation.ts src/extract/extractCase.ts src/index.ts tests/extract/pincite.test.ts
git commit -m "feat: add structured pincite parsing (#92)

New parsePincite() function and PinciteInfo type. Handles simple pages,
ranges (with abbreviated end pages), footnote references, and 'at' prefix.
Populates pinciteInfo field on FullCaseCitation during extraction.

Closes #92"
```

---

### Task 3: Structured court normalization (#91)

**Files:**
- Create: `src/extract/courtNormalization.ts`
- Modify: `src/types/citation.ts`
- Modify: `src/extract/extractCase.ts`
- Create: `tests/extract/courtNormalization.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/extract/courtNormalization.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { normalizeCourt } from "../../src/extract/courtNormalization"

describe("normalizeCourt", () => {
  it("collapses spaces around periods: 'S.D. N.Y.' → 'S.D.N.Y.'", () => {
    expect(normalizeCourt("S.D. N.Y.")).toBe("S.D.N.Y.")
  })

  it("collapses spaces: 'E.D. Pa.' → 'E.D.Pa.'", () => {
    expect(normalizeCourt("E.D. Pa.")).toBe("E.D.Pa.")
  })

  it("adds trailing period: '2d Cir' → '2d Cir.'", () => {
    expect(normalizeCourt("2d Cir")).toBe("2d Cir.")
  })

  it("adds trailing period: '9th Cir' → '9th Cir.'", () => {
    expect(normalizeCourt("9th Cir")).toBe("9th Cir.")
  })

  it("leaves already-normalized values unchanged: 'U.S.'", () => {
    expect(normalizeCourt("U.S.")).toBe("U.S.")
  })

  it("leaves already-normalized values unchanged: '2d Cir.'", () => {
    expect(normalizeCourt("2d Cir.")).toBe("2d Cir.")
  })

  it("leaves 'scotus' unchanged", () => {
    expect(normalizeCourt("scotus")).toBe("scotus")
  })

  it("returns undefined for undefined input", () => {
    expect(normalizeCourt(undefined)).toBeUndefined()
  })

  it("returns undefined for empty string", () => {
    expect(normalizeCourt("")).toBeUndefined()
  })

  it("normalizes 'D. Mass.' → 'D.Mass.'", () => {
    expect(normalizeCourt("D. Mass.")).toBe("D.Mass.")
  })

  it("normalizes 'N.D. Ill.' → 'N.D.Ill.'", () => {
    expect(normalizeCourt("N.D. Ill.")).toBe("N.D.Ill.")
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run tests/extract/courtNormalization.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/extract/courtNormalization.ts`**

```typescript
/**
 * Normalize a court string extracted from a citation parenthetical.
 *
 * - Collapses spaces after periods: "S.D. N.Y." → "S.D.N.Y."
 * - Ensures trailing period on abbreviated forms: "2d Cir" → "2d Cir."
 * - Returns undefined for empty/undefined input
 *
 * @example
 * normalizeCourt("S.D. N.Y.")  // "S.D.N.Y."
 * normalizeCourt("2d Cir")     // "2d Cir."
 * normalizeCourt("U.S.")       // "U.S."
 */
export function normalizeCourt(court: string | undefined): string | undefined {
  if (!court || !court.trim()) return undefined

  let normalized = court.trim()

  // Collapse spaces after periods: "S.D. N.Y." → "S.D.N.Y."
  normalized = normalized.replace(/\.\s+(?=[A-Z])/g, ".")

  // Ensure trailing period on abbreviated forms that end with a letter
  // e.g., "2d Cir" → "2d Cir.", but don't add to "scotus" or forms that already end with "."
  if (/[A-Za-z]$/.test(normalized) && /[.]\s*[A-Za-z]+$|^\d+\w*\s+[A-Z]/.test(normalized)) {
    normalized += "."
  }

  return normalized
}
```

- [ ] **Step 4: Run court normalization tests**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run tests/extract/courtNormalization.test.ts`
Expected: All 11 tests pass

**NOTE:** The trailing-period regex is nuanced. If tests fail for specific patterns, adjust the regex. The key rule: add trailing period ONLY when the string looks like a court abbreviation (contains periods or starts with ordinal+word like "2d Cir"), NOT for bare words like "scotus".

- [ ] **Step 5: Add `normalizedCourt` field to `FullCaseCitation`**

In `src/types/citation.ts`, after the existing `court?: string` field, add:

```typescript
  /** Normalized court string: spaces collapsed, trailing period ensured */
  normalizedCourt?: string
```

- [ ] **Step 6: Wire up in extractCase.ts**

Add import at the top:
```typescript
import { normalizeCourt } from "./courtNormalization"
```

In the return object (around line 940), after `court,` add:
```typescript
    court,
    normalizedCourt: normalizeCourt(court),
```

- [ ] **Step 7: Run full suite**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm typecheck && pnpm vitest run`
Expected: All pass

- [ ] **Step 8: Commit**

```bash
git add src/extract/courtNormalization.ts src/types/citation.ts src/extract/extractCase.ts tests/extract/courtNormalization.test.ts
git commit -m "feat: add structured court normalization (#91)

New normalizeCourt() function populates normalizedCourt field on
FullCaseCitation. Collapses spaces around periods and ensures
trailing period on abbreviated court forms.

Closes #91"
```

---

### Task 4: Changesets and final verification

**Files:**
- Create: `.changeset/reporter-spacing-normalization.md`
- Create: `.changeset/structured-pincite-parsing.md`
- Create: `.changeset/court-normalization.md`

- [ ] **Step 1: Create changesets**

`.changeset/reporter-spacing-normalization.md`:
```markdown
---
"eyecite-ts": minor
---

Add `normalizeReporterSpacing` cleaner to default pipeline, collapsing inconsistent spaces in reporter abbreviations (U. S. → U.S., F. 2d → F.2d)
```

`.changeset/structured-pincite-parsing.md`:
```markdown
---
"eyecite-ts": minor
---

Add `parsePincite` function and `pinciteInfo` field on `FullCaseCitation` for structured pincite parsing (page ranges, footnotes, abbreviated end pages)
```

`.changeset/court-normalization.md`:
```markdown
---
"eyecite-ts": minor
---

Add `normalizedCourt` field on `FullCaseCitation` that normalizes court strings from parentheticals (space collapse, trailing period)
```

- [ ] **Step 2: Run final full verification**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm typecheck && pnpm vitest run && pnpm build && pnpm size`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add .changeset/reporter-spacing-normalization.md .changeset/structured-pincite-parsing.md .changeset/court-normalization.md
git commit -m "chore: add changesets for core enhancements (#91, #92, #93)"
```
