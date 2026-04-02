# Constitutional Citation Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `constitutional` citation type that extracts structured data from U.S. and state constitutional citations (articles, amendments, sections, clauses).

**Architecture:** Three regex patterns (us-constitution, state-constitution, bare-constitution) feed tokens into a single extractor that dispatches by patternId. A shared parser extracts article/amendment/section/clause fields, with a Roman numeral lookup table for conversion. Plugs into the existing discriminated union type system and extraction pipeline.

**Tech Stack:** TypeScript, Vitest, Biome

---

### Task 1: Add ConstitutionalCitation to type system

**Files:**
- Modify: `src/types/citation.ts`
- Modify: `src/types/guards.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add ConstitutionalCitation interface and update unions**

In `src/types/citation.ts`:

Add the interface after `StatutesAtLargeCitation` (around line 300):

```typescript
/**
 * Constitutional citation (U.S. or state constitution).
 *
 * @example "U.S. Const. art. III, § 2"
 * @example "U.S. Const. amend. XIV, § 1"
 * @example "Cal. Const. art. I, § 7"
 */
export interface ConstitutionalCitation extends CitationBase {
  type: "constitutional"
  /** Jurisdiction code: "US", 2-letter state code, or undefined for bare "Const." */
  jurisdiction?: string
  /** Article number (parsed from Roman numerals) — mutually exclusive with amendment */
  article?: number
  /** Amendment number (parsed from Roman numerals) — mutually exclusive with article */
  amendment?: number
  /** Section identifier (string to handle non-numeric like "3-a") */
  section?: string
  /** Clause number (always numeric) */
  clause?: number
}
```

Update `CitationType` (line 6) — add `"constitutional"`:

```typescript
export type CitationType = "case" | "statute" | "journal" | "neutral" | "publicLaw" | "federalRegister" | "statutesAtLarge" | "constitutional" | "id" | "supra" | "shortFormCase"
```

Update the `Citation` union (around line 358) — add `ConstitutionalCitation`:

```typescript
export type Citation =
  | FullCaseCitation
  | StatuteCitation
  | JournalCitation
  | NeutralCitation
  | PublicLawCitation
  | FederalRegisterCitation
  | StatutesAtLargeCitation
  | ConstitutionalCitation
  | IdCitation
  | SupraCitation
  | ShortFormCaseCitation
```

Update `FullCitationType` (line 373) — add `'constitutional'`:

```typescript
export type FullCitationType = 'case' | 'statute' | 'journal' | 'neutral' | 'publicLaw' | 'federalRegister' | 'statutesAtLarge' | 'constitutional'
```

Update `FullCitation` (line 379) — add `ConstitutionalCitation`:

```typescript
export type FullCitation = FullCaseCitation | StatuteCitation | JournalCitation | NeutralCitation | PublicLawCitation | FederalRegisterCitation | StatutesAtLargeCitation | ConstitutionalCitation
```

- [ ] **Step 2: Update type guard**

In `src/types/guards.ts`, update `isFullCitation` (line 7) to include `'constitutional'`:

```typescript
export function isFullCitation(citation: Citation): citation is FullCitation {
  return citation.type === 'case'
    || citation.type === 'statute'
    || citation.type === 'journal'
    || citation.type === 'neutral'
    || citation.type === 'publicLaw'
    || citation.type === 'federalRegister'
    || citation.type === 'statutesAtLarge'
    || citation.type === 'constitutional'
}
```

- [ ] **Step 3: Export ConstitutionalCitation from types barrel**

In `src/types/index.ts`, add `ConstitutionalCitation` to the type exports:

```typescript
export type {
  Citation,
  CitationType,
  CitationBase,
  CitationOfType,
  ExtractorMap,
  FullCaseCitation,
  StatuteCitation,
  JournalCitation,
  NeutralCitation,
  PublicLawCitation,
  FederalRegisterCitation,
  StatutesAtLargeCitation,
  ConstitutionalCitation,
  IdCitation,
  SupraCitation,
  ShortFormCaseCitation,
  FullCitationType,
  ShortFormCitationType,
  FullCitation,
  ShortFormCitation,
  Warning
} from "./citation"
```

- [ ] **Step 4: Export from package entry point**

In `src/index.ts`, add `ConstitutionalCitation` to the type exports (around line 28):

```typescript
export type {
  Span,
  TransformationMap,
  Citation,
  CitationType,
  CitationBase,
  CitationOfType,
  ExtractorMap,
  FullCaseCitation,
  StatuteCitation,
  JournalCitation,
  NeutralCitation,
  PublicLawCitation,
  FederalRegisterCitation,
  StatutesAtLargeCitation,
  ConstitutionalCitation,
  IdCitation,
  SupraCitation,
  ShortFormCaseCitation,
  FullCitationType,
  ShortFormCitationType,
  FullCitation,
  ShortFormCitation,
  Warning,
} from './types'
```

- [ ] **Step 5: Verify types compile**

Run: `pnpm typecheck`

Expected: No errors (ConstitutionalCitation is defined but not yet used in extraction — that's fine).

- [ ] **Step 6: Commit**

```bash
git add src/types/citation.ts src/types/guards.ts src/types/index.ts src/index.ts
git commit -m "feat(types): add ConstitutionalCitation type and update unions (#75)"
```

---

### Task 2: Create constitutional patterns

**Files:**
- Create: `src/patterns/constitutionalPatterns.ts`
- Modify: `src/patterns/index.ts`

- [ ] **Step 1: Write failing test for pattern matching**

Create `tests/patterns/constitutionalPatterns.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { constitutionalPatterns } from "@/patterns/constitutionalPatterns"

describe("constitutionalPatterns", () => {
  const findMatches = (text: string) => {
    const matches: Array<{ patternId: string; text: string }> = []
    for (const pattern of constitutionalPatterns) {
      pattern.regex.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = pattern.regex.exec(text)) !== null) {
        matches.push({ patternId: pattern.id, text: m[0] })
      }
    }
    return matches
  }

  describe("us-constitution", () => {
    it("matches U.S. Const. article with section", () => {
      const matches = findMatches("under U.S. Const. art. III, § 2 the court")
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe("us-constitution")
      expect(matches[0].text).toBe("U.S. Const. art. III, § 2")
    })

    it("matches U.S. Const. amendment with section", () => {
      const matches = findMatches("under U.S. Const. amend. XIV, § 1 the court")
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe("us-constitution")
    })

    it("matches amendment without section", () => {
      const matches = findMatches("violates U.S. Const. amend. I and")
      expect(matches).toHaveLength(1)
      expect(matches[0].text).toBe("U.S. Const. amend. I")
    })

    it("matches article with section and clause", () => {
      const matches = findMatches("under U.S. Const. art. I, § 8, cl. 3 which grants")
      expect(matches).toHaveLength(1)
      expect(matches[0].text).toBe("U.S. Const. art. I, § 8, cl. 3")
    })

    it("matches US Const. variant (no periods in U.S.)", () => {
      const matches = findMatches("under US Const. amend. V the")
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe("us-constitution")
    })

    it("matches U. S. Const. variant (space between U. S.)", () => {
      const matches = findMatches("see U. S. Const. art. III, § 1")
      expect(matches).toHaveLength(1)
    })

    it("matches unabbreviated article/amendment", () => {
      const matches = findMatches("U.S. Const. article III, § 2")
      expect(matches).toHaveLength(1)
    })

    it("matches Arabic numeral for article", () => {
      const matches = findMatches("U.S. Const. art. 3, § 2")
      expect(matches).toHaveLength(1)
    })
  })

  describe("state-constitution", () => {
    it("matches Cal. Const. article", () => {
      const matches = findMatches("under Cal. Const. art. I, § 7 the")
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe("state-constitution")
    })

    it("matches N.Y. Const. article", () => {
      const matches = findMatches("per N.Y. Const. art. VI, § 20 the")
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe("state-constitution")
    })

    it("matches Tex. Const. with non-numeric section", () => {
      const matches = findMatches("see Tex. Const. art. V, § 3-a which")
      expect(matches).toHaveLength(1)
      expect(matches[0].text).toBe("Tex. Const. art. V, § 3-a")
    })

    it("matches Fla. Const.", () => {
      const matches = findMatches("under Fla. Const. art. I, § 2 the")
      expect(matches).toHaveLength(1)
    })

    it("matches state constitution amendment", () => {
      const matches = findMatches("under Cal. Const. amend. II, § 3")
      expect(matches).toHaveLength(1)
    })
  })

  describe("bare-constitution", () => {
    it("matches bare Const. with article, section, and clause", () => {
      const matches = findMatches("under Const. art. I, § 8, cl. 3 which")
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe("bare-constitution")
    })

    it("matches bare Const. amendment", () => {
      const matches = findMatches("violates Const. amend. XIV, § 1")
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe("bare-constitution")
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/patterns/constitutionalPatterns.test.ts`

Expected: FAIL — module `@/patterns/constitutionalPatterns` not found.

- [ ] **Step 3: Create constitutional patterns file**

Create `src/patterns/constitutionalPatterns.ts`:

```typescript
/**
 * Constitutional Citation Regex Patterns
 *
 * Patterns for U.S. Constitution, state constitutions, and bare "Const." citations.
 * Intentionally broad for tokenization — extraction layer parses structured fields.
 *
 * Three patterns:
 * - us-constitution: "U.S. Const. art. III, § 2"
 * - state-constitution: "Cal. Const. art. I, § 7"
 * - bare-constitution: "Const. art. I, § 8, cl. 3"
 */

import type { Pattern } from "./casePatterns"

// Shared tail: art./amend. + numeral + optional § section + optional cl. clause
// Roman numerals: I, II, III, IV, V, VI, VII, VIII, IX, X, XI, XII, XIII, XIV, XV, XVI, XVII, XVIII, XIX, XX, XXI, XXII, XXIII, XXIV, XXV, XXVI, XXVII
// Also accepts Arabic numerals as fallback
const ARTICLE_OR_AMENDMENT = String.raw`(?:art(?:icle)?\.?|amend(?:ment)?\.?)\s+([IVXLC]+|\d+)`
const OPTIONAL_SECTION = String.raw`(?:[,;]\s*§\s*([^\s,;()]+))?`
const OPTIONAL_CLAUSE = String.raw`(?:[,;]\s*cl\.?\s*(\d+))?`
const BODY_TAIL = `${ARTICLE_OR_AMENDMENT}${OPTIONAL_SECTION}${OPTIONAL_CLAUSE}`

export const constitutionalPatterns: Pattern[] = [
  {
    id: "us-constitution",
    regex: new RegExp(
      String.raw`\b(?:United\s+States\s+Constitution|U\.?\s*S\.?\s+Const\.?)\s+${BODY_TAIL}`,
      "gi",
    ),
    description:
      'U.S. Constitution citations (e.g., "U.S. Const. art. III, § 2", "U.S. Const. amend. XIV")',
    type: "constitutional",
  },
  {
    id: "state-constitution",
    regex: new RegExp(
      String.raw`\b(?:Ala|Alaska|Ariz|Ark|Cal(?:if)?|Colo|Conn|Del|Fla|Ga|Haw|Idaho|Ill|Ind|Iowa|Kan|Ky|La|Me|Md|Mass|Mich|Minn|Miss|Mo|Mont|Neb|Nev|N\.?\s*H|N\.?\s*J|N\.?\s*M|N\.?\s*Y|N\.?\s*C|N\.?\s*D|Ohio|Okla|Or(?:e)?|Pa|R\.?\s*I|S\.?\s*C|S\.?\s*D|Tenn|Tex|Utah|Vt|Va|Wash|W\.?\s*Va|Wis|Wyo)\.?\s+Const\.?\s+${BODY_TAIL}`,
      "gi",
    ),
    description:
      'State constitution citations (e.g., "Cal. Const. art. I, § 7", "N.Y. Const. art. VI, § 20")',
    type: "constitutional",
  },
  {
    id: "bare-constitution",
    regex: new RegExp(
      String.raw`\bConst\.?\s+${BODY_TAIL}`,
      "gi",
    ),
    description:
      'Bare constitutional citations without jurisdiction prefix (e.g., "Const. art. I, § 8, cl. 3")',
    type: "constitutional",
  },
]
```

- [ ] **Step 4: Export from patterns barrel**

In `src/patterns/index.ts`, add:

```typescript
export * from './constitutionalPatterns'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run tests/patterns/constitutionalPatterns.test.ts`

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/patterns/constitutionalPatterns.ts src/patterns/index.ts tests/patterns/constitutionalPatterns.test.ts
git commit -m "feat(patterns): add constitutional citation regex patterns (#75)"
```

---

### Task 3: Create constitutional extractor

**Files:**
- Create: `src/extract/extractConstitutional.ts`
- Modify: `src/extract/index.ts`

- [ ] **Step 1: Write failing test for extraction**

Create `tests/extract/extractConstitutional.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { extractConstitutional } from "@/extract/extractConstitutional"
import type { Token } from "@/tokenize"
import type { TransformationMap } from "@/types/span"

describe("extractConstitutional", () => {
  const createIdentityMap = (): TransformationMap => {
    const cleanToOriginal = new Map<number, number>()
    const originalToClean = new Map<number, number>()
    for (let i = 0; i < 1000; i++) {
      cleanToOriginal.set(i, i)
      originalToClean.set(i, i)
    }
    return { cleanToOriginal, originalToClean }
  }

  const createOffsetMap = (offset: number): TransformationMap => {
    const cleanToOriginal = new Map<number, number>()
    const originalToClean = new Map<number, number>()
    for (let i = 0; i < 1000; i++) {
      cleanToOriginal.set(i, i + offset)
      originalToClean.set(i + offset, i)
    }
    return { cleanToOriginal, originalToClean }
  }

  describe("US Constitution — articles", () => {
    it("extracts article with section", () => {
      const token: Token = {
        text: "U.S. Const. art. III, § 2",
        span: { cleanStart: 6, cleanEnd: 31 },
        type: "constitutional",
        patternId: "us-constitution",
      }
      const citation = extractConstitutional(token, createIdentityMap())

      expect(citation.type).toBe("constitutional")
      expect(citation.jurisdiction).toBe("US")
      expect(citation.article).toBe(3)
      expect(citation.amendment).toBeUndefined()
      expect(citation.section).toBe("2")
      expect(citation.clause).toBeUndefined()
      expect(citation.confidence).toBe(0.95)
    })

    it("extracts article with section and clause", () => {
      const token: Token = {
        text: "U.S. Const. art. I, § 8, cl. 3",
        span: { cleanStart: 0, cleanEnd: 31 },
        type: "constitutional",
        patternId: "us-constitution",
      }
      const citation = extractConstitutional(token, createIdentityMap())

      expect(citation.article).toBe(1)
      expect(citation.section).toBe("8")
      expect(citation.clause).toBe(3)
    })

    it("extracts article without section", () => {
      const token: Token = {
        text: "U.S. Const. art. III",
        span: { cleanStart: 0, cleanEnd: 20 },
        type: "constitutional",
        patternId: "us-constitution",
      }
      const citation = extractConstitutional(token, createIdentityMap())

      expect(citation.article).toBe(3)
      expect(citation.section).toBeUndefined()
      expect(citation.confidence).toBe(0.9)
    })
  })

  describe("US Constitution — amendments", () => {
    it("extracts amendment with section", () => {
      const token: Token = {
        text: "U.S. Const. amend. XIV, § 1",
        span: { cleanStart: 0, cleanEnd: 27 },
        type: "constitutional",
        patternId: "us-constitution",
      }
      const citation = extractConstitutional(token, createIdentityMap())

      expect(citation.amendment).toBe(14)
      expect(citation.article).toBeUndefined()
      expect(citation.section).toBe("1")
      expect(citation.jurisdiction).toBe("US")
    })

    it("extracts amendment without section", () => {
      const token: Token = {
        text: "U.S. Const. amend. I",
        span: { cleanStart: 0, cleanEnd: 20 },
        type: "constitutional",
        patternId: "us-constitution",
      }
      const citation = extractConstitutional(token, createIdentityMap())

      expect(citation.amendment).toBe(1)
      expect(citation.section).toBeUndefined()
      expect(citation.confidence).toBe(0.9)
    })

    it("extracts amendment XXVII (highest)", () => {
      const token: Token = {
        text: "U.S. Const. amend. XXVII",
        span: { cleanStart: 0, cleanEnd: 24 },
        type: "constitutional",
        patternId: "us-constitution",
      }
      const citation = extractConstitutional(token, createIdentityMap())

      expect(citation.amendment).toBe(27)
    })
  })

  describe("US Constitution — abbreviation variants", () => {
    it("handles unabbreviated 'article'", () => {
      const token: Token = {
        text: "U.S. Const. article III, § 2",
        span: { cleanStart: 0, cleanEnd: 28 },
        type: "constitutional",
        patternId: "us-constitution",
      }
      const citation = extractConstitutional(token, createIdentityMap())

      expect(citation.article).toBe(3)
      expect(citation.section).toBe("2")
    })

    it("handles unabbreviated 'amendment'", () => {
      const token: Token = {
        text: "U.S. Const. amendment XIV, § 1",
        span: { cleanStart: 0, cleanEnd: 30 },
        type: "constitutional",
        patternId: "us-constitution",
      }
      const citation = extractConstitutional(token, createIdentityMap())

      expect(citation.amendment).toBe(14)
    })

    it("handles Arabic numeral for article", () => {
      const token: Token = {
        text: "U.S. Const. art. 3, § 2",
        span: { cleanStart: 0, cleanEnd: 23 },
        type: "constitutional",
        patternId: "us-constitution",
      }
      const citation = extractConstitutional(token, createIdentityMap())

      expect(citation.article).toBe(3)
    })
  })

  describe("state constitutions", () => {
    it("extracts California constitution", () => {
      const token: Token = {
        text: "Cal. Const. art. I, § 7",
        span: { cleanStart: 0, cleanEnd: 23 },
        type: "constitutional",
        patternId: "state-constitution",
      }
      const citation = extractConstitutional(token, createIdentityMap())

      expect(citation.jurisdiction).toBe("CA")
      expect(citation.article).toBe(1)
      expect(citation.section).toBe("7")
      expect(citation.confidence).toBe(0.9)
    })

    it("extracts New York constitution", () => {
      const token: Token = {
        text: "N.Y. Const. art. VI, § 20",
        span: { cleanStart: 0, cleanEnd: 25 },
        type: "constitutional",
        patternId: "state-constitution",
      }
      const citation = extractConstitutional(token, createIdentityMap())

      expect(citation.jurisdiction).toBe("NY")
      expect(citation.article).toBe(6)
      expect(citation.section).toBe("20")
    })

    it("extracts Texas constitution with non-numeric section", () => {
      const token: Token = {
        text: "Tex. Const. art. V, § 3-a",
        span: { cleanStart: 0, cleanEnd: 25 },
        type: "constitutional",
        patternId: "state-constitution",
      }
      const citation = extractConstitutional(token, createIdentityMap())

      expect(citation.jurisdiction).toBe("TX")
      expect(citation.section).toBe("3-a")
    })

    it("extracts Florida constitution", () => {
      const token: Token = {
        text: "Fla. Const. art. I, § 2",
        span: { cleanStart: 0, cleanEnd: 23 },
        type: "constitutional",
        patternId: "state-constitution",
      }
      const citation = extractConstitutional(token, createIdentityMap())

      expect(citation.jurisdiction).toBe("FL")
    })
  })

  describe("bare constitution", () => {
    it("extracts bare Const. with lower confidence", () => {
      const token: Token = {
        text: "Const. art. I, § 8, cl. 3",
        span: { cleanStart: 0, cleanEnd: 25 },
        type: "constitutional",
        patternId: "bare-constitution",
      }
      const citation = extractConstitutional(token, createIdentityMap())

      expect(citation.jurisdiction).toBeUndefined()
      expect(citation.article).toBe(1)
      expect(citation.section).toBe("8")
      expect(citation.clause).toBe(3)
      expect(citation.confidence).toBe(0.7)
    })
  })

  describe("position translation", () => {
    it("translates clean positions to original with offset", () => {
      const token: Token = {
        text: "U.S. Const. amend. XIV, § 1",
        span: { cleanStart: 10, cleanEnd: 37 },
        type: "constitutional",
        patternId: "us-constitution",
      }
      const offset = 5
      const citation = extractConstitutional(token, createOffsetMap(offset))

      expect(citation.span.cleanStart).toBe(10)
      expect(citation.span.cleanEnd).toBe(37)
      expect(citation.span.originalStart).toBe(15)
      expect(citation.span.originalEnd).toBe(42)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/extract/extractConstitutional.test.ts`

Expected: FAIL — module `@/extract/extractConstitutional` not found.

- [ ] **Step 3: Create the extractor**

Create `src/extract/extractConstitutional.ts`:

```typescript
/**
 * Constitutional Citation Extraction
 *
 * Parses tokenized constitutional citations to extract jurisdiction,
 * article/amendment, section, and clause fields.
 *
 * Dispatch by patternId:
 * - "us-constitution" → jurisdiction: "US"
 * - "state-constitution" → jurisdiction mapped from state abbreviation
 * - "bare-constitution" → jurisdiction: undefined
 *
 * @module extract/extractConstitutional
 */

import type { Token } from "@/tokenize"
import type { ConstitutionalCitation } from "@/types/citation"
import type { TransformationMap } from "@/types/span"

/**
 * Roman numeral lookup table (I–XXVII).
 * Covers all U.S. constitutional articles (I–VII) and amendments (I–XXVII).
 */
const ROMAN_TO_INT: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
  XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16, XVII: 17, XVIII: 18,
  XIX: 19, XX: 20, XXI: 21, XXII: 22, XXIII: 23, XXIV: 24, XXV: 25,
  XXVI: 26, XXVII: 27,
}

/** Parse a Roman numeral or Arabic number string to an integer. */
function parseNumeral(raw: string): number | undefined {
  const upper = raw.toUpperCase()
  if (upper in ROMAN_TO_INT) return ROMAN_TO_INT[upper]
  const n = Number.parseInt(raw, 10)
  return Number.isNaN(n) ? undefined : n
}

/**
 * State abbreviation → 2-letter code mapping.
 * Keys are lowercase abbreviation stems (without trailing period).
 */
const STATE_ABBREV_TO_CODE: Record<string, string> = {
  ala: "AL", alaska: "AK", ariz: "AZ", ark: "AR",
  cal: "CA", calif: "CA", colo: "CO", conn: "CT",
  del: "DE", fla: "FL", ga: "GA", haw: "HI",
  idaho: "ID", ill: "IL", ind: "IN", iowa: "IA",
  kan: "KS", ky: "KY", la: "LA", me: "ME",
  md: "MD", mass: "MA", mich: "MI", minn: "MN",
  miss: "MS", mo: "MO", mont: "MT", neb: "NE",
  nev: "NV", "n.h": "NH", "n.j": "NJ", "n.m": "NM",
  "n.y": "NY", "n.c": "NC", "n.d": "ND", ohio: "OH",
  okla: "OK", or: "OR", ore: "OR", pa: "PA",
  "r.i": "RI", "s.c": "SC", "s.d": "SD", tenn: "TN",
  tex: "TX", utah: "UT", vt: "VT", va: "VA",
  wash: "WA", "w.va": "WV", wis: "WI", wyo: "WY",
}

/** Regex to parse the body: art./amend. + numeral + optional § section + optional cl. clause */
const BODY_RE = /(?:art(?:icle)?\.?|amend(?:ment)?\.?)\s+([IVXLC]+|\d+)(?:[,;]\s*§\s*([^\s,;()]+))?(?:[,;]\s*cl\.?\s*(\d+))?/i

/** Regex to detect article vs amendment keyword */
const IS_AMENDMENT_RE = /amend/i

/** Regex to extract the state abbreviation prefix from state-constitution tokens */
const STATE_PREFIX_RE = /^([A-Za-z]+(?:\.\s*[A-Za-z])?(?:\.\s*[A-Za-z])?)\.?\s+Const/i

/**
 * Resolve state abbreviation from token text to 2-letter code.
 */
function resolveStateJurisdiction(text: string): string | undefined {
  const prefixMatch = STATE_PREFIX_RE.exec(text)
  if (!prefixMatch) return undefined

  // Normalize: collapse spaces, lowercase, remove trailing dots
  const raw = prefixMatch[1]
    .replace(/\s+/g, "")
    .replace(/\.$/g, "")
    .toLowerCase()

  // Try exact match first
  if (raw in STATE_ABBREV_TO_CODE) return STATE_ABBREV_TO_CODE[raw]

  // Try with dots preserved (for N.Y., N.C., etc.)
  const withDots = prefixMatch[1]
    .replace(/\s+/g, "")
    .replace(/\.$/g, "")
    .toLowerCase()
  if (withDots in STATE_ABBREV_TO_CODE) return STATE_ABBREV_TO_CODE[withDots]

  return undefined
}

/**
 * Extract a constitutional citation from a tokenized match.
 */
export function extractConstitutional(
  token: Token,
  transformationMap: TransformationMap,
): ConstitutionalCitation {
  const { text, span } = token

  // Parse body fields
  const bodyMatch = BODY_RE.exec(text)

  let article: number | undefined
  let amendment: number | undefined
  let section: string | undefined
  let clause: number | undefined

  if (bodyMatch) {
    const numeral = parseNumeral(bodyMatch[1])
    const keyword = text.slice(0, bodyMatch.index + bodyMatch[0].indexOf(bodyMatch[1]))

    if (IS_AMENDMENT_RE.test(keyword)) {
      amendment = numeral
    } else {
      article = numeral
    }

    section = bodyMatch[2] || undefined
    clause = bodyMatch[3] ? Number.parseInt(bodyMatch[3], 10) : undefined
  }

  // Determine jurisdiction from patternId
  let jurisdiction: string | undefined
  switch (token.patternId) {
    case "us-constitution":
      jurisdiction = "US"
      break
    case "state-constitution":
      jurisdiction = resolveStateJurisdiction(text)
      break
    case "bare-constitution":
    default:
      jurisdiction = undefined
      break
  }

  // Translate positions
  const originalStart = transformationMap.cleanToOriginal.get(span.cleanStart) ?? span.cleanStart
  const originalEnd = transformationMap.cleanToOriginal.get(span.cleanEnd) ?? span.cleanEnd

  // Confidence scoring
  let confidence: number
  if (token.patternId === "bare-constitution") {
    confidence = 0.7
  } else if (section) {
    confidence = token.patternId === "us-constitution" ? 0.95 : 0.9
  } else {
    confidence = 0.9
  }

  return {
    type: "constitutional",
    text,
    span: { cleanStart: span.cleanStart, cleanEnd: span.cleanEnd, originalStart, originalEnd },
    confidence,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    jurisdiction,
    article,
    amendment,
    section,
    clause,
  }
}
```

- [ ] **Step 4: Export from extract barrel**

In `src/extract/index.ts`, add:

```typescript
export * from './extractConstitutional'
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/extract/extractConstitutional.test.ts`

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/extract/extractConstitutional.ts src/extract/index.ts tests/extract/extractConstitutional.test.ts
git commit -m "feat(extract): add constitutional citation extractor (#75)"
```

---

### Task 4: Integrate into extraction pipeline

**Files:**
- Modify: `src/extract/extractCitations.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing integration test**

Add to `tests/integration/fullPipeline.test.ts` (at the end, inside the existing describe block):

```typescript
describe("Constitutional citations", () => {
  it("extracts U.S. constitutional citation through full pipeline", () => {
    const text = "The right is protected by U.S. Const. amend. XIV, § 1."
    const citations = extractCitations(text)

    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("constitutional")
    if (citations[0].type === "constitutional") {
      expect(citations[0].jurisdiction).toBe("US")
      expect(citations[0].amendment).toBe(14)
      expect(citations[0].section).toBe("1")
      expect(citations[0].span.originalStart).toBe(26)
      expect(citations[0].matchedText).toBe("U.S. Const. amend. XIV, § 1")
    }
  })

  it("extracts state constitutional citation through full pipeline", () => {
    const text = "See Cal. Const. art. I, § 7 for privacy rights."
    const citations = extractCitations(text)

    expect(citations).toHaveLength(1)
    if (citations[0].type === "constitutional") {
      expect(citations[0].jurisdiction).toBe("CA")
      expect(citations[0].article).toBe(1)
      expect(citations[0].section).toBe("7")
    }
  })

  it("coexists with case and statute citations", () => {
    const text =
      "Under 42 U.S.C. § 1983 and U.S. Const. amend. XIV, see Smith v. Jones, 500 F.2d 123 (1974)."
    const citations = extractCitations(text)

    const types = citations.map((c) => c.type)
    expect(types).toContain("statute")
    expect(types).toContain("constitutional")
    expect(types).toContain("case")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/integration/fullPipeline.test.ts -t "Constitutional"`

Expected: FAIL — constitutional citations not extracted (no pattern registered, no dispatcher case).

- [ ] **Step 3: Register patterns and add dispatcher case**

In `src/extract/extractCitations.ts`:

Add import for `constitutionalPatterns` (line 32 area):

```typescript
import {
  casePatterns,
  statutePatterns,
  journalPatterns,
  neutralPatterns,
  shortFormPatterns,
  constitutionalPatterns,
} from '@/patterns'
```

Add import for `extractConstitutional` (line 24 area):

```typescript
import {
  extractCase,
  extractStatute,
  extractJournal,
  extractNeutral,
  extractPublicLaw,
  extractFederalRegister,
  extractStatutesAtLarge,
  extractConstitutional,
} from '@/extract'
```

Update the `allPatterns` array (line 181) — add `constitutionalPatterns` before `statutePatterns`:

```typescript
const allPatterns = options?.patterns || [
  ...neutralPatterns,
  ...shortFormPatterns,
  ...casePatterns,
  ...constitutionalPatterns,
  ...statutePatterns,
  ...journalPatterns,
]
```

Add `case 'constitutional'` to the switch statement (after the `'statutesAtLarge'` case, around line 250):

```typescript
case 'constitutional':
  citation = extractConstitutional(token, transformationMap)
  break
```

- [ ] **Step 4: Export extractConstitutional from package entry point**

In `src/index.ts`, add `extractConstitutional` to the extraction function exports (around line 76):

```typescript
export {
  extractCase,
  extractStatute,
  extractJournal,
  extractNeutral,
  extractPublicLaw,
  extractFederalRegister,
  extractStatutesAtLarge,
  extractConstitutional,
} from './extract'
```

- [ ] **Step 5: Run integration tests to verify they pass**

Run: `pnpm exec vitest run tests/integration/fullPipeline.test.ts -t "Constitutional"`

Expected: All PASS.

- [ ] **Step 6: Run full test suite**

Run: `pnpm exec vitest run`

Expected: All existing tests still pass. No regressions.

- [ ] **Step 7: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/extract/extractCitations.ts src/index.ts tests/integration/fullPipeline.test.ts
git commit -m "feat: integrate constitutional citations into extraction pipeline (#75)"
```

---

### Task 5: Final validation

**Files:** None (validation only)

- [ ] **Step 1: Run full test suite**

Run: `pnpm exec vitest run`

Expected: All tests pass, including new constitutional tests.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`

Expected: No errors.

- [ ] **Step 3: Run lint**

Run: `pnpm lint`

Expected: No errors.

- [ ] **Step 4: Check bundle size**

Run: `pnpm build && pnpm size`

Expected: Build succeeds. Size within limits (adding ~2KB for patterns + extractor).

- [ ] **Step 5: Create changeset**

Run: `pnpm changeset`

Select: `minor` (new citation type is a feature)

Summary: `Add constitutional citation extraction (U.S. and state constitutions) with article, amendment, section, and clause parsing`
