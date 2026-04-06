# State Statute Coverage Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ~30 missing US state jurisdictions to the abbreviated-code statute pattern, using a data-driven regex generation approach.

**Architecture:** New `src/data/stateStatutes.ts` file holds a state abbreviation table. The `abbreviated-code` regex in `statutePatterns.ts` is generated from this table at import time. `knownCodes.ts` derives its `abbreviatedCodes[]` from the same table. Single source of truth — no manual sync.

**Tech Stack:** TypeScript, Vitest, Biome

**Spec:** `docs/superpowers/specs/2026-04-06-state-statute-coverage-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/data/stateStatutes.ts` | Create | State abbreviation table, `escapeForRegex`, `buildAbbreviatedCodeRegex` |
| `src/data/knownCodes.ts` | Modify | Derive `abbreviatedCodes[]` from `stateStatuteEntries` |
| `src/patterns/statutePatterns.ts` | Modify | Replace hardcoded regex with `buildAbbreviatedCodeRegex()` |
| `src/data/index.ts` | Modify | Export `stateStatutes` |
| `tests/data/stateStatutes.test.ts` | Create | Unit tests for escapeForRegex and regex builder |
| `tests/extract/extractStatute.test.ts` | Modify | Add per-state smoke tests |
| `tests/fixtures/statute-corpus.json` | Modify | Add corpus entries for new states |

---

### Task 1: Create stateStatutes.ts with types and escapeForRegex

**Files:**
- Create: `src/data/stateStatutes.ts`
- Create: `tests/data/stateStatutes.test.ts`

- [ ] **Step 1: Write failing tests for escapeForRegex**

```ts
// tests/data/stateStatutes.test.ts
import { describe, expect, it } from "vitest"
import { escapeForRegex } from "@/data/stateStatutes"

describe("escapeForRegex", () => {
  it("should handle dotted abbreviations like T.C.A.", () => {
    const result = escapeForRegex("T.C.A.")
    expect("T.C.A.").toMatch(new RegExp(result))
    expect("TCA").toMatch(new RegExp(result))
    expect("T C A").toMatch(new RegExp(result))
  })

  it("should handle word.space patterns like Conn. Gen. Stat.", () => {
    const result = escapeForRegex("Conn. Gen. Stat.")
    expect("Conn. Gen. Stat.").toMatch(new RegExp(result))
    expect("Conn Gen Stat").toMatch(new RegExp(result))
    expect("Conn.  Gen.  Stat.").toMatch(new RegExp(result))
  })

  it("should handle plain words like Alaska Stat.", () => {
    const result = escapeForRegex("Alaska Stat.")
    expect("Alaska Stat.").toMatch(new RegExp(result))
    expect("Alaska Stat").toMatch(new RegExp(result))
    expect("Alaska  Stat.").toMatch(new RegExp(result))
  })

  it("should handle abbreviations without periods like MCL", () => {
    const result = escapeForRegex("MCL")
    expect("MCL").toMatch(new RegExp(result))
  })

  it("should handle mixed patterns like N.H. Rev. Stat. Ann.", () => {
    const result = escapeForRegex("N.H. Rev. Stat. Ann.")
    expect("N.H. Rev. Stat. Ann.").toMatch(new RegExp(result))
    expect("NH Rev Stat Ann").toMatch(new RegExp(result))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/data/stateStatutes.test.ts -v`
Expected: FAIL — module `@/data/stateStatutes` not found

- [ ] **Step 3: Implement the types and escapeForRegex**

```ts
// src/data/stateStatutes.ts

/**
 * State statute abbreviation table — single source of truth for the
 * abbreviated-code tokenizer pattern and the knownCodes lookup registry.
 */

export interface StateStatuteEntry {
  /** Two-letter jurisdiction code (e.g., "AK", "AZ") */
  jurisdiction: string
  /** All recognized abbreviation forms — used for lookup by findAbbreviatedCode */
  abbreviations: string[]
  /**
   * Regex fragment for tokenizer alternation. If omitted, auto-generated
   * from abbreviations via escapeForRegex. Provide explicitly when the
   * pattern needs optional components (e.g., "Stat(?:utes)?").
   */
  regexFragment?: string
}

/**
 * Convert a plain abbreviation string into a regex fragment.
 *
 * Rules:
 * - Periods followed by a letter (e.g., "T.C.") → optional period + optional space
 * - Periods followed by a space (e.g., "Stat. Ann.") → optional period + flexible space
 * - Trailing periods → optional period
 * - Spaces → flexible whitespace (\s+)
 * - Regex-special characters are escaped
 */
export function escapeForRegex(abbreviation: string): string {
  return (
    abbreviation
      // Escape regex-special chars (except period and space, handled below)
      .replace(/[\\^$*+?{}[\]|()]/g, "\\$&")
      // Period followed by letter: "T.C" → "T\.?\s*C"
      .replace(/\.(?=[A-Za-z])/g, "\\.?\\s*")
      // Period followed by space: "Stat. Ann" → "Stat\.?\s+Ann"
      .replace(/\.\s+/g, "\\.?\\s+")
      // Trailing period: "Ann." → "Ann\.?"
      .replace(/\.$/g, "\\.?")
      // Remaining spaces → flexible whitespace
      .replace(/ +/g, "\\s+")
  )
}

/** Placeholder — entries added in Tasks 2-7 */
export const stateStatuteEntries: StateStatuteEntry[] = []
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/data/stateStatutes.test.ts -v`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/stateStatutes.ts tests/data/stateStatutes.test.ts
git commit -m "feat(data): add stateStatutes types and escapeForRegex helper"
```

---

### Task 2: Add buildAbbreviatedCodeRegex

**Files:**
- Modify: `src/data/stateStatutes.ts`
- Modify: `tests/data/stateStatutes.test.ts`

- [ ] **Step 1: Write failing test for regex builder**

Add to `tests/data/stateStatutes.test.ts`:

```ts
import { escapeForRegex, buildAbbreviatedCodeRegex, stateStatuteEntries } from "@/data/stateStatutes"
import type { StateStatuteEntry } from "@/data/stateStatutes"

describe("buildAbbreviatedCodeRegex", () => {
  it("should build regex that matches abbreviations from entries", () => {
    // Temporarily push a test entry
    const original = [...stateStatuteEntries]
    stateStatuteEntries.length = 0
    stateStatuteEntries.push({
      jurisdiction: "XX",
      abbreviations: ["X.X. Code", "XX Code"],
    })

    const regex = buildAbbreviatedCodeRegex()
    const text = "X.X. Code § 123"
    const match = regex.exec(text)
    expect(match).not.toBeNull()
    expect(match![2]).toContain("X.X. Code")
    expect(match![3]).toBe("123")

    // Restore
    stateStatuteEntries.length = 0
    stateStatuteEntries.push(...original)
  })

  it("should capture optional leading title number", () => {
    stateStatuteEntries.length = 0
    stateStatuteEntries.push({
      jurisdiction: "XX",
      abbreviations: ["XX Code"],
    })

    const regex = buildAbbreviatedCodeRegex()
    const text = "42 XX Code § 5524"
    const match = regex.exec(text)
    expect(match).not.toBeNull()
    expect(match![1]).toBe("42")
    expect(match![3]).toBe("5524")

    stateStatuteEntries.length = 0
  })

  it("should use regexFragment when provided", () => {
    stateStatuteEntries.length = 0
    stateStatuteEntries.push({
      jurisdiction: "XX",
      abbreviations: ["X. Stat."],
      regexFragment: "X\\.?\\s*Stat(?:utes)?\\.?(?:\\s+Ann\\.?)?",
    })

    const regex = buildAbbreviatedCodeRegex()
    expect("X. Statutes Ann. § 99".match(regex)).not.toBeNull()
    expect("X Stat § 99".match(regex)).not.toBeNull()

    stateStatuteEntries.length = 0
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/data/stateStatutes.test.ts -v`
Expected: FAIL — `buildAbbreviatedCodeRegex` not exported

- [ ] **Step 3: Implement buildAbbreviatedCodeRegex**

Add to `src/data/stateStatutes.ts`:

```ts
/**
 * Build the abbreviated-code tokenizer regex from stateStatuteEntries.
 *
 * Produces the same capture group structure as the original hardcoded regex:
 *   (1) optional leading title number
 *   (2) abbreviation text
 *   (3) section + subsections + et seq.
 *
 * Fragments are sorted longest-first for PEG-style ordered choice —
 * "Alaska Stat. Ann." matches before "AS" can grab a false positive.
 */
export function buildAbbreviatedCodeRegex(): RegExp {
  const allFragments: string[] = []

  for (const entry of stateStatuteEntries) {
    if (entry.regexFragment) {
      allFragments.push(entry.regexFragment)
    } else {
      for (const abbrev of entry.abbreviations) {
        allFragments.push(escapeForRegex(abbrev))
      }
    }
  }

  // Sort longest-first so more specific patterns match before shorter ones
  allFragments.sort((a, b) => b.length - a.length)

  const alternation = allFragments.join("|")

  return new RegExp(
    `\\b(?:(\\d+)\\s+)?(${alternation})\\s*§?\\s*(\\d+[A-Za-z0-9.:/-]*(?:\\([^)]*\\))*(?:\\s*et\\s+seq\\.?)?)`,
    "g",
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/data/stateStatutes.test.ts -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/stateStatutes.ts tests/data/stateStatutes.test.ts
git commit -m "feat(data): add buildAbbreviatedCodeRegex function"
```

---

### Task 3: Migrate existing 12 states into stateStatuteEntries

**Files:**
- Modify: `src/data/stateStatutes.ts`
- Modify: `tests/data/stateStatutes.test.ts`

- [ ] **Step 1: Write regression test**

Add to `tests/data/stateStatutes.test.ts`:

```ts
describe("stateStatuteEntries — existing 12 states", () => {
  // These are the exact strings the current hardcoded regex matches.
  // The generated regex must match all of them.
  const existingCitations = [
    { text: "Fla. Stat. § 768.81", jurisdiction: "FL" },
    { text: "F.S. 768.81", jurisdiction: "FL" },
    { text: "R.C. 2305.01", jurisdiction: "OH" },
    { text: "Ohio Rev. Code § 2305.01", jurisdiction: "OH" },
    { text: "MCL 750.81", jurisdiction: "MI" },
    { text: "M.C.L. § 750.81", jurisdiction: "MI" },
    { text: "Utah Code § 76-5-302", jurisdiction: "UT" },
    { text: "U.C.A. § 63G-2-103", jurisdiction: "UT" },
    { text: "C.R.S. § 13-1-101", jurisdiction: "CO" },
    { text: "Colo. Rev. Stat. § 6-1-1301", jurisdiction: "CO" },
    { text: "RCW 26.09.191", jurisdiction: "WA" },
    { text: "Wash. Rev. Code § 26.09.191", jurisdiction: "WA" },
    { text: "G.S. 20-138.1", jurisdiction: "NC" },
    { text: "N.C. Gen. Stat. § 15A-302", jurisdiction: "NC" },
    { text: "O.C.G.A. § 16-5-1", jurisdiction: "GA" },
    { text: "Ga. Code Ann. § 16-5-1", jurisdiction: "GA" },
    { text: "42 Pa.C.S. § 5524", jurisdiction: "PA" },
    { text: "43 P.S. § 951", jurisdiction: "PA" },
    { text: "Ind. Code § 35-42-1-1", jurisdiction: "IN" },
    { text: "IC 35-42-1-1", jurisdiction: "IN" },
    { text: "N.J.S.A. 2A:10-1", jurisdiction: "NJ" },
    { text: "8 Del. C. § 141", jurisdiction: "DE" },
    { text: "Del. Code Ann. § 141", jurisdiction: "DE" },
  ]

  const regex = buildAbbreviatedCodeRegex()

  for (const { text } of existingCitations) {
    it(`should match: "${text}"`, () => {
      regex.lastIndex = 0
      expect(text.match(regex)).not.toBeNull()
    })
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/data/stateStatutes.test.ts -t "existing 12" -v`
Expected: FAIL — `stateStatuteEntries` is empty, regex matches nothing

- [ ] **Step 3: Populate the 12 existing states**

Replace the empty `stateStatuteEntries` array in `src/data/stateStatutes.ts` with:

```ts
export const stateStatuteEntries: StateStatuteEntry[] = [
  // ── Florida ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "FL",
    abbreviations: ["Fla. Stat. Ann.", "Fla. Stat.", "Fla Stat", "F.S.", "FS"],
    regexFragment:
      "Fla\\.?\\s*Stat(?:utes)?\\.?(?:\\s*Ann\\.?)?|F\\.?S\\.?",
  },
  // ── Ohio ───────────────────────────────────────────────────────────────────
  {
    jurisdiction: "OH",
    abbreviations: ["Ohio Rev. Code Ann.", "Ohio Rev. Code", "O.R.C.", "ORC", "R.C.", "RC"],
    regexFragment:
      "Ohio\\s+Rev\\.?\\s+Code(?:\\s+Ann\\.?)?|O\\.?R\\.?C\\.?|R\\.?C\\.?",
  },
  // ── Michigan ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "MI",
    abbreviations: [
      "Mich. Comp. Laws Ann.",
      "Mich. Comp. Laws Serv.",
      "Mich. Comp. Laws",
      "M.C.L.",
      "MCLA",
      "MCLS",
      "MCL",
    ],
    regexFragment:
      "Mich\\.?\\s+Comp\\.?\\s+Laws(?:\\s+(?:Ann|Serv)\\.?)?|M\\.?C\\.?L\\.?|MCL[AS]?",
  },
  // ── Utah ───────────────────────────────────────────────────────────────────
  {
    jurisdiction: "UT",
    abbreviations: ["Utah Code Ann.", "Utah Code", "U.C.A.", "UCA"],
    regexFragment: "Utah\\s+Code(?:\\s+Ann\\.?)?|U\\.?C\\.?A\\.?",
  },
  // ── Colorado ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "CO",
    abbreviations: ["Colo. Rev. Stat. Ann.", "Colo. Rev. Stat.", "C.R.S.", "CRS"],
    regexFragment:
      "Colo\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|C\\.?R\\.?S\\.?",
  },
  // ── Washington ─────────────────────────────────────────────────────────────
  {
    jurisdiction: "WA",
    abbreviations: ["Wash. Rev. Code Ann.", "Wash. Rev. Code", "RCW"],
    regexFragment: "Wash\\.?\\s+Rev\\.?\\s+Code(?:\\s+Ann\\.?)?|RCW",
  },
  // ── North Carolina ─────────────────────────────────────────────────────────
  {
    jurisdiction: "NC",
    abbreviations: ["N.C. Gen. Stat. Ann.", "N.C. Gen. Stat.", "N.C.G.S.", "NCGS", "G.S.", "GS"],
    regexFragment:
      "N\\.?C\\.?\\s*Gen\\.?\\s*Stat\\.?(?:\\s+Ann\\.?)?|N\\.?C\\.?G\\.?S\\.?|G\\.?S\\.?",
  },
  // ── Georgia ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "GA",
    abbreviations: ["Ga. Code Ann.", "Ga. Code", "O.C.G.A.", "OCGA"],
    regexFragment: "Ga\\.?\\s+Code(?:\\s+Ann\\.?)?|O\\.?C\\.?G\\.?A\\.?",
  },
  // ── Pennsylvania (consolidated) ────────────────────────────────────────────
  {
    jurisdiction: "PA",
    abbreviations: ["Pa. Cons. Stat.", "Pa.C.S.A.", "Pa.C.S.", "Pa. C.S.A.", "Pa. C.S."],
    regexFragment: "Pa\\.?\\s*C\\.?S\\.?A?\\.?|Pa\\.?\\s+Cons\\.?\\s+Stat\\.?",
  },
  // ── Pennsylvania (unconsolidated) ──────────────────────────────────────────
  {
    jurisdiction: "PA",
    abbreviations: ["P.S.", "PS"],
    regexFragment: "P\\.?S\\.?",
  },
  // ── Indiana ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "IN",
    abbreviations: [
      "Burns Ind. Code Ann.",
      "Burns Ind. Code",
      "Indiana Code Ann.",
      "Indiana Code",
      "Ind. Code Ann.",
      "Ind. Code",
      "I.C.",
      "IC",
    ],
    regexFragment:
      "Burns\\s+Ind\\.?\\s+Code(?:\\s+Ann\\.?)?|Ind(?:iana)?\\.?\\s+Code(?:\\s+Ann\\.?)?|I\\.?C\\.?",
  },
  // ── New Jersey ─────────────────────────────────────────────────────────────
  {
    jurisdiction: "NJ",
    abbreviations: ["N.J.S.A.", "NJSA", "N.J.S.", "NJS"],
    regexFragment: "N\\.?J\\.?\\s*S(?:tat)?\\.?\\s*A?\\.?",
  },
  // ── Delaware ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "DE",
    abbreviations: ["Del. Code Ann.", "Del. Code", "Del. C.", "Del C"],
    regexFragment: "Del\\.?\\s*(?:Code(?:\\s+Ann\\.?)?|C\\.?)",
  },
]
```

- [ ] **Step 4: Run regression test to verify existing citations still match**

Run: `pnpm exec vitest run tests/data/stateStatutes.test.ts -t "existing 12" -v`
Expected: All 23 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/stateStatutes.ts tests/data/stateStatutes.test.ts
git commit -m "feat(data): populate stateStatuteEntries with existing 12 states"
```

---

### Task 4: Wire up statutePatterns.ts and knownCodes.ts

**Files:**
- Modify: `src/patterns/statutePatterns.ts`
- Modify: `src/data/knownCodes.ts`

- [ ] **Step 1: Run full test suite to establish baseline**

Run: `pnpm exec vitest run -v 2>&1 | tail -5`
Expected: All tests PASS (note the count for comparison)

- [ ] **Step 2: Replace hardcoded regex in statutePatterns.ts**

In `src/patterns/statutePatterns.ts`, replace the `abbreviated-code` entry:

Replace this:
```ts
  {
    id: "abbreviated-code",
    // Alternation order: longer/more-specific patterns first within each state to avoid partial matches.
    // The \b anchor prevents cross-boundary matches (e.g., "N.C.G.S." won't match "G.S." at position 4).
    regex:
      /\b(?:(\d+)\s+)?(Fla\.?\s*Stat(?:utes)?\.?(?:\s*Ann\.?)?|F\.?S\.?|R\.?C\.?|O\.?R\.?C\.?|Ohio\s+Rev\.?\s+Code(?:\s+Ann\.?)?|MCL[AS]?|M\.?C\.?L\.?|Mich\.?\s+Comp\.?\s+Laws(?:\s+(?:Ann|Serv)\.?)?|Utah\s+Code(?:\s+Ann\.?)?|U\.?C\.?A\.?|C\.?R\.?S\.?|Colo\.?\s+Rev\.?\s+Stat\.?(?:\s+Ann\.?)?|RCW|Wash\.?\s+Rev\.?\s+Code(?:\s+Ann\.?)?|G\.?S\.?|N\.?C\.?\s*Gen\.?\s*Stat\.?(?:\s+Ann\.?)?|N\.?C\.?G\.?S\.?|O\.?C\.?G\.?A\.?|Ga\.?\s+Code(?:\s+Ann\.?)?|Pa\.?\s*C\.?S\.?A?\.?|Pa\.?\s+Cons\.?\s+Stat\.?|P\.?S\.?|Ind(?:iana)?\.?\s+Code(?:\s+Ann\.?)?|Burns\s+Ind\.?\s+Code(?:\s+Ann\.?)?|I\.?C\.?|N\.?J\.?\s*S(?:tat)?\.?\s*A?\.?|Del\.?\s*(?:Code(?:\s+Ann\.?)?|C\.?))\s*§?\s*(\d+[A-Za-z0-9.:/-]*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
    description:
      "Abbreviated state code citations for 12 jurisdictions (FL, OH, MI, UT, CO, WA, NC, GA, PA, IN, NJ, DE)",
    type: "statute",
  },
```

With:
```ts
  {
    id: "abbreviated-code",
    regex: buildAbbreviatedCodeRegex(),
    description: "Abbreviated state code citations for all US jurisdictions",
    type: "statute",
  },
```

Add the import at the top:
```ts
import { buildAbbreviatedCodeRegex } from "@/data/stateStatutes"
```

- [ ] **Step 3: Update knownCodes.ts to derive abbreviatedCodes**

In `src/data/knownCodes.ts`, replace the hardcoded `abbreviatedCodes` array with a derivation from `stateStatuteEntries`.

Replace this (the entire `export const abbreviatedCodes: CodeEntry[] = [...]` block, lines 37–133):
```ts
export const abbreviatedCodes: CodeEntry[] = [
  { jurisdiction: "FL", abbreviation: "STAT", family: "abbreviated", patterns: [...] },
  // ... all 13 entries through DE
]
```

With:
```ts
import { stateStatuteEntries } from "./stateStatutes"

/**
 * Registry of state statutory codes that use abbreviated citation forms.
 * Derived from stateStatuteEntries — the single source of truth.
 */
export const abbreviatedCodes: CodeEntry[] = stateStatuteEntries.map((entry) => ({
  jurisdiction: entry.jurisdiction,
  abbreviation: entry.abbreviations[entry.abbreviations.length - 1],
  family: "abbreviated" as const,
  patterns: entry.abbreviations,
}))
```

- [ ] **Step 4: Run full test suite to verify no regression**

Run: `pnpm exec vitest run -v 2>&1 | tail -5`
Expected: Same test count, all PASS

- [ ] **Step 5: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/patterns/statutePatterns.ts src/data/knownCodes.ts
git commit -m "refactor: generate abbreviated-code regex from stateStatuteEntries"
```

---

### Task 5: Add new states batch 1 — AK, AZ, AR, CT, DC, HI, IA, ID

**Files:**
- Modify: `src/data/stateStatutes.ts`
- Modify: `tests/extract/extractStatute.test.ts`

- [ ] **Step 1: Write failing smoke tests**

Add to `tests/extract/extractStatute.test.ts`, inside a new describe block:

```ts
import { extractCitations } from "@/index"

describe("new state jurisdictions — batch 1", () => {
  const cases = [
    { text: "Alaska Stat. § 11.41.100", jurisdiction: "AK", section: "11.41.100" },
    { text: "AS 11.41.100", jurisdiction: "AK", section: "11.41.100" },
    { text: "Ariz. Rev. Stat. § 13-1105", jurisdiction: "AZ", section: "13-1105" },
    { text: "A.R.S. § 13-1105", jurisdiction: "AZ", section: "13-1105" },
    { text: "Ark. Code Ann. § 5-10-101", jurisdiction: "AR", section: "5-10-101" },
    { text: "A.C.A. § 5-10-101", jurisdiction: "AR", section: "5-10-101" },
    { text: "Conn. Gen. Stat. § 52-555", jurisdiction: "CT", section: "52-555" },
    { text: "C.G.S. § 14-227a", jurisdiction: "CT", section: "14-227a" },
    { text: "D.C. Code § 22-3211", jurisdiction: "DC", section: "22-3211" },
    { text: "Haw. Rev. Stat. § 707-711", jurisdiction: "HI", section: "707-711" },
    { text: "HRS § 707-711", jurisdiction: "HI", section: "707-711" },
    { text: "Iowa Code § 714.1", jurisdiction: "IA", section: "714.1" },
    { text: "Idaho Code § 18-4001", jurisdiction: "ID", section: "18-4001" },
  ]

  for (const { text, jurisdiction, section } of cases) {
    it(`should extract "${text}"`, () => {
      const citations = extractCitations(text)
      const statutes = citations.filter((c) => c.type === "statute")
      expect(statutes).toHaveLength(1)
      expect(statutes[0].jurisdiction).toBe(jurisdiction)
      expect(statutes[0].section).toBe(section)
    })
  }
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/extractStatute.test.ts -t "batch 1" -v`
Expected: All 13 tests FAIL — new abbreviations not in the regex

- [ ] **Step 3: Add 8 state entries to stateStatuteEntries**

Append to the `stateStatuteEntries` array in `src/data/stateStatutes.ts`:

```ts
  // ── Alaska ─────────────────────────────────────────────────────────────────
  {
    jurisdiction: "AK",
    abbreviations: ["Alaska Stat. Ann.", "Alaska Stat.", "AS"],
    regexFragment: "Alaska\\s+Stat\\.?(?:\\s+Ann\\.?)?|A\\.?S\\.?",
  },
  // ── Arizona ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "AZ",
    abbreviations: ["Ariz. Rev. Stat. Ann.", "Ariz. Rev. Stat.", "A.R.S."],
    regexFragment: "Ariz\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|A\\.?R\\.?S\\.?",
  },
  // ── Arkansas ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "AR",
    abbreviations: ["Ark. Code Ann.", "Arkansas Code", "A.C.A."],
    regexFragment: "Ark(?:ansas)?\\.?\\s+Code(?:\\s+Ann\\.?)?|A\\.?C\\.?A\\.?",
  },
  // ── Connecticut ────────────────────────────────────────────────────────────
  {
    jurisdiction: "CT",
    abbreviations: ["Conn. Gen. Stat. Ann.", "Conn. Gen. Stat.", "C.G.S."],
    regexFragment: "Conn\\.?\\s+Gen\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|C\\.?G\\.?S\\.?",
  },
  // ── District of Columbia ───────────────────────────────────────────────────
  {
    jurisdiction: "DC",
    abbreviations: ["D.C. Official Code", "D.C. Code Ann.", "D.C. Code"],
    regexFragment: "D\\.?C\\.?\\s+(?:Official\\s+)?Code(?:\\s+Ann\\.?)?",
  },
  // ── Hawaii ─────────────────────────────────────────────────────────────────
  {
    jurisdiction: "HI",
    abbreviations: ["Haw. Rev. Stat. Ann.", "Haw. Rev. Stat.", "HRS"],
    regexFragment: "Haw\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|HRS",
  },
  // ── Iowa ───────────────────────────────────────────────────────────────────
  {
    jurisdiction: "IA",
    abbreviations: ["Iowa Code Ann.", "Iowa Code", "I.C.A."],
    regexFragment: "Iowa\\s+Code(?:\\s+Ann\\.?)?|I\\.?C\\.?A\\.?",
  },
  // ── Idaho ──────────────────────────────────────────────────────────────────
  {
    jurisdiction: "ID",
    abbreviations: ["Idaho Code Ann.", "Idaho Code"],
    regexFragment: "Idaho\\s+Code(?:\\s+Ann\\.?)?",
  },
```

- [ ] **Step 4: Run smoke tests to verify they pass**

Run: `pnpm exec vitest run tests/extract/extractStatute.test.ts -t "batch 1" -v`
Expected: All 13 tests PASS

- [ ] **Step 5: Run full suite for regression**

Run: `pnpm exec vitest run -v 2>&1 | tail -5`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/data/stateStatutes.ts tests/extract/extractStatute.test.ts
git commit -m "feat: add statute patterns for AK, AZ, AR, CT, DC, HI, IA, ID"
```

---

### Task 6: Add new states batch 2 — KS, KY, LA, ME, MN, MO, MS, MT

**Files:**
- Modify: `src/data/stateStatutes.ts`
- Modify: `tests/extract/extractStatute.test.ts`

- [ ] **Step 1: Write failing smoke tests**

Add to `tests/extract/extractStatute.test.ts`:

```ts
describe("new state jurisdictions — batch 2", () => {
  const cases = [
    { text: "Kan. Stat. Ann. § 21-5401", jurisdiction: "KS", section: "21-5401" },
    { text: "K.S.A. § 21-5401", jurisdiction: "KS", section: "21-5401" },
    { text: "Ky. Rev. Stat. Ann. § 507.020", jurisdiction: "KY", section: "507.020" },
    { text: "KRS § 507.020", jurisdiction: "KY", section: "507.020" },
    { text: "La. Rev. Stat. Ann. § 14:30", jurisdiction: "LA", section: "14:30" },
    { text: "La. R.S. 14:30", jurisdiction: "LA", section: "14:30" },
    { text: "Me. Rev. Stat. Ann. § 208", jurisdiction: "ME", section: "208" },
    { text: "M.R.S.A. § 208", jurisdiction: "ME", section: "208" },
    { text: "Minn. Stat. § 609.02", jurisdiction: "MN", section: "609.02" },
    { text: "Miss. Code Ann. § 97-3-19", jurisdiction: "MS", section: "97-3-19" },
    { text: "Mo. Rev. Stat. § 565.021", jurisdiction: "MO", section: "565.021" },
    { text: "RSMo § 565.021", jurisdiction: "MO", section: "565.021" },
    { text: "Mont. Code Ann. § 45-5-502", jurisdiction: "MT", section: "45-5-502" },
    { text: "MCA § 45-5-502", jurisdiction: "MT", section: "45-5-502" },
  ]

  for (const { text, jurisdiction, section } of cases) {
    it(`should extract "${text}"`, () => {
      const citations = extractCitations(text)
      const statutes = citations.filter((c) => c.type === "statute")
      expect(statutes).toHaveLength(1)
      expect(statutes[0].jurisdiction).toBe(jurisdiction)
      expect(statutes[0].section).toBe(section)
    })
  }
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/extractStatute.test.ts -t "batch 2" -v`
Expected: All 14 tests FAIL

- [ ] **Step 3: Add 8 state entries**

Append to `stateStatuteEntries` in `src/data/stateStatutes.ts`:

```ts
  // ── Kansas ─────────────────────────────────────────────────────────────────
  {
    jurisdiction: "KS",
    abbreviations: ["Kan. Stat. Ann.", "K.S.A."],
    regexFragment: "Kan\\.?\\s+Stat\\.?\\s+Ann\\.?|K\\.?S\\.?A\\.?",
  },
  // ── Kentucky ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "KY",
    abbreviations: ["Ky. Rev. Stat. Ann.", "Ky. Rev. Stat.", "KRS"],
    regexFragment: "Ky\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|KRS",
  },
  // ── Louisiana ──────────────────────────────────────────────────────────────
  {
    jurisdiction: "LA",
    abbreviations: ["La. Rev. Stat. Ann.", "La. R.S.", "LSA-R.S."],
    regexFragment: "La\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|La\\.?\\s+R\\.?S\\.?|LSA-R\\.?S\\.?",
  },
  // ── Maine ──────────────────────────────────────────────────────────────────
  {
    jurisdiction: "ME",
    abbreviations: ["Me. Rev. Stat. Ann.", "Me. Rev. Stat.", "M.R.S.A.", "M.R.S."],
    regexFragment: "Me\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|M\\.?R\\.?S\\.?A?\\.?",
  },
  // ── Minnesota ──────────────────────────────────────────────────────────────
  {
    jurisdiction: "MN",
    abbreviations: ["Minn. Stat. Ann.", "Minn. Stat.", "M.S.A."],
    regexFragment: "Minn\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|M\\.?S\\.?A\\.?",
  },
  // ── Mississippi ────────────────────────────────────────────────────────────
  {
    jurisdiction: "MS",
    abbreviations: ["Miss. Code Ann.", "Mississippi Code", "MS Code"],
    regexFragment: "Miss(?:issippi)?\\.?\\s+Code(?:\\s+Ann\\.?)?|MS\\s+Code",
  },
  // ── Missouri ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "MO",
    abbreviations: ["Mo. Ann. Stat.", "Mo. Rev. Stat.", "V.A.M.S.", "RSMo"],
    regexFragment:
      "Mo\\.?\\s+(?:Ann\\.?\\s+|Rev\\.?\\s+)Stat\\.?|V\\.?A\\.?M\\.?S\\.?|RSMo",
  },
  // ── Montana ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "MT",
    abbreviations: ["Mont. Code Ann.", "MCA"],
    regexFragment: "Mont\\.?\\s+Code(?:\\s+Ann\\.?)?|MCA",
  },
```

- [ ] **Step 4: Run smoke tests to verify they pass**

Run: `pnpm exec vitest run tests/extract/extractStatute.test.ts -t "batch 2" -v`
Expected: All 14 tests PASS

- [ ] **Step 5: Run full suite for regression**

Run: `pnpm exec vitest run -v 2>&1 | tail -5`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/data/stateStatutes.ts tests/extract/extractStatute.test.ts
git commit -m "feat: add statute patterns for KS, KY, LA, ME, MN, MO, MS, MT"
```

---

### Task 7: Add new states batch 3 — ND, NE, NH, NM, NV, OK, OR, RI

**Files:**
- Modify: `src/data/stateStatutes.ts`
- Modify: `tests/extract/extractStatute.test.ts`

- [ ] **Step 1: Write failing smoke tests**

Add to `tests/extract/extractStatute.test.ts`:

```ts
describe("new state jurisdictions — batch 3", () => {
  const cases = [
    { text: "N.D. Cent. Code § 12.1-02-01", jurisdiction: "ND", section: "12.1-02-01" },
    { text: "N.D.C.C. § 12.1-02-01", jurisdiction: "ND", section: "12.1-02-01" },
    { text: "Neb. Rev. Stat. § 28-303", jurisdiction: "NE", section: "28-303" },
    { text: "N.H. Rev. Stat. Ann. § 625:9", jurisdiction: "NH", section: "625:9" },
    { text: "RSA § 625:9", jurisdiction: "NH", section: "625:9" },
    { text: "N.M. Stat. Ann. § 30-16-1", jurisdiction: "NM", section: "30-16-1" },
    { text: "NMSA § 30-16-1", jurisdiction: "NM", section: "30-16-1" },
    { text: "Nev. Rev. Stat. § 200.030", jurisdiction: "NV", section: "200.030" },
    { text: "NRS § 200.030", jurisdiction: "NV", section: "200.030" },
    { text: "Okla. Stat. § 496", jurisdiction: "OK", section: "496" },
    { text: "Or. Rev. Stat. § 161.085", jurisdiction: "OR", section: "161.085" },
    { text: "ORS § 161.085", jurisdiction: "OR", section: "161.085" },
    { text: "R.I. Gen. Laws § 11-1-2", jurisdiction: "RI", section: "11-1-2" },
    { text: "R.I.G.L. § 11-1-2", jurisdiction: "RI", section: "11-1-2" },
  ]

  for (const { text, jurisdiction, section } of cases) {
    it(`should extract "${text}"`, () => {
      const citations = extractCitations(text)
      const statutes = citations.filter((c) => c.type === "statute")
      expect(statutes).toHaveLength(1)
      expect(statutes[0].jurisdiction).toBe(jurisdiction)
      expect(statutes[0].section).toBe(section)
    })
  }
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/extractStatute.test.ts -t "batch 3" -v`
Expected: All 14 tests FAIL

- [ ] **Step 3: Add 8 state entries**

Append to `stateStatuteEntries` in `src/data/stateStatutes.ts`:

```ts
  // ── North Dakota ───────────────────────────────────────────────────────────
  {
    jurisdiction: "ND",
    abbreviations: ["N.D. Cent. Code", "N.D.C.C."],
    regexFragment: "N\\.?D\\.?\\s+Cent\\.?\\s+Code|N\\.?D\\.?C\\.?C\\.?",
  },
  // ── Nebraska ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "NE",
    abbreviations: ["Neb. Rev. Stat.", "R.R.S. Neb.", "R.R.S."],
    regexFragment: "Neb\\.?\\s+Rev\\.?\\s+Stat\\.?|R\\.?R\\.?S\\.?(?:\\s+Neb\\.?)?",
  },
  // ── New Hampshire ──────────────────────────────────────────────────────────
  {
    jurisdiction: "NH",
    abbreviations: ["N.H. Rev. Stat. Ann.", "N.H. RSA", "RSA"],
    regexFragment: "N\\.?H\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|N\\.?H\\.?\\s+RSA|RSA",
  },
  // ── New Mexico ─────────────────────────────────────────────────────────────
  {
    jurisdiction: "NM",
    abbreviations: ["N.M. Stat. Ann.", "NMSA 1978", "NMSA"],
    regexFragment: "N\\.?M\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|NMSA(?:\\s+1978)?",
  },
  // ── Nevada ─────────────────────────────────────────────────────────────────
  {
    jurisdiction: "NV",
    abbreviations: ["Nev. Rev. Stat. Ann.", "Nev. Rev. Stat.", "NRS"],
    regexFragment: "Nev\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|NRS",
  },
  // ── Oklahoma ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "OK",
    abbreviations: ["Okla. Stat. Ann.", "Okla. Stat.", "O.S."],
    regexFragment: "Okla\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|O\\.?S\\.?",
  },
  // ── Oregon ─────────────────────────────────────────────────────────────────
  {
    jurisdiction: "OR",
    abbreviations: ["Or. Rev. Stat. Ann.", "Or. Rev. Stat.", "ORS"],
    regexFragment: "Or\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|ORS",
  },
  // ── Rhode Island ───────────────────────────────────────────────────────────
  {
    jurisdiction: "RI",
    abbreviations: ["R.I. Gen. Laws", "R.I.G.L."],
    regexFragment: "R\\.?I\\.?\\s+Gen\\.?\\s+Laws|R\\.?I\\.?G\\.?L\\.?",
  },
```

- [ ] **Step 4: Run smoke tests to verify they pass**

Run: `pnpm exec vitest run tests/extract/extractStatute.test.ts -t "batch 3" -v`
Expected: All 14 tests PASS

- [ ] **Step 5: Run full suite for regression**

Run: `pnpm exec vitest run -v 2>&1 | tail -5`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/data/stateStatutes.ts tests/extract/extractStatute.test.ts
git commit -m "feat: add statute patterns for ND, NE, NH, NM, NV, OK, OR, RI"
```

---

### Task 8: Add new states batch 4 — SC, SD, TN, VT, WI, WV, WY

**Files:**
- Modify: `src/data/stateStatutes.ts`
- Modify: `tests/extract/extractStatute.test.ts`

- [ ] **Step 1: Write failing smoke tests**

Add to `tests/extract/extractStatute.test.ts`:

```ts
describe("new state jurisdictions — batch 4", () => {
  const cases = [
    { text: "S.C. Code Ann. § 16-3-10", jurisdiction: "SC", section: "16-3-10" },
    { text: "S.D. Codified Laws § 22-1-2", jurisdiction: "SD", section: "22-1-2" },
    { text: "SDCL § 22-1-2", jurisdiction: "SD", section: "22-1-2" },
    { text: "Tenn. Code Ann. § 39-13-101", jurisdiction: "TN", section: "39-13-101" },
    { text: "T.C.A. § 39-13-101", jurisdiction: "TN", section: "39-13-101" },
    { text: "Vt. Stat. Ann. § 2301", jurisdiction: "VT", section: "2301" },
    { text: "V.S.A. § 2301", jurisdiction: "VT", section: "2301" },
    { text: "Wis. Stat. § 940.01", jurisdiction: "WI", section: "940.01" },
    { text: "W. Va. Code § 61-2-9", jurisdiction: "WV", section: "61-2-9" },
    { text: "Wyo. Stat. Ann. § 6-2-101", jurisdiction: "WY", section: "6-2-101" },
    { text: "W.S. § 6-2-101", jurisdiction: "WY", section: "6-2-101" },
  ]

  for (const { text, jurisdiction, section } of cases) {
    it(`should extract "${text}"`, () => {
      const citations = extractCitations(text)
      const statutes = citations.filter((c) => c.type === "statute")
      expect(statutes).toHaveLength(1)
      expect(statutes[0].jurisdiction).toBe(jurisdiction)
      expect(statutes[0].section).toBe(section)
    })
  }
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/extractStatute.test.ts -t "batch 4" -v`
Expected: All 11 tests FAIL

- [ ] **Step 3: Add 7 state entries**

Append to `stateStatuteEntries` in `src/data/stateStatutes.ts`:

```ts
  // ── South Carolina ─────────────────────────────────────────────────────────
  {
    jurisdiction: "SC",
    abbreviations: ["S.C. Code Ann.", "S.C. Code"],
    regexFragment: "S\\.?C\\.?\\s+Code(?:\\s+Ann\\.?)?",
  },
  // ── South Dakota ───────────────────────────────────────────────────────────
  {
    jurisdiction: "SD",
    abbreviations: ["S.D. Codified Laws", "S.D.C.L.", "SDCL"],
    regexFragment: "S\\.?D\\.?\\s+Codified\\s+Laws|S\\.?D\\.?C\\.?L\\.?|SDCL",
  },
  // ── Tennessee ──────────────────────────────────────────────────────────────
  {
    jurisdiction: "TN",
    abbreviations: ["Tenn. Code Ann.", "Tennessee Code", "T.C.A.", "TN Code"],
    regexFragment: "Tenn(?:essee)?\\.?\\s+Code(?:\\s+Ann\\.?)?|T\\.?C\\.?A\\.?|TN\\s+Code",
  },
  // ── Vermont ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "VT",
    abbreviations: ["Vt. Stat. Ann.", "V.S.A."],
    regexFragment: "Vt\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|V\\.?S\\.?A\\.?",
  },
  // ── Wisconsin ──────────────────────────────────────────────────────────────
  {
    jurisdiction: "WI",
    abbreviations: ["Wis. Stat. Ann.", "Wis. Stat.", "W.S.A."],
    regexFragment: "Wis\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|W\\.?S\\.?A\\.?",
  },
  // ── West Virginia ──────────────────────────────────────────────────────────
  {
    jurisdiction: "WV",
    abbreviations: ["W. Va. Code Ann.", "W. Va. Code", "WV Code"],
    regexFragment: "W\\.?\\s*Va\\.?\\s+Code(?:\\s+Ann\\.?)?|WV\\s+Code",
  },
  // ── Wyoming ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "WY",
    abbreviations: ["Wyo. Stat. Ann.", "Wyo. Stat.", "W.S."],
    regexFragment: "Wyo\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|W\\.?S\\.?",
  },
```

- [ ] **Step 4: Run smoke tests to verify they pass**

Run: `pnpm exec vitest run tests/extract/extractStatute.test.ts -t "batch 4" -v`
Expected: All 11 tests PASS

- [ ] **Step 5: Run full suite for regression**

Run: `pnpm exec vitest run -v 2>&1 | tail -5`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/data/stateStatutes.ts tests/extract/extractStatute.test.ts
git commit -m "feat: add statute patterns for SC, SD, TN, VT, WI, WV, WY"
```

---

### Task 9: Update exports, lint, and final validation

**Files:**
- Modify: `src/data/index.ts`

- [ ] **Step 1: Update data entry point exports**

In `src/data/index.ts`, add the export:

```ts
export { stateStatuteEntries, type StateStatuteEntry } from "./stateStatutes"
```

- [ ] **Step 2: Run lint and format**

Run: `pnpm lint && pnpm format`
Expected: No errors (or auto-fixed)

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 4: Run full test suite**

Run: `pnpm exec vitest run -v`
Expected: All tests PASS including all new state smoke tests

- [ ] **Step 5: Run build and size check**

Run: `pnpm build && pnpm size`
Expected: Build succeeds, size within limits

- [ ] **Step 6: Verify the original issue example**

Run this as a quick inline test to confirm the issue's Alaska example now works:

```bash
node -e "
const { extractCitations } = require('./dist/index.cjs');
const c = extractCitations('Alaska Stat. §08.29.400 (4)');
const s = c.filter(x => x.type === 'statute');
console.log(s.length ? '✓ Alaska found: ' + s[0].section : '✗ Alaska not found');
"
```

Expected: `✓ Alaska found: 08.29.400`

- [ ] **Step 7: Commit and create changeset**

```bash
git add src/data/index.ts
git commit -m "chore: export stateStatuteEntries from data entry point"
pnpm changeset
```

Select: `minor` (new feature — 31 new jurisdictions). Summary: "Add statute citation patterns for 31 additional US state jurisdictions"

```bash
git add .changeset/
git commit -m "chore: add changeset for state statute coverage expansion"
```
