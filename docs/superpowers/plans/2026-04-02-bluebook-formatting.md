# Bluebook Formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `toBluebook` utility function that reconstructs canonical Bluebook-style citation strings from structured citation fields, covering all 11 citation types.

**Architecture:** A single pure function using a `switch` on the discriminated union's `type` field to dispatch to per-type formatting logic. Each case is a few lines of string concatenation using available fields. Best-effort — uses whatever fields are populated, gracefully omits missing optional fields.

**Tech Stack:** TypeScript 5.9+, Vitest 4

**Spec:** `docs/superpowers/specs/2026-04-02-post-extraction-utils-design.md` (Section 2d)
**Issue:** #98

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/utils/bluebook.ts` | `toBluebook` function with per-type formatting logic |
| `src/utils/index.ts` | (modify) Add `toBluebook` export |
| `tests/utils/bluebook.test.ts` | Tests for all 11 citation types + edge cases |

---

### Task 1: Write failing tests

**Files:**
- Create: `tests/utils/bluebook.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { describe, expect, it } from "vitest"
import { toBluebook } from "../../src/utils"
import type {
  ConstitutionalCitation,
  FederalRegisterCitation,
  FullCaseCitation,
  IdCitation,
  JournalCitation,
  NeutralCitation,
  PublicLawCitation,
  ShortFormCaseCitation,
  StatuteCitation,
  StatutesAtLargeCitation,
  SupraCitation,
} from "../../src/types/citation"

/** Minimal CitationBase fields for test fixtures */
const BASE = {
  text: "",
  matchedText: "",
  span: { cleanStart: 0, cleanEnd: 0, originalStart: 0, originalEnd: 0 },
  confidence: 1,
  processTimeMs: 0,
  patternsChecked: 0,
} as const

describe("toBluebook", () => {
  describe("FullCaseCitation", () => {
    it("formats with case name, reporter, and year", () => {
      const cite: FullCaseCitation = {
        ...BASE,
        type: "case",
        volume: 550,
        reporter: "U.S.",
        page: 544,
        year: 2007,
        caseName: "Bell Atl. Corp. v. Twombly",
      }
      expect(toBluebook(cite)).toBe(
        "Bell Atl. Corp. v. Twombly, 550 U.S. 544 (2007)",
      )
    })

    it("includes pincite when present", () => {
      const cite: FullCaseCitation = {
        ...BASE,
        type: "case",
        volume: 550,
        reporter: "U.S.",
        page: 544,
        pincite: 570,
        year: 2007,
        caseName: "Bell Atl. Corp. v. Twombly",
      }
      expect(toBluebook(cite)).toBe(
        "Bell Atl. Corp. v. Twombly, 550 U.S. 544, 570 (2007)",
      )
    })

    it("omits case name when absent", () => {
      const cite: FullCaseCitation = {
        ...BASE,
        type: "case",
        volume: 550,
        reporter: "U.S.",
        page: 544,
        year: 2007,
      }
      expect(toBluebook(cite)).toBe("550 U.S. 544 (2007)")
    })

    it("omits year when absent", () => {
      const cite: FullCaseCitation = {
        ...BASE,
        type: "case",
        volume: 500,
        reporter: "F.2d",
        page: 123,
      }
      expect(toBluebook(cite)).toBe("500 F.2d 123")
    })

    it("uses normalizedReporter when available", () => {
      const cite: FullCaseCitation = {
        ...BASE,
        type: "case",
        volume: 500,
        reporter: "F. 2d",
        normalizedReporter: "F.2d",
        page: 123,
      }
      expect(toBluebook(cite)).toBe("500 F.2d 123")
    })

    it("handles blank-page citation", () => {
      const cite: FullCaseCitation = {
        ...BASE,
        type: "case",
        volume: 500,
        reporter: "F.2d",
        hasBlankPage: true,
        year: 2020,
      }
      expect(toBluebook(cite)).toBe("500 F.2d ___ (2020)")
    })
  })

  describe("StatuteCitation", () => {
    it("formats federal statute with title and section", () => {
      const cite: StatuteCitation = {
        ...BASE,
        type: "statute",
        title: 42,
        code: "U.S.C.",
        section: "1983",
      }
      expect(toBluebook(cite)).toBe("42 U.S.C. \u00A7 1983")
    })

    it("includes subsection", () => {
      const cite: StatuteCitation = {
        ...BASE,
        type: "statute",
        title: 42,
        code: "U.S.C.",
        section: "1983",
        subsection: "(a)(1)",
      }
      expect(toBluebook(cite)).toBe("42 U.S.C. \u00A7 1983(a)(1)")
    })

    it("includes et seq.", () => {
      const cite: StatuteCitation = {
        ...BASE,
        type: "statute",
        title: 42,
        code: "U.S.C.",
        section: "1983",
        hasEtSeq: true,
      }
      expect(toBluebook(cite)).toBe("42 U.S.C. \u00A7 1983 et seq.")
    })

    it("formats statute without title (state code)", () => {
      const cite: StatuteCitation = {
        ...BASE,
        type: "statute",
        code: "Fla. Stat.",
        section: "768.81",
      }
      expect(toBluebook(cite)).toBe("Fla. Stat. \u00A7 768.81")
    })
  })

  describe("ConstitutionalCitation", () => {
    it("formats U.S. Constitution article", () => {
      const cite: ConstitutionalCitation = {
        ...BASE,
        type: "constitutional",
        jurisdiction: "US",
        article: 3,
        section: "2",
      }
      expect(toBluebook(cite)).toBe("U.S. Const. art. III, \u00A7 2")
    })

    it("formats U.S. Constitution amendment", () => {
      const cite: ConstitutionalCitation = {
        ...BASE,
        type: "constitutional",
        jurisdiction: "US",
        amendment: 14,
        section: "1",
      }
      expect(toBluebook(cite)).toBe("U.S. Const. amend. XIV, \u00A7 1")
    })

    it("formats amendment without section", () => {
      const cite: ConstitutionalCitation = {
        ...BASE,
        type: "constitutional",
        jurisdiction: "US",
        amendment: 5,
      }
      expect(toBluebook(cite)).toBe("U.S. Const. amend. V")
    })

    it("formats state constitution", () => {
      const cite: ConstitutionalCitation = {
        ...BASE,
        type: "constitutional",
        jurisdiction: "CA",
        article: 1,
        section: "7",
      }
      expect(toBluebook(cite)).toBe("CA Const. art. I, \u00A7 7")
    })

    it("includes clause", () => {
      const cite: ConstitutionalCitation = {
        ...BASE,
        type: "constitutional",
        jurisdiction: "US",
        article: 1,
        section: "8",
        clause: 3,
      }
      expect(toBluebook(cite)).toBe("U.S. Const. art. I, \u00A7 8, cl. 3")
    })
  })

  describe("JournalCitation", () => {
    it("formats journal with volume, abbreviation, page, and year", () => {
      const cite: JournalCitation = {
        ...BASE,
        type: "journal",
        volume: 100,
        journal: "Harvard Law Review",
        abbreviation: "Harv. L. Rev.",
        page: 1234,
        year: 1987,
      }
      expect(toBluebook(cite)).toBe("100 Harv. L. Rev. 1234 (1987)")
    })

    it("includes pincite", () => {
      const cite: JournalCitation = {
        ...BASE,
        type: "journal",
        volume: 75,
        journal: "Yale Law Journal",
        abbreviation: "Yale L.J.",
        page: 456,
        pincite: 460,
        year: 2020,
      }
      expect(toBluebook(cite)).toBe("75 Yale L.J. 456, 460 (2020)")
    })

    it("omits year when absent", () => {
      const cite: JournalCitation = {
        ...BASE,
        type: "journal",
        volume: 100,
        journal: "Harvard Law Review",
        abbreviation: "Harv. L. Rev.",
        page: 1234,
      }
      expect(toBluebook(cite)).toBe("100 Harv. L. Rev. 1234")
    })
  })

  describe("NeutralCitation", () => {
    it("formats Westlaw citation", () => {
      const cite: NeutralCitation = {
        ...BASE,
        type: "neutral",
        year: 2020,
        court: "WL",
        documentNumber: "123456",
      }
      expect(toBluebook(cite)).toBe("2020 WL 123456")
    })

    it("formats LEXIS citation", () => {
      const cite: NeutralCitation = {
        ...BASE,
        type: "neutral",
        year: 2020,
        court: "U.S. LEXIS",
        documentNumber: "456",
      }
      expect(toBluebook(cite)).toBe("2020 U.S. LEXIS 456")
    })
  })

  describe("PublicLawCitation", () => {
    it("formats public law", () => {
      const cite: PublicLawCitation = {
        ...BASE,
        type: "publicLaw",
        congress: 116,
        lawNumber: 283,
      }
      expect(toBluebook(cite)).toBe("Pub. L. No. 116-283")
    })
  })

  describe("FederalRegisterCitation", () => {
    it("formats federal register", () => {
      const cite: FederalRegisterCitation = {
        ...BASE,
        type: "federalRegister",
        volume: 85,
        page: 12345,
      }
      expect(toBluebook(cite)).toBe("85 Fed. Reg. 12345")
    })

    it("includes year when present", () => {
      const cite: FederalRegisterCitation = {
        ...BASE,
        type: "federalRegister",
        volume: 86,
        page: 56789,
        year: 2021,
      }
      expect(toBluebook(cite)).toBe("86 Fed. Reg. 56789 (2021)")
    })
  })

  describe("StatutesAtLargeCitation", () => {
    it("formats statutes at large", () => {
      const cite: StatutesAtLargeCitation = {
        ...BASE,
        type: "statutesAtLarge",
        volume: 120,
        page: 1234,
      }
      expect(toBluebook(cite)).toBe("120 Stat. 1234")
    })
  })

  describe("IdCitation", () => {
    it("formats bare Id.", () => {
      const cite: IdCitation = { ...BASE, type: "id" }
      expect(toBluebook(cite)).toBe("Id.")
    })

    it("formats Id. with pincite", () => {
      const cite: IdCitation = { ...BASE, type: "id", pincite: 570 }
      expect(toBluebook(cite)).toBe("Id. at 570")
    })
  })

  describe("SupraCitation", () => {
    it("formats supra without pincite", () => {
      const cite: SupraCitation = {
        ...BASE,
        type: "supra",
        partyName: "Smith",
      }
      expect(toBluebook(cite)).toBe("Smith, supra")
    })

    it("formats supra with pincite", () => {
      const cite: SupraCitation = {
        ...BASE,
        type: "supra",
        partyName: "Smith",
        pincite: 460,
      }
      expect(toBluebook(cite)).toBe("Smith, supra, at 460")
    })
  })

  describe("ShortFormCaseCitation", () => {
    it("formats short form with pincite", () => {
      const cite: ShortFormCaseCitation = {
        ...BASE,
        type: "shortFormCase",
        volume: 500,
        reporter: "F.2d",
        page: 123,
        pincite: 125,
      }
      expect(toBluebook(cite)).toBe("500 F.2d at 125")
    })

    it("formats short form without pincite", () => {
      const cite: ShortFormCaseCitation = {
        ...BASE,
        type: "shortFormCase",
        volume: 500,
        reporter: "F.2d",
        page: 123,
      }
      expect(toBluebook(cite)).toBe("500 F.2d 123")
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run tests/utils/bluebook.test.ts`
Expected: FAIL — `toBluebook` is not exported from `../../src/utils`

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/utils/bluebook.test.ts
git commit -m "test(utils): add failing tests for toBluebook

Covers all 11 citation types with edge cases for optional fields.

Refs #98"
```

---

### Task 2: Implement toBluebook

**Files:**
- Create: `src/utils/bluebook.ts`

- [ ] **Step 1: Create `src/utils/bluebook.ts`**

```typescript
import type { Citation } from "../types/citation"

/** Convert an integer to a Roman numeral (1-27 covers all amendments + articles). */
function toRoman(n: number): string {
  const numerals: Array<[number, string]> = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ]
  let result = ""
  let remaining = n
  for (const [value, numeral] of numerals) {
    while (remaining >= value) {
      result += numeral
      remaining -= value
    }
  }
  return result
}

/**
 * Reconstruct a canonical Bluebook-style citation string from structured fields.
 *
 * Works across all 11 citation types via the discriminated union.
 * Best-effort: uses whatever fields are available on the citation object.
 *
 * @example
 * ```typescript
 * toBluebook(caseCitation)   // "Bell Atl. Corp. v. Twombly, 550 U.S. 544 (2007)"
 * toBluebook(statuteCite)    // "42 U.S.C. § 1983"
 * toBluebook(idCite)         // "Id. at 570"
 * ```
 */
export function toBluebook(citation: Citation): string {
  switch (citation.type) {
    case "case": {
      const reporter = citation.normalizedReporter ?? citation.reporter
      let pageStr: string
      if (citation.hasBlankPage) {
        pageStr = " ___"
      } else if (citation.page !== undefined) {
        pageStr = ` ${citation.page}`
      } else {
        pageStr = ""
      }

      const core = `${citation.volume} ${reporter}${pageStr}`
      const pincite = citation.pincite !== undefined ? `, ${citation.pincite}` : ""
      const year = citation.year !== undefined ? ` (${citation.year})` : ""
      const caseName = citation.caseName ? `${citation.caseName}, ` : ""

      return `${caseName}${core}${pincite}${year}`
    }

    case "statute": {
      const title = citation.title !== undefined ? `${citation.title} ` : ""
      const section = `\u00A7 ${citation.section}`
      const subsection = citation.subsection ?? ""
      const etSeq = citation.hasEtSeq ? " et seq." : ""
      return `${title}${citation.code} ${section}${subsection}${etSeq}`
    }

    case "constitutional": {
      const jurisdiction =
        citation.jurisdiction === "US" ? "U.S." : (citation.jurisdiction ?? "")
      const prefix = `${jurisdiction} Const.`

      let body = ""
      if (citation.article !== undefined) {
        body += ` art. ${toRoman(citation.article)}`
      }
      if (citation.amendment !== undefined) {
        body += ` amend. ${toRoman(citation.amendment)}`
      }
      if (citation.section !== undefined) {
        body += `, \u00A7 ${citation.section}`
      }
      if (citation.clause !== undefined) {
        body += `, cl. ${citation.clause}`
      }
      return `${prefix}${body}`
    }

    case "journal": {
      const vol = citation.volume !== undefined ? `${citation.volume} ` : ""
      const page = citation.page !== undefined ? ` ${citation.page}` : ""
      const pincite =
        citation.pincite !== undefined ? `, ${citation.pincite}` : ""
      const year = citation.year !== undefined ? ` (${citation.year})` : ""
      return `${vol}${citation.abbreviation}${page}${pincite}${year}`
    }

    case "neutral":
      return `${citation.year} ${citation.court} ${citation.documentNumber}`

    case "publicLaw":
      return `Pub. L. No. ${citation.congress}-${citation.lawNumber}`

    case "federalRegister": {
      const year = citation.year !== undefined ? ` (${citation.year})` : ""
      return `${citation.volume} Fed. Reg. ${citation.page}${year}`
    }

    case "statutesAtLarge":
      return `${citation.volume} Stat. ${citation.page}`

    case "id":
      return citation.pincite !== undefined ? `Id. at ${citation.pincite}` : "Id."

    case "supra":
      return citation.pincite !== undefined
        ? `${citation.partyName}, supra, at ${citation.pincite}`
        : `${citation.partyName}, supra`

    case "shortFormCase": {
      const reporter = citation.reporter
      if (citation.pincite !== undefined) {
        return `${citation.volume} ${reporter} at ${citation.pincite}`
      }
      const page = citation.page !== undefined ? ` ${citation.page}` : ""
      return `${citation.volume} ${reporter}${page}`
    }
  }
}
```

- [ ] **Step 2: Update barrel export in `src/utils/index.ts`**

Add the export. The full file should be:

```typescript
/**
 * Post-extraction utilities for working with citation results.
 *
 * This module provides composable utility functions for downstream
 * consumption of extraction output: sentence context detection,
 * case grouping, reporter key formatting, and Bluebook formatting.
 *
 * Imported via: `import { ... } from 'eyecite-ts/utils'`
 *
 * @module utils
 */

export type { CaseGroup, ContextOptions, SurroundingContext } from "./types"
export { toReporterKey, toReporterKeys } from "./reporterKey"
export { toBluebook } from "./bluebook"
```

- [ ] **Step 3: Run tests**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm vitest run tests/utils/bluebook.test.ts`
Expected: All tests pass (25+ tests)

- [ ] **Step 4: Run typecheck + full suite + build**

Run: `cd /Users/medelman/Projects/OSS/eyecite-ts && pnpm typecheck && pnpm vitest run && pnpm build && pnpm size`
Expected: All pass. Utils bundle still under 3 KB.

- [ ] **Step 5: Commit**

```bash
git add src/utils/bluebook.ts src/utils/index.ts
git commit -m "feat(utils): add toBluebook canonical citation formatter

Formats all 11 citation types into canonical Bluebook-style strings.
Best-effort: uses available fields, gracefully omits missing ones.
Includes Roman numeral conversion for constitutional citations.

Closes #98"
```

---

### Task 3: Add changeset

**Files:**
- Create: `.changeset/bluebook-formatting.md`

- [ ] **Step 1: Create changeset**

```markdown
---
"eyecite-ts": minor
---

Add `toBluebook` utility function to `eyecite-ts/utils` for canonical Bluebook-style citation formatting across all 11 citation types
```

- [ ] **Step 2: Commit**

```bash
git add .changeset/bluebook-formatting.md
git commit -m "chore: add changeset for Bluebook formatting"
```
