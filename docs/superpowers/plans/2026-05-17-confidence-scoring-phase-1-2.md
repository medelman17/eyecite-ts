# Confidence Scoring Overhaul — Phases 1–2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phases 1 (Foundation) and 2 (Scorer Migration) of the confidence-scoring overhaul per `docs/superpowers/specs/2026-05-17-confidence-scoring-design.md`. End state: every citation carries a `Confidence` struct with axes/reasons/level (uncalibrated `score` for now — identity calibration); the old `confidence: number` field and `resolution.confidence` are gone.

**Architecture:** Centralize all scoring math in `src/score/`. Extractors emit feature vectors (`ExtractionFeatures` discriminated union); a central scorer maps features → `Confidence`. Calibration shell is in place but acts as identity until Phase 3 (separate plan) ships `calibration.json`. The 33+ statute sub-extractors get migrated in a single batch task with checklist to avoid task explosion.

**Tech Stack:** TypeScript 5.x, Vitest 4.x, Biome (formatter/linter), pnpm 10, zero runtime deps.

**Spec reference:** `docs/superpowers/specs/2026-05-17-confidence-scoring-design.md`

---

## File Structure

### New files
```
src/score/
  types.ts                 # Confidence, ConfidenceLevel, ReasonCode, Explanation types
  features.ts              # ExtractionFeatures discriminated union (per citation type)
  weights.ts               # Hand-rolled scoring weights per pattern-id
  axes.ts                  # computeAxes(features) → { extraction, metadata, resolution? }
  reasons.ts               # collectReasonCodes(features) → ReasonCode[]
  calibrate.ts             # calibrate(rawScore, patternId) → score (identity for now)
  level.ts                 # deriveLevel(score) → ConfidenceLevel
  scorer.ts                # scoreCitation(features) → Confidence (orchestrator)
  index.ts                 # re-exports

src/score/__tests__/
  features.test.ts
  weights.test.ts
  axes.test.ts
  reasons.test.ts
  level.test.ts
  calibrate.test.ts
  scorer.test.ts

tests/integration/
  confidenceShape.test.ts  # Confidence struct populated correctly across citation types

tests/calibration/
  rawEce.test.ts           # Reports raw (uncalibrated) ECE per pattern from labeled corpora

scripts/eval/
  rawEce.ts                # CLI helper for `pnpm eval:raw-ece`
```

### Modified files
- `src/types/citation.ts` — `CitationBase.confidence: number` → `confidence: Confidence`; remove documented bands
- `src/resolve/types.ts` — remove `confidence: number` from `ResolutionResult`
- `src/extract/extractCase.ts` — inline scoring (line 2934-2970) → `buildCaseFeatures()` + `scoreCitation()`
- `src/extract/extractShortForms.ts` — Id (line 162-201), supra (line 291-350), shortFormCase (line 462-479)
- `src/extract/extractStatute.ts` — legacy path (line 87-101) and unparseable fallback (line 72)
- `src/extract/extractConstitutional.ts` — bucket-based scoring (line 198-207)
- `src/extract/extractJournal.ts` — flat 0.6 (line 148)
- `src/extract/extractNeutral.ts` — flat 1.0 (line 212)
- `src/extract/extractPublicLaw.ts` — flat 0.9 (line 80)
- `src/extract/extractFederalRegister.ts` — flat 0.9 (line 85)
- `src/extract/extractStatutesAtLarge.ts` — confidence assignment
- `src/extract/extractDocket.ts` — flat 0.7 (line 129)
- `src/extract/statutes/*.ts` — 33 sub-extractors with similar `confidence = X (+ Y)` patterns
- `src/extract/filterFalsePositives.ts` — emit reason codes; remove flat-0.1 confidence penalty
- `src/extract/extractCitations.ts` — orchestrator unchanged but type now flows new Confidence
- `src/extract/validation.ts` — adjust `adjustedConfidence` math to operate on `Confidence.score`
- `src/resolve/DocumentResolver.ts` — emit resolution features into `Confidence.axes.resolution` instead of setting `resolution.confidence`
- `tests/**/*.ts` — every test that asserts `c.confidence > 0.X` becomes `c.confidence.score > 0.X`; every assertion on `resolution.confidence` becomes `citation.confidence.axes.resolution`

### Out of scope (later plans)
- Phase 3 (calibration build script, calibration.json, ECE regression test) — own plan
- Phase 4 (precisionTarget, explain mode, profiles) — own plan
- Phase 5 (always-on validation, deprecate extractWithValidation) — own plan
- Phase 6 (docs/guides/confidence.md, P-R tables) — own plan

---

## Phase 1: Foundation

These tasks introduce the new types and scaffolding **without changing any extractor behavior**. After Phase 1, `pnpm test` still passes (since no extractor uses the new code yet). We also stand up the eval harness to measure raw (uncalibrated) ECE so we have a baseline.

### Task 1: Create `src/score/types.ts` with Confidence struct

**Files:**
- Create: `src/score/types.ts`
- Test: `src/score/__tests__/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/score/__tests__/types.test.ts`:
```ts
import { describe, expectTypeOf, it } from "vitest"
import type { Confidence, ConfidenceLevel, Explanation, ReasonCode } from "@/score/types"

describe("score types", () => {
  it("ConfidenceLevel is a string literal union", () => {
    expectTypeOf<ConfidenceLevel>().toEqualTypeOf<"certain" | "high" | "medium" | "low">()
  })

  it("Confidence struct has expected fields", () => {
    const c: Confidence = {
      score: 0.85,
      level: "high",
      axes: { extraction: 0.85, metadata: 0.71 },
      reasons: ["known_reporter"],
    }
    expectTypeOf(c.score).toBeNumber()
    expectTypeOf(c.level).toEqualTypeOf<ConfidenceLevel>()
    expectTypeOf(c.axes.extraction).toBeNumber()
    expectTypeOf(c.axes.metadata).toBeNumber()
    expectTypeOf(c.axes.resolution).toEqualTypeOf<number | undefined>()
    expectTypeOf(c.reasons).toEqualTypeOf<ReasonCode[]>()
  })

  it("Explanation supports recursive nesting", () => {
    const e: Explanation = {
      value: 0.85,
      description: "outer",
      details: [{ value: 0.5, description: "inner" }],
    }
    expectTypeOf(e.details).toEqualTypeOf<Explanation[] | undefined>()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/score/__tests__/types.test.ts
```
Expected: FAIL — module `@/score/types` not found.

- [ ] **Step 3: Implement `src/score/types.ts`**

```ts
/**
 * Confidence scoring types — see docs/superpowers/specs/2026-05-17-confidence-scoring-design.md
 */

export type ConfidenceLevel = "certain" | "high" | "medium" | "low"

export type ReasonCode =
  // Positive extraction signals
  | "known_reporter"
  | "year_plausible"
  | "case_name_present"
  | "court_identified"
  // Negative extraction signals
  | "reporter_unknown"
  | "reporter_ambiguous"
  | "year_as_volume"
  | "blocked_reporter"
  | "year_implausible"
  | "suspicious_volume"
  | "mid_sentence_id"
  | "typo_punctuation"
  | "lowercase_id"
  | "small_volume"
  // Metadata signals
  | "missing_pincite"
  | "missing_year"
  | "missing_court"
  | "missing_case_name"
  | "blank_page"
  // Resolution signals (short-form only)
  | "exact_antecedent_match"
  | "fuzzy_party_match"
  | "ambiguous_id_window"
  | "no_antecedent_in_scope"

export interface Explanation {
  value: number
  description: string
  details?: Explanation[]
}

export interface Confidence {
  /** Calibrated composite (0..1). Produced by the calibration shell. */
  score: number
  /** Categorical bucket; stable across minor versions. Derived from score. */
  level: ConfidenceLevel
  /** Orthogonal axes — separable concerns. */
  axes: {
    /** P(this is a real citation), calibrated per extractor. */
    extraction: number
    /** Completeness/quality of parsed fields. */
    metadata: number
    /** P(correct antecedent link). Only present on short-form citations after resolve=true. */
    resolution?: number
  }
  /** Machine-readable codes. */
  reasons: ReasonCode[]
  /** Nested score-tree breakdown. Populated only when extractCitations({ explain: true }). */
  explanation?: Explanation
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/score/__tests__/types.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/score/types.ts src/score/__tests__/types.test.ts
git commit -m "feat(score): introduce Confidence, ReasonCode, Explanation types

First step of the confidence-scoring overhaul per
docs/superpowers/specs/2026-05-17-confidence-scoring-design.md.
No behavior change yet — types only."
```

---

### Task 2: Create `src/score/features.ts` with ExtractionFeatures union

**Files:**
- Create: `src/score/features.ts`
- Test: `src/score/__tests__/features.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/score/__tests__/features.test.ts`:
```ts
import { describe, expectTypeOf, it } from "vitest"
import type {
  CaseFeatures,
  ConstitutionalFeatures,
  DocketFeatures,
  ExtractionFeatures,
  FederalRegisterFeatures,
  IdFeatures,
  JournalFeatures,
  NeutralFeatures,
  PublicLawFeatures,
  ShortFormCaseFeatures,
  StatuteFeatures,
  StatutesAtLargeFeatures,
  SupraFeatures,
} from "@/score/features"

describe("ExtractionFeatures discriminated union", () => {
  it("CaseFeatures has the expected shape", () => {
    const f: CaseFeatures = {
      type: "case",
      patternId: "federal-reporter",
      knownReporter: true,
      reporterAmbiguous: false,
      yearPresent: true,
      yearPlausible: true,
      caseNamePresent: true,
      courtIdentified: false,
      blankPage: false,
      metadataExpected: 7,
      metadataPopulated: 5,
    }
    expectTypeOf(f.type).toEqualTypeOf<"case">()
  })

  it("IdFeatures has the expected shape", () => {
    const f: IdFeatures = {
      type: "id",
      patternId: "id-citation",
      lowercase: false,
      hasComma: false,
      typoComma: false,
      inCitationContext: true,
    }
    expectTypeOf(f.type).toEqualTypeOf<"id">()
  })

  it("ExtractionFeatures narrows on type tag", () => {
    const f = { type: "case" } as ExtractionFeatures
    if (f.type === "case") {
      expectTypeOf(f).toMatchTypeOf<CaseFeatures>()
    }
  })

  it("all citation types have a Features variant", () => {
    // Compile-time check via discriminated-union exhaustion
    function _exhaustive(f: ExtractionFeatures): string {
      switch (f.type) {
        case "case": return f.type
        case "id": return f.type
        case "supra": return f.type
        case "shortFormCase": return f.type
        case "statute": return f.type
        case "constitutional": return f.type
        case "journal": return f.type
        case "neutral": return f.type
        case "publicLaw": return f.type
        case "federalRegister": return f.type
        case "statutesAtLarge": return f.type
        case "docket": return f.type
      }
    }
    void _exhaustive
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/score/__tests__/features.test.ts
```
Expected: FAIL — module `@/score/features` not found.

- [ ] **Step 3: Implement `src/score/features.ts`**

```ts
/**
 * ExtractionFeatures — flat records of booleans + small numbers, one shape per
 * citation type. Extractors emit these instead of doing scoring math themselves.
 */

export interface CaseFeatures {
  type: "case"
  patternId: string
  knownReporter: boolean
  reporterAmbiguous: boolean
  yearPresent: boolean
  yearPlausible: boolean
  caseNamePresent: boolean
  courtIdentified: boolean
  blankPage: boolean
  metadataExpected: number
  metadataPopulated: number
}

export interface IdFeatures {
  type: "id"
  patternId: "id-citation"
  lowercase: boolean
  hasComma: boolean
  typoComma: boolean
  inCitationContext: boolean
}

export interface SupraFeatures {
  type: "supra"
  patternId: "supra"
  partyName: boolean
  bracketed: boolean
  standalone: boolean
}

export interface ShortFormCaseFeatures {
  type: "shortFormCase"
  patternId: "short-form-case" | "bare-party-back-ref"
  knownReporter: boolean
  partyNameMatch: boolean // populated post-resolution; false at extraction time
}

export interface StatuteFeatures {
  type: "statute"
  patternId: string
  knownCode: boolean
  titlePresent: boolean
  subsectionPresent: boolean
  parseable: boolean // false → unparseable fallback path
}

export interface ConstitutionalFeatures {
  type: "constitutional"
  patternId: "us-constitution" | "state-constitution" | "bare-constitution" | "bare-article"
  hasSection: boolean
}

export interface JournalFeatures {
  type: "journal"
  patternId: "journal"
}

export interface NeutralFeatures {
  type: "neutral"
  patternId: string
}

export interface PublicLawFeatures {
  type: "publicLaw"
  patternId: "public-law"
}

export interface FederalRegisterFeatures {
  type: "federalRegister"
  patternId: "federal-register"
}

export interface StatutesAtLargeFeatures {
  type: "statutesAtLarge"
  patternId: "statutes-at-large"
}

export interface DocketFeatures {
  type: "docket"
  patternId: string
}

export type ExtractionFeatures =
  | CaseFeatures
  | IdFeatures
  | SupraFeatures
  | ShortFormCaseFeatures
  | StatuteFeatures
  | ConstitutionalFeatures
  | JournalFeatures
  | NeutralFeatures
  | PublicLawFeatures
  | FederalRegisterFeatures
  | StatutesAtLargeFeatures
  | DocketFeatures

/**
 * Resolution-axis features. Emitted by the resolver, not the extractor.
 * Used to compute axes.resolution; not part of ExtractionFeatures.
 */
export interface ResolutionFeatures {
  patternId: "id-resolution" | "supra-resolution" | "shortform-resolution"
  exactMatch: boolean
  similarity: number       // 0..1; for fuzzy-match resolvers
  windowMismatch: boolean  // id-resolution only — case-name window check failed
  inScope: boolean
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/score/__tests__/features.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/score/features.ts src/score/__tests__/features.test.ts
git commit -m "feat(score): add ExtractionFeatures discriminated union

One feature-vector shape per citation type, plus ResolutionFeatures
for the resolver. Replaces the inline scoring constants in each
extractor (migration in Phase 2)."
```

---

### Task 3: Create `src/score/weights.ts` with hand-rolled scoring weights

**Files:**
- Create: `src/score/weights.ts`
- Test: `src/score/__tests__/weights.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/score/__tests__/weights.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { CASE_WEIGHTS, getWeights, ID_WEIGHTS } from "@/score/weights"

describe("scoring weights", () => {
  it("CASE_WEIGHTS preserves the current additive structure", () => {
    // Mirror of extractCase.ts:2932-2960 deltas
    expect(CASE_WEIGHTS.base).toBe(0.2)
    expect(CASE_WEIGHTS.knownReporter).toBe(0.3)
    expect(CASE_WEIGHTS.yearPlausible).toBe(0.2)
    expect(CASE_WEIGHTS.caseNamePresent).toBe(0.15)
    expect(CASE_WEIGHTS.courtIdentified).toBe(0.1)
    expect(CASE_WEIGHTS.blankPageFloor).toBe(0.5)
  })

  it("ID_WEIGHTS preserves the current subtractive structure", () => {
    // Mirror of extractShortForms.ts:162-181 caps
    expect(ID_WEIGHTS.base).toBe(1.0)
    expect(ID_WEIGHTS.lowercase).toBe(0.85)
    expect(ID_WEIGHTS.hasComma).toBe(0.9)
    expect(ID_WEIGHTS.typoComma).toBe(0.7)
    expect(ID_WEIGHTS.notInCitationContext).toBe(0.4)
  })

  it("getWeights returns the right table per type", () => {
    expect(getWeights("case")).toBe(CASE_WEIGHTS)
    expect(getWeights("id")).toBe(ID_WEIGHTS)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/score/__tests__/weights.test.ts
```
Expected: FAIL — module `@/score/weights` not found.

- [ ] **Step 3: Implement `src/score/weights.ts`**

```ts
/**
 * Hand-rolled scoring weights per citation type. Mirror the current per-extractor
 * additive scoring; centralized here so the math lives in one place.
 *
 * Future: replace with learned LR weights (same feature vectors, weights from
 * training on labeled corpus). See spec §"Hand-rolled vs learned weights".
 */

import type { ExtractionFeatures } from "./features"

export const CASE_WEIGHTS = {
  base: 0.2,
  knownReporter: 0.3,
  reporterAmbiguous: -0.1, // soft penalty
  yearPlausible: 0.2,
  caseNamePresent: 0.15,
  courtIdentified: 0.1,
  blankPageFloor: 0.5,
} as const

export const ID_WEIGHTS = {
  // Multiplicative caps — current code uses Math.min(confidence, X) pattern
  base: 1.0,
  lowercase: 0.85,
  hasComma: 0.9,
  typoComma: 0.7,
  notInCitationContext: 0.4,
} as const

export const SUPRA_WEIGHTS = {
  partyName: 0.9,
  bracketedWithParty: 0.9,
  bracketedNoParty: 0.8,
  standalone: 0.8,
} as const

export const SHORTFORM_CASE_WEIGHTS = {
  base: 0.4,
  knownReporter: 0.3,
  barePartyBackRef: 0.85, // detectBarePartyBackReferences flat assignment
} as const

export const STATUTE_WEIGHTS = {
  // legacy path
  base: 0.5,
  knownCode: 0.3,
  unparseable: 0.3,
  // federal path
  federalBase: 0.95,
  titlePresent: 0.05,
  subsectionPresent: 0.05,
} as const

export const CONSTITUTIONAL_WEIGHTS = {
  bareArticle: 0.5,
  bareConstitution: 0.7,
  withSection: 0.95,
  default: 0.9,
} as const

export const JOURNAL_WEIGHTS = { base: 0.6 } as const
export const NEUTRAL_WEIGHTS = { base: 1.0 } as const
export const PUBLIC_LAW_WEIGHTS = { base: 0.9 } as const
export const FEDERAL_REGISTER_WEIGHTS = { base: 0.9 } as const
export const STATUTES_AT_LARGE_WEIGHTS = { base: 0.9 } as const
export const DOCKET_WEIGHTS = { base: 0.7 } as const

export const RESOLUTION_WEIGHTS = {
  // ID resolution — DocumentResolver.ts:545,637
  idExact: 1.0,
  idWindowMismatch: 0.75,
  // Supra resolution — DocumentResolver.ts:700 (similarity-based)
  supraSimilarityBase: 1.0,
  // Short-form case resolution — DocumentResolver.ts:760,768
  shortFormWithParty: 0.98,
  shortFormBare: 0.95,
} as const

type WeightsTable =
  | typeof CASE_WEIGHTS
  | typeof ID_WEIGHTS
  | typeof SUPRA_WEIGHTS
  | typeof SHORTFORM_CASE_WEIGHTS
  | typeof STATUTE_WEIGHTS
  | typeof CONSTITUTIONAL_WEIGHTS
  | typeof JOURNAL_WEIGHTS
  | typeof NEUTRAL_WEIGHTS
  | typeof PUBLIC_LAW_WEIGHTS
  | typeof FEDERAL_REGISTER_WEIGHTS
  | typeof STATUTES_AT_LARGE_WEIGHTS
  | typeof DOCKET_WEIGHTS

export function getWeights(type: ExtractionFeatures["type"]): WeightsTable {
  switch (type) {
    case "case": return CASE_WEIGHTS
    case "id": return ID_WEIGHTS
    case "supra": return SUPRA_WEIGHTS
    case "shortFormCase": return SHORTFORM_CASE_WEIGHTS
    case "statute": return STATUTE_WEIGHTS
    case "constitutional": return CONSTITUTIONAL_WEIGHTS
    case "journal": return JOURNAL_WEIGHTS
    case "neutral": return NEUTRAL_WEIGHTS
    case "publicLaw": return PUBLIC_LAW_WEIGHTS
    case "federalRegister": return FEDERAL_REGISTER_WEIGHTS
    case "statutesAtLarge": return STATUTES_AT_LARGE_WEIGHTS
    case "docket": return DOCKET_WEIGHTS
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/score/__tests__/weights.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/score/weights.ts src/score/__tests__/weights.test.ts
git commit -m "feat(score): centralize scoring weights in weights.ts

All current per-extractor scoring constants mirrored into a single
table per citation type. No behavior change — extractors don't use
this yet (Phase 2). Sets up future replacement with learned weights."
```

---

### Task 4: Create `src/score/axes.ts` with `computeAxes()`

**Files:**
- Create: `src/score/axes.ts`
- Test: `src/score/__tests__/axes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/score/__tests__/axes.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { computeAxes } from "@/score/axes"
import type { CaseFeatures, IdFeatures, ResolutionFeatures } from "@/score/features"

describe("computeAxes", () => {
  it("case with all positive signals yields high extraction + completeness", () => {
    const f: CaseFeatures = {
      type: "case", patternId: "federal-reporter",
      knownReporter: true, reporterAmbiguous: false,
      yearPresent: true, yearPlausible: true,
      caseNamePresent: true, courtIdentified: true,
      blankPage: false,
      metadataExpected: 7, metadataPopulated: 7,
    }
    const axes = computeAxes(f)
    // base 0.2 + 0.3 + 0.2 + 0.15 + 0.1 = 0.95
    expect(axes.extraction).toBeCloseTo(0.95, 2)
    expect(axes.metadata).toBeCloseTo(1.0, 2)
  })

  it("case with no signals stays near base", () => {
    const f: CaseFeatures = {
      type: "case", patternId: "state-reporter",
      knownReporter: false, reporterAmbiguous: false,
      yearPresent: false, yearPlausible: false,
      caseNamePresent: false, courtIdentified: false,
      blankPage: false,
      metadataExpected: 7, metadataPopulated: 2,
    }
    const axes = computeAxes(f)
    expect(axes.extraction).toBeCloseTo(0.2, 2)
    expect(axes.metadata).toBeCloseTo(2 / 7, 2)
  })

  it("case with blank page floors extraction at 0.5", () => {
    const f: CaseFeatures = {
      type: "case", patternId: "federal-reporter",
      knownReporter: false, reporterAmbiguous: false,
      yearPresent: false, yearPlausible: false,
      caseNamePresent: false, courtIdentified: false,
      blankPage: true,
      metadataExpected: 7, metadataPopulated: 3,
    }
    const axes = computeAxes(f)
    expect(axes.extraction).toBeCloseTo(0.5, 2)
  })

  it("case with ambiguous reporter applies soft penalty", () => {
    const base: CaseFeatures = {
      type: "case", patternId: "federal-reporter",
      knownReporter: true, reporterAmbiguous: true,
      yearPresent: true, yearPlausible: true,
      caseNamePresent: false, courtIdentified: false,
      blankPage: false,
      metadataExpected: 7, metadataPopulated: 4,
    }
    const axes = computeAxes(base)
    // 0.2 + 0.3 - 0.1 + 0.2 = 0.6
    expect(axes.extraction).toBeCloseTo(0.6, 2)
  })

  it("id with lowercase + comma applies multiplicative caps", () => {
    const f: IdFeatures = {
      type: "id", patternId: "id-citation",
      lowercase: true, hasComma: true, typoComma: false,
      inCitationContext: true,
    }
    const axes = computeAxes(f)
    // min(1.0, 0.85, 0.9) = 0.85
    expect(axes.extraction).toBeCloseTo(0.85, 2)
    // metadata always 1.0 for short-forms (no expected fields)
    expect(axes.metadata).toBe(1.0)
  })

  it("id mid-sentence drops extraction to 0.4", () => {
    const f: IdFeatures = {
      type: "id", patternId: "id-citation",
      lowercase: false, hasComma: false, typoComma: false,
      inCitationContext: false,
    }
    const axes = computeAxes(f)
    expect(axes.extraction).toBeCloseTo(0.4, 2)
  })

  it("resolution axis computed from ResolutionFeatures (id exact match)", () => {
    const r: ResolutionFeatures = {
      patternId: "id-resolution",
      exactMatch: true,
      similarity: 1.0,
      windowMismatch: false,
      inScope: true,
    }
    const axes = computeAxes({
      type: "id", patternId: "id-citation",
      lowercase: false, hasComma: false, typoComma: false, inCitationContext: true,
    }, r)
    expect(axes.resolution).toBe(1.0)
  })

  it("resolution axis drops to 0.75 with window mismatch", () => {
    const r: ResolutionFeatures = {
      patternId: "id-resolution",
      exactMatch: true,
      similarity: 1.0,
      windowMismatch: true,
      inScope: true,
    }
    const axes = computeAxes({
      type: "id", patternId: "id-citation",
      lowercase: false, hasComma: false, typoComma: false, inCitationContext: true,
    }, r)
    expect(axes.resolution).toBe(0.75)
  })

  it("supra resolution uses similarity directly", () => {
    const r: ResolutionFeatures = {
      patternId: "supra-resolution",
      exactMatch: false,
      similarity: 0.87,
      windowMismatch: false,
      inScope: true,
    }
    const axes = computeAxes({
      type: "supra", patternId: "supra",
      partyName: true, bracketed: false, standalone: false,
    }, r)
    expect(axes.resolution).toBeCloseTo(0.87, 2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/score/__tests__/axes.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/score/axes.ts`**

```ts
/**
 * computeAxes — maps ExtractionFeatures (+ optional ResolutionFeatures) to
 * the three axes of the Confidence struct. Pure function; no I/O.
 *
 * - extraction: P(this is a real citation), per pattern-id (uncalibrated here).
 * - metadata: fraction of expected fields populated.
 * - resolution: only when ResolutionFeatures provided.
 */

import type { ExtractionFeatures, ResolutionFeatures } from "./features"
import {
  CASE_WEIGHTS,
  CONSTITUTIONAL_WEIGHTS,
  DOCKET_WEIGHTS,
  FEDERAL_REGISTER_WEIGHTS,
  ID_WEIGHTS,
  JOURNAL_WEIGHTS,
  NEUTRAL_WEIGHTS,
  PUBLIC_LAW_WEIGHTS,
  RESOLUTION_WEIGHTS,
  SHORTFORM_CASE_WEIGHTS,
  STATUTE_WEIGHTS,
  STATUTES_AT_LARGE_WEIGHTS,
  SUPRA_WEIGHTS,
} from "./weights"

export interface Axes {
  extraction: number
  metadata: number
  resolution?: number
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const round2 = (x: number) => Math.round(x * 100) / 100

function caseExtraction(f: Extract<ExtractionFeatures, { type: "case" }>): number {
  let s = CASE_WEIGHTS.base
  if (f.knownReporter) s += CASE_WEIGHTS.knownReporter
  if (f.reporterAmbiguous) s += CASE_WEIGHTS.reporterAmbiguous
  if (f.yearPlausible) s += CASE_WEIGHTS.yearPlausible
  if (f.caseNamePresent) s += CASE_WEIGHTS.caseNamePresent
  if (f.courtIdentified) s += CASE_WEIGHTS.courtIdentified
  s = clamp01(s)
  if (f.blankPage) s = Math.max(s, CASE_WEIGHTS.blankPageFloor)
  return round2(s)
}

function idExtraction(f: Extract<ExtractionFeatures, { type: "id" }>): number {
  let s = ID_WEIGHTS.base
  if (f.lowercase) s = Math.min(s, ID_WEIGHTS.lowercase)
  if (f.hasComma) s = Math.min(s, ID_WEIGHTS.hasComma)
  if (f.typoComma) s = Math.min(s, ID_WEIGHTS.typoComma)
  if (!f.inCitationContext) s = Math.min(s, ID_WEIGHTS.notInCitationContext)
  return round2(s)
}

function supraExtraction(f: Extract<ExtractionFeatures, { type: "supra" }>): number {
  if (f.bracketed && f.partyName) return SUPRA_WEIGHTS.bracketedWithParty
  if (f.bracketed) return SUPRA_WEIGHTS.bracketedNoParty
  if (f.partyName) return SUPRA_WEIGHTS.partyName
  return SUPRA_WEIGHTS.standalone
}

function shortFormCaseExtraction(
  f: Extract<ExtractionFeatures, { type: "shortFormCase" }>,
): number {
  if (f.patternId === "bare-party-back-ref") return SHORTFORM_CASE_WEIGHTS.barePartyBackRef
  let s = SHORTFORM_CASE_WEIGHTS.base
  if (f.knownReporter) s += SHORTFORM_CASE_WEIGHTS.knownReporter
  return round2(clamp01(s))
}

function statuteExtraction(f: Extract<ExtractionFeatures, { type: "statute" }>): number {
  if (!f.parseable) return STATUTE_WEIGHTS.unparseable
  if (f.patternId === "usc" || f.patternId === "cfr" || f.patternId === "irc") {
    let s = STATUTE_WEIGHTS.federalBase
    if (f.titlePresent) s += STATUTE_WEIGHTS.titlePresent
    if (f.subsectionPresent) s += STATUTE_WEIGHTS.subsectionPresent
    return round2(clamp01(s))
  }
  let s = STATUTE_WEIGHTS.base
  if (f.knownCode) s += STATUTE_WEIGHTS.knownCode
  return round2(clamp01(s))
}

function constitutionalExtraction(
  f: Extract<ExtractionFeatures, { type: "constitutional" }>,
): number {
  if (f.patternId === "bare-article") return CONSTITUTIONAL_WEIGHTS.bareArticle
  if (f.patternId === "bare-constitution") return CONSTITUTIONAL_WEIGHTS.bareConstitution
  if (f.hasSection) return CONSTITUTIONAL_WEIGHTS.withSection
  return CONSTITUTIONAL_WEIGHTS.default
}

function extractionAxis(f: ExtractionFeatures): number {
  switch (f.type) {
    case "case": return caseExtraction(f)
    case "id": return idExtraction(f)
    case "supra": return supraExtraction(f)
    case "shortFormCase": return shortFormCaseExtraction(f)
    case "statute": return statuteExtraction(f)
    case "constitutional": return constitutionalExtraction(f)
    case "journal": return JOURNAL_WEIGHTS.base
    case "neutral": return NEUTRAL_WEIGHTS.base
    case "publicLaw": return PUBLIC_LAW_WEIGHTS.base
    case "federalRegister": return FEDERAL_REGISTER_WEIGHTS.base
    case "statutesAtLarge": return STATUTES_AT_LARGE_WEIGHTS.base
    case "docket": return DOCKET_WEIGHTS.base
  }
}

function metadataAxis(f: ExtractionFeatures): number {
  if (f.type === "case") {
    if (f.metadataExpected === 0) return 1.0
    return round2(f.metadataPopulated / f.metadataExpected)
  }
  // Short-forms and flat-confidence types have no metadata signal of their own.
  return 1.0
}

function resolutionAxis(r: ResolutionFeatures): number {
  if (r.patternId === "id-resolution") {
    if (r.windowMismatch) return RESOLUTION_WEIGHTS.idWindowMismatch
    return RESOLUTION_WEIGHTS.idExact
  }
  if (r.patternId === "supra-resolution") {
    // Resolver's similarity is already a [0..1] score; use directly.
    return round2(r.similarity)
  }
  // shortform-resolution
  return r.similarity > 0 ? RESOLUTION_WEIGHTS.shortFormWithParty : RESOLUTION_WEIGHTS.shortFormBare
}

export function computeAxes(f: ExtractionFeatures, r?: ResolutionFeatures): Axes {
  const axes: Axes = {
    extraction: extractionAxis(f),
    metadata: metadataAxis(f),
  }
  if (r) axes.resolution = resolutionAxis(r)
  return axes
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/score/__tests__/axes.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/score/axes.ts src/score/__tests__/axes.test.ts
git commit -m "feat(score): implement computeAxes for extraction/metadata/resolution

Pure function mapping ExtractionFeatures (+ optional ResolutionFeatures)
to the three confidence axes. Mirrors current per-extractor scoring math
exactly so Phase 2 migration is behavior-preserving."
```

---

### Task 5: Create `src/score/reasons.ts` with `collectReasonCodes()`

**Files:**
- Create: `src/score/reasons.ts`
- Test: `src/score/__tests__/reasons.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/score/__tests__/reasons.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import type { CaseFeatures, IdFeatures, ResolutionFeatures } from "@/score/features"
import { collectReasonCodes } from "@/score/reasons"

describe("collectReasonCodes", () => {
  it("emits positive case reasons for well-populated citation", () => {
    const f: CaseFeatures = {
      type: "case", patternId: "federal-reporter",
      knownReporter: true, reporterAmbiguous: false,
      yearPresent: true, yearPlausible: true,
      caseNamePresent: true, courtIdentified: true,
      blankPage: false,
      metadataExpected: 7, metadataPopulated: 7,
    }
    const reasons = collectReasonCodes(f)
    expect(reasons).toContain("known_reporter")
    expect(reasons).toContain("year_plausible")
    expect(reasons).toContain("case_name_present")
    expect(reasons).toContain("court_identified")
  })

  it("emits negative reasons for missing metadata", () => {
    const f: CaseFeatures = {
      type: "case", patternId: "state-reporter",
      knownReporter: false, reporterAmbiguous: false,
      yearPresent: false, yearPlausible: false,
      caseNamePresent: false, courtIdentified: false,
      blankPage: false,
      metadataExpected: 7, metadataPopulated: 2,
    }
    const reasons = collectReasonCodes(f)
    expect(reasons).toContain("reporter_unknown")
    expect(reasons).toContain("missing_year")
    expect(reasons).toContain("missing_case_name")
    expect(reasons).toContain("missing_court")
  })

  it("emits ambiguous when reporter has multiple matches", () => {
    const f: CaseFeatures = {
      type: "case", patternId: "state-reporter",
      knownReporter: true, reporterAmbiguous: true,
      yearPresent: true, yearPlausible: true,
      caseNamePresent: false, courtIdentified: false,
      blankPage: false,
      metadataExpected: 7, metadataPopulated: 4,
    }
    expect(collectReasonCodes(f)).toContain("reporter_ambiguous")
  })

  it("emits blank_page reason when blank page detected", () => {
    const f: CaseFeatures = {
      type: "case", patternId: "federal-reporter",
      knownReporter: true, reporterAmbiguous: false,
      yearPresent: true, yearPlausible: true,
      caseNamePresent: false, courtIdentified: false,
      blankPage: true,
      metadataExpected: 7, metadataPopulated: 3,
    }
    expect(collectReasonCodes(f)).toContain("blank_page")
  })

  it("emits id-specific punctuation reasons", () => {
    const f: IdFeatures = {
      type: "id", patternId: "id-citation",
      lowercase: true, hasComma: false, typoComma: true,
      inCitationContext: false,
    }
    const reasons = collectReasonCodes(f)
    expect(reasons).toContain("lowercase_id")
    expect(reasons).toContain("typo_punctuation")
    expect(reasons).toContain("mid_sentence_id")
  })

  it("appends resolution reasons when ResolutionFeatures provided", () => {
    const r: ResolutionFeatures = {
      patternId: "id-resolution",
      exactMatch: true,
      similarity: 1.0,
      windowMismatch: false,
      inScope: true,
    }
    const f: IdFeatures = {
      type: "id", patternId: "id-citation",
      lowercase: false, hasComma: false, typoComma: false, inCitationContext: true,
    }
    expect(collectReasonCodes(f, r)).toContain("exact_antecedent_match")
  })

  it("emits ambiguous_id_window when resolver flagged window mismatch", () => {
    const r: ResolutionFeatures = {
      patternId: "id-resolution",
      exactMatch: true,
      similarity: 1.0,
      windowMismatch: true,
      inScope: true,
    }
    const f: IdFeatures = {
      type: "id", patternId: "id-citation",
      lowercase: false, hasComma: false, typoComma: false, inCitationContext: true,
    }
    expect(collectReasonCodes(f, r)).toContain("ambiguous_id_window")
  })

  it("returns empty array (not null) when no reasons apply", () => {
    const f: CaseFeatures = {
      type: "case", patternId: "federal-reporter",
      knownReporter: false, reporterAmbiguous: false,
      yearPresent: true, yearPlausible: true, // year present but not the "year_plausible" feature emission
      caseNamePresent: false, courtIdentified: false,
      blankPage: false,
      metadataExpected: 0, metadataPopulated: 0,
    }
    const reasons = collectReasonCodes(f)
    expect(Array.isArray(reasons)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/score/__tests__/reasons.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/score/reasons.ts`**

```ts
import type { ExtractionFeatures, ResolutionFeatures } from "./features"
import type { ReasonCode } from "./types"

function caseReasons(f: Extract<ExtractionFeatures, { type: "case" }>): ReasonCode[] {
  const r: ReasonCode[] = []
  if (f.knownReporter) r.push("known_reporter")
  if (!f.knownReporter) r.push("reporter_unknown")
  if (f.reporterAmbiguous) r.push("reporter_ambiguous")
  if (f.yearPlausible) r.push("year_plausible")
  if (!f.yearPresent) r.push("missing_year")
  if (f.caseNamePresent) r.push("case_name_present")
  if (!f.caseNamePresent) r.push("missing_case_name")
  if (f.courtIdentified) r.push("court_identified")
  if (!f.courtIdentified) r.push("missing_court")
  if (f.blankPage) r.push("blank_page")
  return r
}

function idReasons(f: Extract<ExtractionFeatures, { type: "id" }>): ReasonCode[] {
  const r: ReasonCode[] = []
  if (f.lowercase) r.push("lowercase_id")
  if (f.typoComma) r.push("typo_punctuation")
  if (!f.inCitationContext) r.push("mid_sentence_id")
  return r
}

function extractionReasons(f: ExtractionFeatures): ReasonCode[] {
  switch (f.type) {
    case "case": return caseReasons(f)
    case "id": return idReasons(f)
    case "supra": return []
    case "shortFormCase": return f.knownReporter ? ["known_reporter"] : ["reporter_unknown"]
    case "statute": return []
    case "constitutional": return []
    case "journal": return []
    case "neutral": return []
    case "publicLaw": return []
    case "federalRegister": return []
    case "statutesAtLarge": return []
    case "docket": return []
  }
}

function resolutionReasons(r: ResolutionFeatures): ReasonCode[] {
  const out: ReasonCode[] = []
  if (!r.inScope) out.push("no_antecedent_in_scope")
  if (r.exactMatch) out.push("exact_antecedent_match")
  if (!r.exactMatch && r.similarity < 1.0 && r.similarity > 0) out.push("fuzzy_party_match")
  if (r.windowMismatch) out.push("ambiguous_id_window")
  return out
}

export function collectReasonCodes(
  features: ExtractionFeatures,
  resolution?: ResolutionFeatures,
): ReasonCode[] {
  return [...extractionReasons(features), ...(resolution ? resolutionReasons(resolution) : [])]
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/score/__tests__/reasons.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/score/reasons.ts src/score/__tests__/reasons.test.ts
git commit -m "feat(score): collectReasonCodes derives machine-readable reasons

Each reason code corresponds to a documented scoring delta and serves
as the link between warnings (human) and confidence (machine)."
```

---

### Task 6: Create `src/score/level.ts` with `deriveLevel()`

**Files:**
- Create: `src/score/level.ts`
- Test: `src/score/__tests__/level.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/score/__tests__/level.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { deriveLevel } from "@/score/level"

describe("deriveLevel", () => {
  it("≥0.95 → certain", () => {
    expect(deriveLevel(0.95)).toBe("certain")
    expect(deriveLevel(1.0)).toBe("certain")
  })
  it("≥0.80 and <0.95 → high", () => {
    expect(deriveLevel(0.80)).toBe("high")
    expect(deriveLevel(0.94)).toBe("high")
  })
  it("≥0.50 and <0.80 → medium", () => {
    expect(deriveLevel(0.50)).toBe("medium")
    expect(deriveLevel(0.79)).toBe("medium")
  })
  it("<0.50 → low", () => {
    expect(deriveLevel(0.49)).toBe("low")
    expect(deriveLevel(0)).toBe("low")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/score/__tests__/level.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/score/level.ts`**

```ts
import type { ConfidenceLevel } from "./types"

export function deriveLevel(score: number): ConfidenceLevel {
  if (score >= 0.95) return "certain"
  if (score >= 0.80) return "high"
  if (score >= 0.50) return "medium"
  return "low"
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/score/__tests__/level.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/score/level.ts src/score/__tests__/level.test.ts
git commit -m "feat(score): deriveLevel maps score to categorical bucket"
```

---

### Task 7: Create `src/score/calibrate.ts` with identity fallback

**Files:**
- Create: `src/score/calibrate.ts`
- Test: `src/score/__tests__/calibrate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/score/__tests__/calibrate.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { calibrate, getCalibrationTable } from "@/score/calibrate"

describe("calibrate", () => {
  it("returns raw score unchanged for unknown pattern (identity fallback)", () => {
    expect(calibrate(0.42, "nonexistent-pattern")).toBe(0.42)
    expect(calibrate(1.0, "nonexistent-pattern")).toBe(1.0)
    expect(calibrate(0, "nonexistent-pattern")).toBe(0)
  })

  it("getCalibrationTable returns empty calibrators in Phase 1", () => {
    const t = getCalibrationTable()
    expect(t.scorerVersion).toBe("1.0")
    expect(t.calibrators).toEqual({})
  })

  it("respects calibration table when set", () => {
    // Inject a fake calibrator via internal helper
    const t = getCalibrationTable()
    t.calibrators["federal-reporter"] = {
      kind: "histogram",
      bins: [
        { min: 0, max: 0.5, calibrated: 0.4 },
        { min: 0.5, max: 1.0, calibrated: 0.9 },
      ],
    }
    expect(calibrate(0.3, "federal-reporter")).toBe(0.4)
    expect(calibrate(0.7, "federal-reporter")).toBe(0.9)
    // cleanup
    delete t.calibrators["federal-reporter"]
  })

  it("clamps to [0, 1] always", () => {
    expect(calibrate(1.5, "x")).toBe(1.0)
    expect(calibrate(-0.5, "x")).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/score/__tests__/calibrate.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/score/calibrate.ts`**

```ts
/**
 * Calibration shell — maps raw extraction-axis scores to calibrated probabilities
 * per pattern-id. Phase 1: empty table, all patterns get identity calibration.
 * Phase 3 (separate plan) populates the table from labeled-corpus fitting.
 */

export interface HistogramBin {
  min: number
  max: number
  calibrated: number
}

export interface HistogramCalibrator {
  kind: "histogram"
  bins: HistogramBin[]
}

export interface PlattCalibrator {
  kind: "platt"
  A: number
  B: number
}

export interface IdentityCalibrator {
  kind: "identity"
}

export type Calibrator = HistogramCalibrator | PlattCalibrator | IdentityCalibrator

export interface CalibrationTable {
  scorerVersion: string
  calibrators: Record<string, Calibrator>
}

const TABLE: CalibrationTable = {
  scorerVersion: "1.0",
  calibrators: {},
}

export function getCalibrationTable(): CalibrationTable {
  return TABLE
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

function applyHistogram(rawScore: number, c: HistogramCalibrator): number {
  for (const bin of c.bins) {
    if (rawScore <= bin.max) return bin.calibrated
  }
  return c.bins[c.bins.length - 1]?.calibrated ?? rawScore
}

function applyPlatt(rawScore: number, c: PlattCalibrator): number {
  return 1 / (1 + Math.exp(c.A * rawScore + c.B))
}

export function calibrate(rawScore: number, patternId: string): number {
  const c = TABLE.calibrators[patternId]
  if (!c || c.kind === "identity") return clamp01(rawScore)
  if (c.kind === "histogram") return clamp01(applyHistogram(rawScore, c))
  return clamp01(applyPlatt(rawScore, c))
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/score/__tests__/calibrate.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/score/calibrate.ts src/score/__tests__/calibrate.test.ts
git commit -m "feat(score): calibrate() with identity fallback for Phase 1

Calibration table is empty in Phase 1 — every pattern gets identity
calibration. Phase 3 will populate it from labeled-corpus fitting.
Supports histogram-binning and Platt calibrators when present."
```

---

### Task 8: Create `src/score/scorer.ts` orchestrator

**Files:**
- Create: `src/score/scorer.ts`
- Create: `src/score/index.ts`
- Test: `src/score/__tests__/scorer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/score/__tests__/scorer.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import type { CaseFeatures, IdFeatures, ResolutionFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"

describe("scoreCitation", () => {
  it("produces full Confidence struct for well-populated case", () => {
    const f: CaseFeatures = {
      type: "case", patternId: "federal-reporter",
      knownReporter: true, reporterAmbiguous: false,
      yearPresent: true, yearPlausible: true,
      caseNamePresent: true, courtIdentified: true,
      blankPage: false,
      metadataExpected: 7, metadataPopulated: 7,
    }
    const c = scoreCitation(f)
    expect(c.axes.extraction).toBeCloseTo(0.95, 2)
    expect(c.axes.metadata).toBeCloseTo(1.0, 2)
    expect(c.axes.resolution).toBeUndefined()
    // score = axes.extraction for full citations
    expect(c.score).toBeCloseTo(0.95, 2)
    expect(c.level).toBe("certain")
    expect(c.reasons).toContain("known_reporter")
  })

  it("score = extraction × resolution for resolved short-forms", () => {
    const f: IdFeatures = {
      type: "id", patternId: "id-citation",
      lowercase: false, hasComma: false, typoComma: false, inCitationContext: true,
    }
    const r: ResolutionFeatures = {
      patternId: "id-resolution",
      exactMatch: true, similarity: 1.0,
      windowMismatch: true, // forces resolution to 0.75
      inScope: true,
    }
    const c = scoreCitation(f, r)
    expect(c.axes.extraction).toBeCloseTo(1.0, 2)
    expect(c.axes.resolution).toBe(0.75)
    expect(c.score).toBeCloseTo(0.75, 2) // 1.0 × 0.75
  })

  it("omits explanation when not requested", () => {
    const f: CaseFeatures = {
      type: "case", patternId: "federal-reporter",
      knownReporter: true, reporterAmbiguous: false,
      yearPresent: true, yearPlausible: true,
      caseNamePresent: false, courtIdentified: false,
      blankPage: false,
      metadataExpected: 7, metadataPopulated: 3,
    }
    const c = scoreCitation(f)
    expect(c.explanation).toBeUndefined()
  })

  it("populates explanation when requested", () => {
    const f: CaseFeatures = {
      type: "case", patternId: "federal-reporter",
      knownReporter: true, reporterAmbiguous: false,
      yearPresent: true, yearPlausible: true,
      caseNamePresent: true, courtIdentified: true,
      blankPage: false,
      metadataExpected: 7, metadataPopulated: 7,
    }
    const c = scoreCitation(f, undefined, { explain: true })
    expect(c.explanation).toBeDefined()
    expect(c.explanation?.value).toBeCloseTo(c.score, 2)
    expect(c.explanation?.details?.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/score/__tests__/scorer.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/score/scorer.ts`**

```ts
/**
 * scoreCitation — orchestrator that turns ExtractionFeatures (+ optional
 * ResolutionFeatures) into a complete Confidence struct.
 *
 *   features → axes → calibrated score → level → reasons
 */

import { computeAxes } from "./axes"
import { calibrate } from "./calibrate"
import type { ExtractionFeatures, ResolutionFeatures } from "./features"
import { deriveLevel } from "./level"
import { collectReasonCodes } from "./reasons"
import type { Confidence, Explanation } from "./types"

export interface ScoreOptions {
  explain?: boolean
}

function compositeScore(extraction: number, resolution: number | undefined): number {
  if (resolution === undefined) return extraction
  return Math.round(extraction * resolution * 100) / 100
}

function buildExplanation(
  f: ExtractionFeatures,
  r: ResolutionFeatures | undefined,
  axes: { extraction: number; metadata: number; resolution?: number },
  score: number,
): Explanation {
  const details: Explanation[] = [
    {
      value: axes.extraction,
      description: `extraction axis (pattern: ${f.patternId})`,
    },
    {
      value: axes.metadata,
      description: f.type === "case"
        ? `metadata axis (${(f as Extract<ExtractionFeatures, { type: "case" }>).metadataPopulated}/${(f as Extract<ExtractionFeatures, { type: "case" }>).metadataExpected} fields populated)`
        : `metadata axis`,
    },
  ]
  if (r && axes.resolution !== undefined) {
    details.push({
      value: axes.resolution,
      description: `resolution axis (pattern: ${r.patternId}, similarity=${r.similarity.toFixed(2)}${r.windowMismatch ? ", window-mismatch" : ""})`,
    })
  }
  return {
    value: score,
    description: `composite confidence for ${f.type}`,
    details,
  }
}

export function scoreCitation(
  features: ExtractionFeatures,
  resolution?: ResolutionFeatures,
  options: ScoreOptions = {},
): Confidence {
  const axes = computeAxes(features, resolution)
  const calibratedExtraction = calibrate(axes.extraction, features.patternId)
  const score = compositeScore(calibratedExtraction, axes.resolution)
  const reasons = collectReasonCodes(features, resolution)
  const confidence: Confidence = {
    score,
    level: deriveLevel(score),
    axes: { ...axes, extraction: calibratedExtraction },
    reasons,
  }
  if (options.explain) {
    confidence.explanation = buildExplanation(features, resolution, confidence.axes, score)
  }
  return confidence
}
```

- [ ] **Step 4: Create `src/score/index.ts`**

```ts
export type { Axes } from "./axes"
export { computeAxes } from "./axes"
export { calibrate, getCalibrationTable } from "./calibrate"
export type { Calibrator, CalibrationTable, HistogramBin, HistogramCalibrator, IdentityCalibrator, PlattCalibrator } from "./calibrate"
export type {
  CaseFeatures, ConstitutionalFeatures, DocketFeatures, ExtractionFeatures,
  FederalRegisterFeatures, IdFeatures, JournalFeatures, NeutralFeatures,
  PublicLawFeatures, ResolutionFeatures, ShortFormCaseFeatures, StatuteFeatures,
  StatutesAtLargeFeatures, SupraFeatures,
} from "./features"
export { deriveLevel } from "./level"
export { collectReasonCodes } from "./reasons"
export { scoreCitation } from "./scorer"
export type { ScoreOptions } from "./scorer"
export type { Confidence, ConfidenceLevel, Explanation, ReasonCode } from "./types"
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm exec vitest run src/score/__tests__/scorer.test.ts
```
Expected: PASS

- [ ] **Step 6: Run full test suite to confirm no regressions**

```bash
pnpm exec vitest run
```
Expected: all tests pass (Phase 1 hasn't touched extractors yet).

- [ ] **Step 7: Commit**

```bash
git add src/score/scorer.ts src/score/index.ts src/score/__tests__/scorer.test.ts
git commit -m "feat(score): scoreCitation orchestrator + barrel exports

End of Phase 1 — full Confidence struct can be built from features.
No extractor uses this yet (Phase 2 migrates them)."
```

---

### Task 9: Build raw-ECE eval harness baseline

**Files:**
- Create: `scripts/eval/rawEce.ts`
- Create: `tests/calibration/rawEce.test.ts`
- Modify: `package.json` (add `eval:raw-ece` script)

- [ ] **Step 1: Write the failing test**

Create `tests/calibration/rawEce.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { computeEce, matchPredictionsToGold } from "@/score/eval"
import type { Citation } from "@/types/citation"

describe("computeEce", () => {
  it("returns 0 for perfectly-calibrated predictions", () => {
    const samples = [
      { score: 0.1, correct: false }, { score: 0.1, correct: false },
      { score: 0.5, correct: true }, { score: 0.5, correct: false },
      { score: 0.9, correct: true }, { score: 0.9, correct: true },
    ]
    expect(computeEce(samples, 3)).toBeCloseTo(0.05, 1) // very small for tiny sample
  })

  it("returns high ECE for badly-calibrated predictions", () => {
    // Predicted 0.9 everywhere; actual precision 0.0
    const samples = Array(10).fill({ score: 0.9, correct: false })
    expect(computeEce(samples, 3)).toBeCloseTo(0.9, 1)
  })

  it("returns 0 for empty input", () => {
    expect(computeEce([], 10)).toBe(0)
  })
})

describe("matchPredictionsToGold", () => {
  it("matches when IoU >= 0.8 and type matches", () => {
    const pred = {
      type: "case",
      span: { originalStart: 10, originalEnd: 30, cleanStart: 10, cleanEnd: 30 },
    } as Citation
    const gold = [{ spanStart: 10, spanEnd: 30, type: "case" as const }]
    expect(matchPredictionsToGold([pred], gold)[0].correct).toBe(true)
  })

  it("does not match when type differs even with full overlap", () => {
    const pred = {
      type: "case",
      span: { originalStart: 10, originalEnd: 30, cleanStart: 10, cleanEnd: 30 },
    } as Citation
    const gold = [{ spanStart: 10, spanEnd: 30, type: "statute" as const }]
    expect(matchPredictionsToGold([pred], gold)[0].correct).toBe(false)
  })

  it("does not match when IoU < 0.8", () => {
    const pred = {
      type: "case",
      span: { originalStart: 10, originalEnd: 50, cleanStart: 10, cleanEnd: 50 },
    } as Citation
    // pred 10..50, gold 30..70 → intersect 30..50 = 20; union 10..70 = 60; IoU = 0.33
    const gold = [{ spanStart: 30, spanEnd: 70, type: "case" as const }]
    expect(matchPredictionsToGold([pred], gold)[0].correct).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run tests/calibration/rawEce.test.ts
```
Expected: FAIL — module `@/score/eval` not found.

- [ ] **Step 3: Implement `src/score/eval.ts`**

Create `src/score/eval.ts`:
```ts
/**
 * Evaluation utilities — ECE computation and gold-match helpers.
 * Used by the calibration build script (Phase 3) and the raw-ECE harness (Phase 1).
 */

import type { Citation } from "@/types/citation"

export interface GoldCitation {
  spanStart: number
  spanEnd: number
  type: Citation["type"]
}

export interface MatchedSample {
  prediction: Citation
  correct: boolean
}

function iou(a: { start: number; end: number }, b: { start: number; end: number }): number {
  const intersect = Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start))
  const union = Math.max(a.end, b.end) - Math.min(a.start, b.start)
  return union === 0 ? 0 : intersect / union
}

export function matchPredictionsToGold(
  predictions: Citation[],
  gold: GoldCitation[],
  iouThreshold = 0.8,
): MatchedSample[] {
  return predictions.map((p) => {
    const predSpan = { start: p.span.originalStart, end: p.span.originalEnd }
    const correct = gold.some((g) => {
      if (g.type !== p.type) return false
      return iou(predSpan, { start: g.spanStart, end: g.spanEnd }) >= iouThreshold
    })
    return { prediction: p, correct }
  })
}

export interface EceSample {
  score: number
  correct: boolean
}

export function computeEce(samples: EceSample[], nBins = 10): number {
  if (samples.length === 0) return 0
  const sorted = [...samples].sort((a, b) => a.score - b.score)
  const binSize = Math.ceil(sorted.length / nBins)
  let totalGap = 0
  let totalWeight = 0
  for (let i = 0; i < sorted.length; i += binSize) {
    const chunk = sorted.slice(i, i + binSize)
    if (chunk.length === 0) continue
    const meanScore = chunk.reduce((s, x) => s + x.score, 0) / chunk.length
    const acc = chunk.filter((x) => x.correct).length / chunk.length
    totalGap += chunk.length * Math.abs(meanScore - acc)
    totalWeight += chunk.length
  }
  return totalWeight === 0 ? 0 : totalGap / totalWeight
}
```

Update `src/score/index.ts` to re-export:
```ts
// add to the existing barrel
export { computeEce, matchPredictionsToGold } from "./eval"
export type { EceSample, GoldCitation, MatchedSample } from "./eval"
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run tests/calibration/rawEce.test.ts
```
Expected: PASS

- [ ] **Step 5: Implement `scripts/eval/rawEce.ts`**

Create `scripts/eval/rawEce.ts`:
```ts
/**
 * Reports raw (uncalibrated) ECE per pattern from the labeled test corpora.
 * Run via `pnpm eval:raw-ece`. Provides the baseline that Phase 3 calibration
 * is supposed to improve.
 *
 * NOTE: This works in Phase 1 by reading `c.confidence` (the legacy number).
 * Phase 2 will need to update it to read `c.confidence.score`.
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { extractCitations } from "@/extract/extractCitations"
import { computeEce, type EceSample, matchPredictionsToGold } from "@/score/eval"

interface CorpusSample {
  id?: string
  text: string
  expected?: Array<{
    spanStart?: number
    spanEnd?: number
    type?: string
    [k: string]: unknown
  }>
}

function loadCorpus(path: string): CorpusSample[] {
  const raw = JSON.parse(readFileSync(resolve(path), "utf-8")) as
    | CorpusSample[]
    | { samples: CorpusSample[] }
  return Array.isArray(raw) ? raw : raw.samples ?? []
}

function main() {
  const corpora = [
    "tests/fixtures/golden-corpus.json",
    "tests/fixtures/expanded-corpus.json",
    "tests/fixtures/thorny-corpus.json",
    "tests/fixtures/statute-corpus.json",
  ]
  const perPattern = new Map<string, EceSample[]>()
  let totalSamples = 0

  for (const path of corpora) {
    const samples = loadCorpus(path)
    for (const sample of samples) {
      if (!sample.expected || !sample.text) continue
      const gold = sample.expected
        .filter((e) => typeof e.spanStart === "number" && typeof e.spanEnd === "number" && typeof e.type === "string")
        .map((e) => ({ spanStart: e.spanStart!, spanEnd: e.spanEnd!, type: e.type as ReturnType<typeof extractCitations>[number]["type"] }))
      if (gold.length === 0) continue
      const preds = extractCitations(sample.text)
      const matched = matchPredictionsToGold(preds, gold)
      for (const m of matched) {
        const patternId = (m.prediction as { patternsChecked?: number; type: string }).type
        // Phase 1: read legacy number field
        const score = (m.prediction as unknown as { confidence: number }).confidence
        if (!perPattern.has(patternId)) perPattern.set(patternId, [])
        perPattern.get(patternId)!.push({ score, correct: m.correct })
        totalSamples++
      }
    }
  }

  console.log(`\n=== Raw ECE (uncalibrated) — ${totalSamples} samples ===\n`)
  const rows: Array<{ pattern: string; n: number; ece: number }> = []
  for (const [pattern, samples] of perPattern) {
    rows.push({ pattern, n: samples.length, ece: computeEce(samples, Math.min(10, samples.length)) })
  }
  rows.sort((a, b) => b.n - a.n)
  console.log("Pattern               N    ECE")
  console.log("-".repeat(40))
  for (const r of rows) {
    console.log(`${r.pattern.padEnd(20)} ${String(r.n).padStart(4)}   ${r.ece.toFixed(3)}`)
  }
  const allSamples = rows.flatMap((r) => perPattern.get(r.pattern)!)
  console.log("-".repeat(40))
  console.log(`OVERALL              ${String(allSamples.length).padStart(4)}   ${computeEce(allSamples, 10).toFixed(3)}`)
}

main()
```

- [ ] **Step 6: Add npm script to `package.json`**

Modify the `"scripts"` section to add:
```json
"eval:raw-ece": "tsx scripts/eval/rawEce.ts"
```

Check that `tsx` is already a dev dependency:
```bash
grep -E '"tsx"' package.json
```
If not present, the engineer should add it: `pnpm add -D tsx`.

- [ ] **Step 7: Run the harness**

```bash
pnpm eval:raw-ece
```
Expected: prints per-pattern ECE table. Exact numbers depend on corpus; this is the BASELINE that Phase 3 will improve. Sample expected output:
```
=== Raw ECE (uncalibrated) — ~320 samples ===

Pattern               N    ECE
----------------------------------------
case                 180   0.142
statute               45   0.097
id                    30   0.058
...
----------------------------------------
OVERALL              320   0.116
```

- [ ] **Step 8: Commit**

```bash
git add src/score/eval.ts src/score/index.ts scripts/eval/rawEce.ts tests/calibration/rawEce.test.ts package.json
git commit -m "feat(score): raw-ECE eval harness for baseline measurement

End of Phase 1. \`pnpm eval:raw-ece\` reports per-pattern ECE from
labeled corpora using the current (uncalibrated) confidence numbers.
Phase 3 will fit calibrators that drive these numbers down."
```

---

**End of Phase 1.** At this point:
- All new types and helpers exist in `src/score/`
- No extractor uses them yet
- Full test suite passes unchanged
- Baseline ECE measurement is reproducible via `pnpm eval:raw-ece`

---

## Phase 2: Scorer Migration (Breaking Change → 0.19.0)

These tasks rewrite every extractor to emit features and use `scoreCitation()`. The CitationBase type changes shape: `confidence: number` → `confidence: Confidence`. Every test that asserts on confidence must be updated.

### Task 10: Update `src/types/citation.ts` to use `Confidence`

**Files:**
- Modify: `src/types/citation.ts` (line 84)

- [ ] **Step 1: Write the failing type test**

Create `tests/types/confidenceField.test.ts`:
```ts
import { describe, expectTypeOf, it } from "vitest"
import type { Confidence } from "@/score/types"
import type { CitationBase } from "@/types/citation"

describe("CitationBase.confidence is the new struct", () => {
  it("confidence is typed as Confidence", () => {
    expectTypeOf<CitationBase["confidence"]>().toEqualTypeOf<Confidence>()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm exec vitest run tests/types/confidenceField.test.ts
```
Expected: FAIL — `CitationBase["confidence"]` is `number`, not `Confidence`.

- [ ] **Step 3: Modify `src/types/citation.ts`**

Update import (add to imports section near the top):
```ts
import type { Confidence } from "@/score/types"
```

Replace lines 77-84 (the `confidence` field block) with:
```ts
  /**
   * Calibrated confidence in this extraction. See `Confidence` for the full shape
   * (score, level, axes, reasons, optional explanation). Replaces the legacy
   * `confidence: number` field as of 0.19.0; see migration guide
   * `docs/migration/0.18-to-0.19.md`.
   */
  confidence: Confidence
```

- [ ] **Step 4: Run the type test**

```bash
pnpm exec vitest run tests/types/confidenceField.test.ts
```
Expected: PASS

- [ ] **Step 5: Run typecheck — will break in many places**

```bash
pnpm typecheck
```
Expected: many type errors from extractors still assigning `confidence: 0.X` numbers. This is the start of the migration; subsequent tasks fix them.

- [ ] **Step 6: Commit**

```bash
git add src/types/citation.ts tests/types/confidenceField.test.ts
git commit -m "feat(types)!: CitationBase.confidence is Confidence struct

BREAKING: confidence: number → confidence: Confidence. Subsequent tasks
migrate extractors. Typecheck intentionally broken between tasks; the
last task of Phase 2 restores it."
```

---

### Task 11: Remove `confidence: number` from `ResolutionResult`

**Files:**
- Modify: `src/resolve/types.ts` (lines 89-93)

- [ ] **Step 1: Modify `src/resolve/types.ts`**

Delete lines 88-93 (the `confidence: number` field and its JSDoc):
```ts
  /**
   * Confidence in the resolution (0-1)
   * Factors: party name similarity, scope boundary, citation type match
   */
  confidence: number
```

(They're removed entirely — resolution confidence now lives on `citation.confidence.axes.resolution`.)

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```
Expected: NEW errors in `src/resolve/DocumentResolver.ts` (all `confidence:` assignments in `ResolutionResult` returns) plus existing errors from Task 10.

- [ ] **Step 3: Commit**

```bash
git add src/resolve/types.ts
git commit -m "feat(resolve)!: remove ResolutionResult.confidence

BREAKING: moved to citation.confidence.axes.resolution. Subsequent
tasks update DocumentResolver to populate the new location."
```

---

### Task 12: Migrate `extractCase.ts` to emit features

**Files:**
- Modify: `src/extract/extractCase.ts` (lines 2932-2970)

- [ ] **Step 1: Read the existing scoring block**

Run `pnpm exec vitest run tests/extract/extractCase.test.ts` to see current behavior; note the test cases that assert specific confidence values — those need updating to `.confidence.score`.

- [ ] **Step 2: Modify `src/extract/extractCase.ts`**

Add to imports (near the top, with other `@/` imports):
```ts
import type { CaseFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
import { COMMON_REPORTERS } from "./extractCase" // self-ref ok via re-export; alternatively inline
```
(If `COMMON_REPORTERS` is already in scope, the second import is unnecessary.)

Replace the scoring block (lines 2932-2970 — `// Calculate confidence score using multi-factor model.` through the `Math.max(confidence, 0.5)` blank-page block) with:
```ts
  // Build feature vector and delegate to central scorer.
  const reportersDb = getReportersSync()
  const dbMatches = reportersDb?.byAbbreviation.get(reporter.toLowerCase()) ?? []
  const knownReporter = dbMatches.length > 0 || COMMON_REPORTERS.has(reporter)
  const reporterAmbiguous = dbMatches.length > 1
  const yearPresent = year !== undefined
  const yearPlausible = year !== undefined && year <= CURRENT_YEAR

  const expected = 7 // vol, reporter, page, year, court, caseName, pincite
  let populated = 2 // volume + reporter always present at this point
  if (page !== undefined) populated++
  if (yearPresent) populated++
  if (court) populated++
  if (caseName) populated++
  if (pincite !== undefined) populated++

  const features: CaseFeatures = {
    type: "case",
    patternId: token.patternId,
    knownReporter,
    reporterAmbiguous,
    yearPresent,
    yearPlausible,
    caseNamePresent: !!caseName,
    courtIdentified: !!court,
    blankPage: hasBlankPage,
    metadataExpected: expected,
    metadataPopulated: populated,
  }
  const confidence = scoreCitation(features)
```

Remove the now-unused local `confidence` declaration (the `let confidence = 0.2` and all the `confidence += ...` lines).

- [ ] **Step 3: Run case extraction tests**

```bash
pnpm exec vitest run tests/extract/extractCase.test.ts
```
Expected: type errors (tests still read `c.confidence > X`); many failures. These will be fixed in Task 23 (test migration).

- [ ] **Step 4: Verify the build compiles for extractCase alone**

```bash
pnpm exec tsc --noEmit src/extract/extractCase.ts 2>&1 | head -20
```
Expected: errors localized to this file should now be GONE. Other files still have errors (waiting to migrate).

- [ ] **Step 5: Commit**

```bash
git add src/extract/extractCase.ts
git commit -m "feat(extract)!: extractCase emits CaseFeatures → scoreCitation

Replaces inline additive scoring with feature-vector emission. Score
math now lives in src/score/. Behavior preserved by mirror weights;
tests broken until Task 23 (test migration)."
```

---

### Task 13: Migrate `extractShortForms.ts` (Id, supra, shortFormCase)

**Files:**
- Modify: `src/extract/extractShortForms.ts` (lines 161-201 Id; 289-358 supra; 462-491 shortFormCase)

- [ ] **Step 1: Modify Id extraction (lines 161-209)**

Add to imports:
```ts
import type { IdFeatures, ShortFormCaseFeatures, SupraFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
import { COMMON_REPORTERS } from "./extractCase"
```

Replace the Id scoring block (lines 161-184 — `// Confidence scoring based on variant` through the mid-sentence `confidence = Math.min(confidence, 0.4)`) with:
```ts
  // Build feature vector and delegate to central scorer.
  let inCitationContext = true
  if (cleanedText && span.cleanStart > 0) {
    const preceding = cleanedText.slice(Math.max(0, span.cleanStart - 20), span.cleanStart)
    const trimmed = preceding.trimEnd()
    if (trimmed.length > 0) {
      inCitationContext = /[.;)\]—:]$/.test(trimmed)
    }
  }

  const features: IdFeatures = {
    type: "id",
    patternId: "id-citation",
    lowercase: isLowercase,
    hasComma: !!hasComma,
    typoComma: isTypoComma,
    inCitationContext,
  }
  const confidence = scoreCitation(features)
```

Find the existing `return { type: "id", ..., confidence, ... }` block (around line 192-209) and change `confidence,` to use the new struct (it's already named `confidence` and now is a `Confidence` struct — no change to the return literal, but the call site receives a struct now).

Remove the unused `let confidence = 1.0` declaration and the subsequent `confidence = Math.min(...)` lines that were replaced.

- [ ] **Step 2: Modify supra extraction (lines 289-358)**

Replace the supra scoring (`let confidence: number` through the various `confidence = 0.X` assignments at lines 300, 307, 316) with:
```ts
  // Build features for the supra extraction.
  const isBracketed = !!bracketedMatch
  const hasPartyName = !!partyName
  const isStandalone = !bracketedMatch && !partyMatch

  const features: SupraFeatures = {
    type: "supra",
    patternId: "supra",
    partyName: hasPartyName,
    bracketed: isBracketed,
    standalone: isStandalone,
  }
  const confidence = scoreCitation(features)
```

Remove the now-unused `confidence` variable declarations.

- [ ] **Step 3: Modify shortFormCase extraction (lines 460-491)**

Replace lines 461-465 (`let confidence = 0.4` and `if (COMMON_REPORTERS...)` block) with:
```ts
  const features: ShortFormCaseFeatures = {
    type: "shortFormCase",
    patternId: "short-form-case",
    knownReporter: COMMON_REPORTERS.has(reporter),
    partyNameMatch: false, // populated post-resolution; false at extraction time
  }
  const confidence = scoreCitation(features)
```

- [ ] **Step 4: Run typecheck for this file**

```bash
pnpm exec tsc --noEmit src/extract/extractShortForms.ts 2>&1 | head -30
```
Expected: no errors in this file; errors persist elsewhere.

- [ ] **Step 5: Commit**

```bash
git add src/extract/extractShortForms.ts
git commit -m "feat(extract)!: extractShortForms emits Id/Supra/ShortFormCase features

Migrates all three short-form extractors. Score math centralized in
src/score/. Behavior preserved via mirror weights in weights.ts."
```

---

### Task 14: Migrate flat-confidence extractors (Journal/Neutral/PublicLaw/FederalRegister/StatutesAtLarge/Docket)

These six extractors all do the same thing: assign a single flat confidence value. They migrate identically.

**Files:**
- Modify: `src/extract/extractJournal.ts` (line 148)
- Modify: `src/extract/extractNeutral.ts` (line 212)
- Modify: `src/extract/extractPublicLaw.ts` (line 80)
- Modify: `src/extract/extractFederalRegister.ts` (line 85)
- Modify: `src/extract/extractStatutesAtLarge.ts` (locate line with `confidence` assignment)
- Modify: `src/extract/extractDocket.ts` (line 129)

- [ ] **Step 1: Migrate `extractJournal.ts`**

Add to imports:
```ts
import type { JournalFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
```

Replace `const confidence = 0.6` (line 148) with:
```ts
  const features: JournalFeatures = { type: "journal", patternId: "journal" }
  const confidence = scoreCitation(features)
```

- [ ] **Step 2: Migrate `extractNeutral.ts`**

Add to imports:
```ts
import type { NeutralFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
```

Replace `const confidence = 1.0` (line 212) with:
```ts
  const features: NeutralFeatures = { type: "neutral", patternId: token.patternId }
  const confidence = scoreCitation(features)
```

- [ ] **Step 3: Migrate `extractPublicLaw.ts`**

Add to imports:
```ts
import type { PublicLawFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
```

Replace `const confidence = 0.9` (line 80) with:
```ts
  const features: PublicLawFeatures = { type: "publicLaw", patternId: "public-law" }
  const confidence = scoreCitation(features)
```

- [ ] **Step 4: Migrate `extractFederalRegister.ts`**

Add to imports:
```ts
import type { FederalRegisterFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
```

Replace `const confidence = 0.9` (line 85) with:
```ts
  const features: FederalRegisterFeatures = { type: "federalRegister", patternId: "federal-register" }
  const confidence = scoreCitation(features)
```

- [ ] **Step 5: Migrate `extractStatutesAtLarge.ts`**

Locate the `confidence:` field in the citation return (or the local `confidence` assignment).

Add to imports:
```ts
import type { StatutesAtLargeFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
```

Before the return statement, add:
```ts
  const features: StatutesAtLargeFeatures = { type: "statutesAtLarge", patternId: "statutes-at-large" }
  const confidence = scoreCitation(features)
```

Change the return's `confidence: <number>` to `confidence,` (using the local).

- [ ] **Step 6: Migrate `extractDocket.ts`**

Add to imports:
```ts
import type { DocketFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
```

Replace `confidence: 0.7` (line 129) with:
```ts
  features: { type: "docket", patternId: token.patternId } as DocketFeatures,
  confidence: scoreCitation({ type: "docket", patternId: token.patternId }),
```

(Or assign `const features` + `const confidence` above the return and use them.)

- [ ] **Step 7: Run typecheck for these files**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "extract(Journal|Neutral|PublicLaw|FederalRegister|StatutesAtLarge|Docket)" | head
```
Expected: no errors in these six files.

- [ ] **Step 8: Commit**

```bash
git add src/extract/extractJournal.ts src/extract/extractNeutral.ts src/extract/extractPublicLaw.ts src/extract/extractFederalRegister.ts src/extract/extractStatutesAtLarge.ts src/extract/extractDocket.ts
git commit -m "feat(extract)!: migrate flat-confidence extractors to scoreCitation

Journal/Neutral/PublicLaw/FederalRegister/StatutesAtLarge/Docket all
emit minimal features (just type + patternId) and delegate to the
central scorer. Behavior preserved."
```

---

### Task 15: Migrate `extractConstitutional.ts`

**Files:**
- Modify: `src/extract/extractConstitutional.ts` (lines 198-207)

- [ ] **Step 1: Modify `extractConstitutional.ts`**

Add to imports:
```ts
import type { ConstitutionalFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
```

Replace lines 198-207 (the 4-bucket `if/else if` confidence assignment) with:
```ts
  const features: ConstitutionalFeatures = {
    type: "constitutional",
    patternId: token.patternId as ConstitutionalFeatures["patternId"],
    hasSection: !!section,
  }
  const confidence = scoreCitation(features)
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm exec tsc --noEmit src/extract/extractConstitutional.ts 2>&1 | head
```
Expected: no errors in this file.

- [ ] **Step 3: Commit**

```bash
git add src/extract/extractConstitutional.ts
git commit -m "feat(extract)!: extractConstitutional emits ConstitutionalFeatures

Replaces 4-bucket inline scoring with feature emission. Same bucket
logic now lives in src/score/axes.ts / weights.ts."
```

---

### Task 16: Migrate `extractStatute.ts` (legacy + fallback)

**Files:**
- Modify: `src/extract/extractStatute.ts` (lines 64-101)

- [ ] **Step 1: Modify `extractStatute.ts`**

Add to imports:
```ts
import type { StatuteFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
```

Replace the unparseable fallback block (lines 64-79) — change `confidence: 0.3,` to:
```ts
    confidence: scoreCitation({
      type: "statute",
      patternId: "legacy-unparseable",
      knownCode: false,
      titlePresent: false,
      subsectionPresent: false,
      parseable: false,
    }),
```

Replace the parseable scoring (lines 87-101 — `let confidence = 0.5` through the `Math.min` cap) with:
```ts
  const knownCodes = [
    "U.S.C.",
    "C.F.R.",
    "Cal. Civ. Code",
    "Cal. Penal Code",
    "N.Y. Civ. Prac. L. & R.",
    "Tex. Civ. Prac. & Rem. Code",
  ]
  const features: StatuteFeatures = {
    type: "statute",
    patternId: "legacy-statute",
    knownCode: knownCodes.some((c) => code.includes(c)),
    titlePresent: title !== undefined,
    subsectionPresent: false,
    parseable: true,
  }
  const confidence = scoreCitation(features)
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm exec tsc --noEmit src/extract/extractStatute.ts 2>&1 | head
```
Expected: no errors in this file.

- [ ] **Step 3: Commit**

```bash
git add src/extract/extractStatute.ts
git commit -m "feat(extract)!: extractStatute legacy path emits StatuteFeatures"
```

---

### Task 16b: Migrate `extractStatutes/extractFederal.ts`

**Files:**
- Modify: `src/extract/statutes/extractFederal.ts` (lines 97-100)

- [ ] **Step 1: Modify the file**

Add to imports:
```ts
import type { StatuteFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
```

Replace lines 97-100 (`let confidence = 0.95` + `if (title)` + `if (subsection)` + `Math.min` cap) with:
```ts
  const features: StatuteFeatures = {
    type: "statute",
    patternId: token.patternId, // 'usc', 'cfr', or 'irc'
    knownCode: true,
    titlePresent: title !== undefined,
    subsectionPresent: !!subsection,
    parseable: true,
  }
  const confidence = scoreCitation(features)
```

- [ ] **Step 2: Commit**

```bash
git add src/extract/statutes/extractFederal.ts
git commit -m "feat(extract)!: extractFederal statute emits StatuteFeatures"
```

---

### Task 17: Batch-migrate the remaining 31 statute sub-extractors

These all share a near-identical pattern: locally compute `confidence`, then assign in the return literal. The migration is mechanical.

**Files:** (each `src/extract/statutes/*.ts` not already migrated)
- `extractAbbreviated.ts`
- `extractAlaCode1940.ts`
- `extractCaBareCode.ts`
- `extractChapterAct.ts`
- `extractColoradoProse.ts`
- `extractFloridaStatute.ts`
- `extractGaPre1983.ts`
- `extractIcYearEdition.ts`
- `extractIdahoPostfix.ts`
- `extractIllRevStat.ts`
- `extractIrc.ts` (note: federal-statute pattern; already covered in Task 16b if using shared path)
- `extractKsaYearEdition.ts`
- `extractMcaPostfix.ts`
- `extractMdArticleLetter.ts`
- `extractMinnStYearEdition.ts`
- `extractNamedCode.ts`
- `extractNmBareSection.ts`
- `extractNyBareLaw.ts`
- `extractOhChapter.ts`
- `extractOrsChapter.ts`
- `extractProse.ts`
- `extractRcwChapterPostfix.ts`
- `extractRigl1956.ts`
- `extractRlh.ts`
- `extractRrs1943.ts`
- `extractRsaChapter.ts`
- `extractStateAdminCode.ts`
- `extractTcaPostfix.ts`
- `extractVaBareCode.ts`
- `extractWiStatsPostfix.ts`
- `extractWvCode1931.ts`

- [ ] **Step 1: For each file, apply this transformation**

For each file in the list, do:

1. Open the file.
2. Find the `confidence:` field in the citation return literal (or a local `confidence` variable).
3. Note the current value (typically `0.5`, `0.7`, `0.85`, `0.9`, or `0.95`).
4. Add to imports at the top:
   ```ts
   import type { StatuteFeatures } from "@/score/features"
   import { scoreCitation } from "@/score/scorer"
   ```
5. Just before the return, add:
   ```ts
   const features: StatuteFeatures = {
     type: "statute",
     patternId: token.patternId,
     knownCode: true, // all state-specific extractors operate on known codes
     titlePresent: false,
     subsectionPresent: false,
     parseable: true,
   }
   const confidence = scoreCitation(features)
   ```
6. Change `confidence: <number>` in the return to `confidence,`.

If the existing confidence is meaningfully different from `STATUTE_WEIGHTS.base + STATUTE_WEIGHTS.knownCode = 0.8`, add a pattern-specific entry in `src/score/weights.ts` first:
- e.g., if `extractCaBareCode.ts` uses `0.95`, that warrants a per-pattern override.

To preserve current behavior, **first** run `grep -n "confidence:" src/extract/statutes/*.ts` to inventory current values:
```bash
grep -nE "confidence:\s*[0-9]" src/extract/statutes/*.ts > /tmp/statute-confidences.txt
cat /tmp/statute-confidences.txt
```

For each unique current confidence value, add a per-pattern override map to `src/score/weights.ts`:
```ts
export const STATUTE_PATTERN_OVERRIDES: Record<string, number> = {
  // populate based on /tmp/statute-confidences.txt output, mapping patternId → current confidence value
  // example entries (replace with actual values from the audit):
  // "fl-statute": 0.9,
  // "ca-bare-code": 0.95,
}
```

Then update `axes.ts`'s `statuteExtraction` to check the override first:
```ts
function statuteExtraction(f: Extract<ExtractionFeatures, { type: "statute" }>): number {
  if (!f.parseable) return STATUTE_WEIGHTS.unparseable
  const override = STATUTE_PATTERN_OVERRIDES[f.patternId]
  if (override !== undefined) return override
  if (f.patternId === "usc" || f.patternId === "cfr" || f.patternId === "irc") {
    // ... existing federal logic
  }
  // ... existing legacy logic
}
```

- [ ] **Step 2: Update weights.ts and axes.ts with overrides**

Run the audit, populate `STATUTE_PATTERN_OVERRIDES`, update `statuteExtraction` per Step 1 instructions. Re-run the per-extractor weights test to confirm overrides take effect.

- [ ] **Step 3: Apply the per-extractor migration to all 31 files**

Apply the transformation from Step 1 to each file in the list. Commit in small batches (e.g., 5 files at a time) to keep diffs reviewable:

```bash
git add src/extract/statutes/extract{Abbreviated,AlaCode1940,CaBareCode,ChapterAct,ColoradoProse}.ts
git commit -m "feat(extract)!: migrate statute extractors (batch 1/7) to scoreCitation"

git add src/extract/statutes/extract{FloridaStatute,GaPre1983,IcYearEdition,IdahoPostfix,IllRevStat}.ts
git commit -m "feat(extract)!: migrate statute extractors (batch 2/7) to scoreCitation"

# ... continue in batches of 5 until all 31 are migrated.
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "src/extract/statutes" | head
```
Expected: no errors in `src/extract/statutes/`.

- [ ] **Step 5: Final commit for the override table**

```bash
git add src/score/weights.ts src/score/axes.ts
git commit -m "feat(score): STATUTE_PATTERN_OVERRIDES preserves current per-pattern values

Per-extractor inventory of current confidence values mapped into a
single override table so the centralized scorer matches existing
behavior exactly."
```

---

### Task 18: Update `filterFalsePositives.ts` to emit reason codes

**Files:**
- Modify: `src/extract/filterFalsePositives.ts` (line 415)

- [ ] **Step 1: Modify the penalize-mode block**

Replace lines 413-422 (the `if (reasons.length > 0)` block that sets `confidence = FLAGGED_CONFIDENCE`) with:
```ts
    if (reasons.length > 0) {
      // Penalize by clamping the score floor AND appending reason codes
      // so downstream consumers can filter on `reasons` instead of magic 0.1.
      citation.confidence = {
        ...citation.confidence,
        score: Math.min(citation.confidence.score, FLAGGED_CONFIDENCE),
        level: "low",
        reasons: [
          ...citation.confidence.reasons,
          // Map filter reasons to ReasonCode enum
          ...reasons.flatMap((r) => mapFilterReasonToCode(r)),
        ],
      }
      const warnings: Warning[] = reasons.map((message) => ({
        level: "warning" as const,
        message,
        position: { start: citation.span.originalStart, end: citation.span.originalEnd },
      }))
      citation.warnings = [...(citation.warnings || []), ...warnings]
    }
```

Add a mapping helper just above `applyFalsePositiveFilters`:
```ts
import type { ReasonCode } from "@/score/types"

function mapFilterReasonToCode(message: string): ReasonCode[] {
  if (message.includes("hyphenated volume")) return ["suspicious_volume"]
  if (message.includes("Small volume")) return ["small_volume"]
  if (message.startsWith("Year ") && message.includes("predates")) return ["year_implausible"]
  if (message.includes("non-US")) return ["blocked_reporter"]
  return []
}
```

Also update the idempotency-guard line (411): the check is now on `confidence.score === FLAGGED_CONFIDENCE`:
```ts
    if (citation.confidence.score === FLAGGED_CONFIDENCE && citation.warnings?.length) continue
```

- [ ] **Step 2: Run typecheck for this file**

```bash
pnpm exec tsc --noEmit src/extract/filterFalsePositives.ts 2>&1 | head
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/extract/filterFalsePositives.ts
git commit -m "feat(extract)!: filterFalsePositives emits reason codes alongside score floor

Filter penalty still clamps score to 0.1 floor, but now also appends
ReasonCode entries so consumers can filter on reasons instead of
magic numbers."
```

---

### Task 19: Update `DocumentResolver.ts` to emit resolution features

**Files:**
- Modify: `src/resolve/DocumentResolver.ts` (lines 458-463, 637, 698-701, 758-769, 887-895)

- [ ] **Step 1: Add imports + helper**

Add at the top:
```ts
import type { ResolutionFeatures } from "@/score/features"
```

Add a private helper method on the `DocumentResolver` class:
```ts
private buildResolutionFeatures(
  patternId: ResolutionFeatures["patternId"],
  exactMatch: boolean,
  similarity: number,
  windowMismatch = false,
  inScope = true,
): ResolutionFeatures {
  return { patternId, exactMatch, similarity, windowMismatch, inScope }
}
```

- [ ] **Step 2: Update each `return { resolvedTo, confidence, ... }` block**

For each location that returned `{ resolvedTo: X, confidence: Y, warnings }`, change it to return `{ resolvedTo: X, warnings, features: this.buildResolutionFeatures(...) }`.

But: `ResolutionResult` already lost `confidence` (Task 11). We need to add a `features` field. Update `src/resolve/types.ts`:
```ts
export interface ResolutionResult {
  resolvedTo?: number
  failureReason?: string
  warnings?: string[]
  /** Resolution features used by the central scorer to compute axes.resolution */
  features?: import("@/score/features").ResolutionFeatures
}
```

Then update each return in `DocumentResolver.ts`:

**At line 458-464** (Id resolution end, after windowCheck):
```ts
return {
  resolvedTo: best.index,
  warnings,
  features: this.buildResolutionFeatures(
    "id-resolution",
    true,
    1.0,
    confidence < 1.0, // windowMismatch derived from downgraded confidence
    true,
  ),
}
```
(The local `confidence` variable from `applyCaseNameWindowCheck` is still used for the windowMismatch flag — keep that intact.)

**At line 698-702** (supra resolution success):
```ts
return {
  resolvedTo: bestMatch.index,
  warnings: warnings.length > 0 ? warnings : undefined,
  features: this.buildResolutionFeatures(
    "supra-resolution",
    bestMatch.similarity === 1.0,
    bestMatch.similarity,
    false,
    true,
  ),
}
```

**At line 757-761** (short-form with party name):
```ts
return {
  resolvedTo: namedMatch,
  features: this.buildResolutionFeatures("shortform-resolution", true, 1.0, false, true),
}
```

**At line 765-769** (short-form bare):
```ts
return {
  resolvedTo: candidates[0],
  features: this.buildResolutionFeatures("shortform-resolution", false, 0.5, false, true),
}
```

**At line 887-895** (createFailureResult):
```ts
private createFailureResult(reason: string): ResolutionResult | undefined {
  if (this.options.reportUnresolved) {
    return {
      resolvedTo: undefined,
      failureReason: reason,
      features: this.buildResolutionFeatures(
        "id-resolution", // placeholder; caller's resolution type used in axes computation downstream
        false,
        0,
        false,
        false,
      ),
    }
  }
  return undefined
}
```

- [ ] **Step 3: Wire resolution features into the citation's Confidence**

Find where the resolver attaches resolution to citations (search for `.resolution = `). Update that block so that after assigning `.resolution`, it also rebuilds the citation's confidence with resolution features:

```ts
import { scoreCitation } from "@/score/scorer"
// ... existing imports

// In the place where resolution is attached:
if (result?.features && (citation.type === "id" || citation.type === "supra" || citation.type === "shortFormCase")) {
  // Re-score with resolution features to populate axes.resolution
  // We need the original ExtractionFeatures; for now, reconstruct minimal features per type:
  const extractionFeatures = this.reconstructExtractionFeatures(citation)
  if (extractionFeatures) {
    citation.confidence = scoreCitation(extractionFeatures, result.features)
  }
}
```

Add `reconstructExtractionFeatures` to the class (since the resolver doesn't have access to the original features the extractor used, we reconstruct a minimal version):

```ts
private reconstructExtractionFeatures(citation: Citation): ExtractionFeatures | undefined {
  switch (citation.type) {
    case "id":
      return {
        type: "id",
        patternId: "id-citation",
        // Heuristic reconstruction from existing reasons — preserves Phase 1 scoring
        lowercase: citation.confidence.reasons.includes("lowercase_id"),
        hasComma: false, // not derivable post-extraction; default
        typoComma: citation.confidence.reasons.includes("typo_punctuation"),
        inCitationContext: !citation.confidence.reasons.includes("mid_sentence_id"),
      }
    case "supra":
      return {
        type: "supra",
        patternId: "supra",
        partyName: !!citation.partyName,
        bracketed: citation.matchedText.includes("[supra"),
        standalone: !citation.partyName,
      }
    case "shortFormCase":
      return {
        type: "shortFormCase",
        patternId: "short-form-case",
        knownReporter: citation.confidence.reasons.includes("known_reporter"),
        partyNameMatch: !!citation.partyName,
      }
    default:
      return undefined
  }
}
```

Note this is a workaround for Phase 2 (features aren't yet stored on the citation). A cleaner solution (storing features on the citation) is a Phase 3 follow-up; Phase 2 just needs behavioral preservation.

- [ ] **Step 4: Run typecheck**

```bash
pnpm exec tsc --noEmit src/resolve/DocumentResolver.ts 2>&1 | head -30
```
Expected: no errors in this file.

- [ ] **Step 5: Commit**

```bash
git add src/resolve/DocumentResolver.ts src/resolve/types.ts
git commit -m "feat(resolve)!: emit ResolutionFeatures, populate citation.confidence.axes.resolution

ResolutionResult no longer has its own confidence field. Instead, it
emits ResolutionFeatures that the central scorer uses to populate
citation.confidence.axes.resolution. Behavior preserved via
reconstructExtractionFeatures shim — proper feature storage is a
Phase 3 follow-up."
```

---

### Task 20: Update `validation.ts` to operate on the new Confidence struct

**Files:**
- Modify: `src/extract/validation.ts` (lines 96-152)

- [ ] **Step 1: Modify the adjustment math**

The current `adjustedConfidence` math operates on `citation.confidence` as a number. Update it to operate on `confidence.score` and rebuild the struct:

Replace the body of `validateAndScore` from line 96 (`let adjustedConfidence = citation.confidence`) through the function end (line 156) with:
```ts
  let adjustedScore = citation.confidence.score
  const baseReasons = citation.confidence.reasons

  if ("reporter" in citation && citation.reporter) {
    const matches = reportersDb.byAbbreviation.get(citation.reporter.toLowerCase()) ?? []

    if (matches.length === 0) {
      adjustedScore = Math.max(0, adjustedScore + opts.reporterMissPenalty)
      const warning: Warning = {
        level: "warning",
        message: `Reporter "${citation.reporter}" not found in database`,
        position: { start: citation.span.originalStart, end: citation.span.originalEnd },
      }
      return {
        ...citation,
        confidence: {
          ...citation.confidence,
          score: adjustedScore,
          reasons: [...baseReasons, "reporter_unknown"],
        },
        reporterMatch: null,
        warnings: [...(citation.warnings ?? []), warning],
      }
    }

    if (matches.length === 1) {
      adjustedScore = Math.min(1.0, adjustedScore + opts.reporterMatchBoost)
      return {
        ...citation,
        confidence: {
          ...citation.confidence,
          score: adjustedScore,
          reasons: [...baseReasons, "known_reporter"],
        },
        reporterMatch: matches[0],
      }
    }

    const penalty = opts.ambiguityPenalty * (matches.length - 1)
    adjustedScore = Math.max(0, adjustedScore + penalty)
    const warning: Warning = {
      level: "warning",
      message: `Ambiguous reporter: ${matches.map((m) => m.name).join(", ")}`,
      position: { start: citation.span.originalStart, end: citation.span.originalEnd },
    }
    return {
      ...citation,
      confidence: {
        ...citation.confidence,
        score: adjustedScore,
        reasons: [...baseReasons, "reporter_ambiguous"],
      },
      reporterMatches: matches,
      warnings: [...(citation.warnings ?? []), warning],
    }
  }

  return citation
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm exec tsc --noEmit src/extract/validation.ts 2>&1 | head
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/extract/validation.ts
git commit -m "feat(validation)!: adjustments operate on Confidence.score

validateAndScore now reads/writes citation.confidence.score and
extends citation.confidence.reasons rather than mutating a raw
number. Always-on integration is Phase 5."
```

---

### Task 21: Run typecheck and fix any remaining call sites

- [ ] **Step 1: Run full typecheck**

```bash
pnpm typecheck 2>&1 | tee /tmp/typecheck.log
```

- [ ] **Step 2: Triage remaining errors**

Open `/tmp/typecheck.log` and address each remaining type error. Common patterns:

- **In test files**: assertions like `expect(c.confidence).toBe(0.7)` → `expect(c.confidence.score).toBe(0.7)`. Handled in Task 23 (test migration).
- **In utility files**: any helper that reads `.confidence` as a number, e.g., `toBluebook`, `groupByCase`. Update reads to `.confidence.score`.
- **In annotate**: check `src/annotate/` for confidence references; update.

For each non-test file with errors, apply the fix in-place. Each fix gets its own micro-commit:
```bash
git add <path>
git commit -m "fix(<area>): read citation.confidence.score instead of .confidence"
```

- [ ] **Step 3: Re-run typecheck**

```bash
pnpm typecheck
```
Expected: only test-file errors remain (handled in Task 23).

---

### Task 22: Add integration test for the new Confidence shape

**Files:**
- Create: `tests/integration/confidenceShape.test.ts`

- [ ] **Step 1: Write the test**

Create `tests/integration/confidenceShape.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

describe("Confidence struct shape across citation types", () => {
  it("case citation has full Confidence with axes", () => {
    const text = "See Smith v. Doe, 500 F.3d 123 (9th Cir. 2020)."
    const [c] = extractCitations(text)
    expect(c).toBeDefined()
    expect(c.confidence.score).toBeGreaterThan(0.5)
    expect(c.confidence.level).toBe("certain")
    expect(c.confidence.axes.extraction).toBeGreaterThan(0)
    expect(c.confidence.axes.metadata).toBeGreaterThan(0)
    expect(c.confidence.axes.resolution).toBeUndefined() // not a short-form
    expect(c.confidence.reasons).toContain("known_reporter")
  })

  it("Id. with no resolution has no axes.resolution", () => {
    const text = "Smith, 500 F.3d 123. Id. at 125."
    const citations = extractCitations(text)
    const id = citations.find((c) => c.type === "id")
    expect(id).toBeDefined()
    expect(id!.confidence.axes.resolution).toBeUndefined()
  })

  it("resolved Id. has axes.resolution populated", () => {
    const text = "Smith, 500 F.3d 123. Id. at 125."
    const citations = extractCitations(text, { resolve: true })
    const id = citations.find((c) => c.type === "id")
    expect(id).toBeDefined()
    expect(id!.confidence.axes.resolution).toBeDefined()
    expect(id!.confidence.axes.resolution).toBeGreaterThan(0.5)
  })

  it("score = extraction * resolution for resolved short-form", () => {
    const text = "Smith, 500 F.3d 123. Id. at 125."
    const citations = extractCitations(text, { resolve: true })
    const id = citations.find((c) => c.type === "id")!
    const expected = Math.round(id.confidence.axes.extraction * id.confidence.axes.resolution! * 100) / 100
    expect(id.confidence.score).toBeCloseTo(expected, 2)
  })

  it("score = extraction for full citation (no resolution axis)", () => {
    const text = "See 42 U.S.C. § 1983."
    const [c] = extractCitations(text)
    expect(c.confidence.score).toBeCloseTo(c.confidence.axes.extraction, 2)
  })

  it("reasons is always an array", () => {
    const text = "Smith v. Doe, 500 F.3d 123 (2020); See 42 U.S.C. § 1983; Id. at 125."
    for (const c of extractCitations(text)) {
      expect(Array.isArray(c.confidence.reasons)).toBe(true)
    }
  })

  it("level matches deriveLevel for the score", () => {
    const text = "Smith v. Doe, 500 F.3d 123 (9th Cir. 2020). See 42 U.S.C. § 1983(a)."
    for (const c of extractCitations(text)) {
      const expectedLevel =
        c.confidence.score >= 0.95 ? "certain" :
        c.confidence.score >= 0.80 ? "high" :
        c.confidence.score >= 0.50 ? "medium" : "low"
      expect(c.confidence.level).toBe(expectedLevel)
    }
  })

  it("explanation is undefined by default", () => {
    const [c] = extractCitations("500 F.3d 123 (2020)")
    expect(c.confidence.explanation).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test**

```bash
pnpm exec vitest run tests/integration/confidenceShape.test.ts
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/integration/confidenceShape.test.ts
git commit -m "test(integration): Confidence struct shape integration coverage"
```

---

### Task 23: Migrate all existing tests to new Confidence shape

There are ~329 confidence assertions across the test suite (from the earlier `grep -rn "confidence" tests/` count). Most are mechanical renames.

- [ ] **Step 1: Inventory**

```bash
grep -rn "\.confidence\b" tests/ --include="*.ts" > /tmp/test-confidence-usage.txt
wc -l /tmp/test-confidence-usage.txt
```

- [ ] **Step 2: Categorize**

Skim `/tmp/test-confidence-usage.txt`. Most lines fall into:
- A) `expect(c.confidence).toBe(0.X)` → `expect(c.confidence.score).toBe(0.X)`
- B) `expect(c.confidence).toBeGreaterThan(0.X)` → `expect(c.confidence.score).toBeGreaterThan(0.X)`
- C) `expect(c.confidence).toBeCloseTo(0.X, 2)` → `expect(c.confidence.score).toBeCloseTo(0.X, 2)`
- D) `c.resolution?.confidence` → `c.confidence.axes.resolution`
- E) Construction in test fixtures: `confidence: 0.7` → `confidence: { score: 0.7, level: "medium", axes: { extraction: 0.7, metadata: 1.0 }, reasons: [] }`

- [ ] **Step 3: Apply rename for cases A, B, C**

A safe regex replacement (apply via search-and-replace in your editor or via `sed` on individual files — do NOT bulk-apply on all files at once without review):

For each test file in the inventory, transform `\.confidence\b(\s*\))` → `.confidence.score$1` for assertion sites.

Edit each file individually, commit in batches of 5-10 files:
```bash
git add tests/integration/fullPipeline.test.ts tests/integration/resolution.test.ts
git commit -m "test: migrate assertions to citation.confidence.score (batch 1)"
```

- [ ] **Step 4: Handle case D — resolution.confidence reads**

`grep -rn "resolution.*confidence" tests/ --include="*.ts" | head`

For each: change `c.resolution?.confidence` to `c.confidence.axes.resolution`. Commit when done.

- [ ] **Step 5: Handle case E — fixture construction**

`grep -rn "confidence: 0\." tests/ --include="*.ts" | head`

For each test fixture that constructs a Citation object literal with `confidence: 0.X`, replace with:
```ts
confidence: {
  score: 0.X,
  level: 0.X >= 0.95 ? "certain" : 0.X >= 0.80 ? "high" : 0.X >= 0.50 ? "medium" : "low",
  axes: { extraction: 0.X, metadata: 1.0 },
  reasons: [],
}
```

Or, simpler, use a test helper. Create `tests/helpers/confidence.ts`:
```ts
import type { Confidence } from "@/score/types"
import { deriveLevel } from "@/score/level"

export function fakeConfidence(score: number): Confidence {
  return {
    score,
    level: deriveLevel(score),
    axes: { extraction: score, metadata: 1.0 },
    reasons: [],
  }
}
```

Use `fakeConfidence(0.7)` in fixtures.

Commit when test suite passes:
```bash
git add tests/helpers/confidence.ts tests/**/*.test.ts
git commit -m "test: migrate fixtures to Confidence struct via fakeConfidence helper"
```

- [ ] **Step 6: Run full test suite**

```bash
pnpm test
```
Expected: all tests pass.

- [ ] **Step 7: Run typecheck**

```bash
pnpm typecheck
```
Expected: clean.

- [ ] **Step 8: Run lint + format**

```bash
pnpm lint
pnpm format
```
Expected: clean.

---

### Task 24: Re-run raw-ECE harness on new code

- [ ] **Step 1: Update `scripts/eval/rawEce.ts` to read `.confidence.score`**

In the script, replace the line:
```ts
const score = (m.prediction as unknown as { confidence: number }).confidence
```
with:
```ts
const score = m.prediction.confidence.score
```

(Remove the cast — the type is now correct.)

- [ ] **Step 2: Run the harness**

```bash
pnpm eval:raw-ece
```
Expected: per-pattern ECE table, similar to Phase 1 baseline. Numbers should be CLOSE to the baseline but may differ slightly because the central scorer's rounding/clamping may differ from the per-extractor variants.

Verify the OVERALL ECE is within ±0.01 of the Phase 1 baseline. If it's much worse, there's a behavioral regression in the migration — investigate.

- [ ] **Step 3: Commit**

```bash
git add scripts/eval/rawEce.ts
git commit -m "chore(eval): rawEce script reads citation.confidence.score post-migration"
```

---

### Task 25: Write changeset + migration doc + bump version

**Files:**
- Create: `.changeset/confidence-scoring-overhaul.md`
- Create: `docs/migration/0.18-to-0.19.md`
- Update: `README.md` (confidence references)

- [ ] **Step 1: Create the changeset**

```bash
pnpm changeset
```

Select **minor** version bump (this is breaking, but we're pre-1.0). Use this summary text:
```
feat!: structured Confidence type replaces citation.confidence: number

BREAKING: citation.confidence is now a struct { score, level, axes, reasons, explanation? }
instead of a single number. resolution.confidence has been removed; the equivalent signal
lives at citation.confidence.axes.resolution.

Migration:
- citation.confidence > 0.85 → citation.confidence.score > 0.85
- citation.resolution.confidence → citation.confidence.axes.resolution
- See docs/migration/0.18-to-0.19.md for the full guide.

This is Phase 1+2 of the confidence-scoring overhaul. Phase 3 (calibration) and
Phase 4 (precisionTarget/explain/profiles) follow in 0.20.0 and 0.21.0.
```

- [ ] **Step 2: Write the migration doc**

Create `docs/migration/0.18-to-0.19.md`:
```markdown
# Migration: 0.18.x → 0.19.0

The `confidence` field on citations changed shape. This is a pre-1.0 breaking
change introduced by Phase 1+2 of the confidence-scoring overhaul. See the
design spec at `docs/superpowers/specs/2026-05-17-confidence-scoring-design.md`
for full context.

## What changed

### `citation.confidence: number` → `citation.confidence: Confidence`

```ts
// Before (0.18.x):
const score = citation.confidence  // number 0..1

// After (0.19.x):
const score = citation.confidence.score  // number 0..1 (same range)
const level = citation.confidence.level  // "certain" | "high" | "medium" | "low"
const reasons = citation.confidence.reasons  // ReasonCode[]
```

### `resolution.confidence` removed → `citation.confidence.axes.resolution`

```ts
// Before (0.18.x):
const idCitation = citations.find(c => c.type === "id")
const resConf = idCitation?.resolution?.confidence

// After (0.19.x):
const idCitation = citations.find(c => c.type === "id")
const resConf = idCitation?.confidence.axes.resolution
```

## Why

The old single-number field conflated three orthogonal questions: "is this a
real citation?", "did we parse the fields correctly?", and "did we link
the short-form correctly?". Consumers couldn't tell which sub-question a
low score meant. The new struct exposes each separately:

- `axes.extraction` — P(this is a real citation), calibrated per pattern
- `axes.metadata` — completeness of parsed fields (deterministic 0..1)
- `axes.resolution` — P(correct antecedent), short-forms only

The composite `score` is what most filtering should use: it equals
`axes.extraction` for full citations and `axes.extraction × axes.resolution`
for resolved short-forms.

## Find-and-replace recipes

```bash
# Find all read sites in your codebase:
grep -rn '\.confidence\b' src/ test/

# Common rewrite patterns (verify by hand — these are not safe automatic
# substitutions; some uses construct Citation objects in tests, where the
# replacement is different):
#   .confidence >        →  .confidence.score >
#   .confidence <        →  .confidence.score <
#   .confidence ===      →  .confidence.score ===
#   .resolution.confidence  →  .confidence.axes.resolution
```

## Caveats

- **Calibration not yet active.** `score` in 0.19.x equals the same raw value
  the old field had. Real calibration lands in 0.20.x (Phase 3). Set
  thresholds the same way you used to until then.
- **Reason codes are non-empty for full extractions.** Even healthy citations
  emit positive reason codes (`known_reporter`, `year_plausible`, etc.).
  Don't filter on "reasons is empty"; filter on specific negative codes.
- **`level` thresholds are stable across minor versions** — pin your UI
  buckets on `level` rather than raw score if you want stability across
  calibration updates.

## Future API additions (0.20.x+)

These don't ship in 0.19.x but are coming and will be additive:
- `extractCitations(text, { precisionTarget: 0.95 })` — filter by precision contract
- `extractCitations(text, { explain: true })` — populates `confidence.explanation` tree
- `extractCitations(text, { profile: "brief" | "opinion" | "academic" })` — preset scoring profiles

See `docs/superpowers/specs/2026-05-17-confidence-scoring-design.md` for the
full roadmap.
```

- [ ] **Step 3: Update README confidence references**

In `README.md`, search for the existing confidence section (around line 156 per the earlier grep). Replace the `cite.confidence // 0.85` example with:
```typescript
cite.confidence.score   // 0.85
cite.confidence.level   // "high"
cite.confidence.reasons // ["known_reporter", "year_plausible", "case_name_present"]
```

Also remove or update the "1.0 = certain; 0.8-0.99 = high; 0.5-0.79 = medium; <0.5 = low" line if it's still present in absolute form — those thresholds now live on `.level`.

- [ ] **Step 4: Run full quality gate**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add .changeset/ docs/migration/0.18-to-0.19.md README.md
git commit -m "docs: changeset + migration guide for confidence overhaul

Phase 1+2 complete. 0.19.0 ships the new Confidence struct with
identity calibration; 0.20.0 adds real calibration; 0.21.0 adds
precisionTarget/explain/profiles."
```

---

**End of Phase 2.** At this point:
- Every extractor emits features and uses `scoreCitation()`
- `CitationBase.confidence` is the new `Confidence` struct
- `ResolutionResult.confidence` is gone; replaced by `citation.confidence.axes.resolution`
- All tests pass
- ECE baseline is re-measured on the new code and within ±0.01 of the Phase 1 baseline
- Changeset + migration doc ready for the 0.19.0 release

---

## Future Plans

Phases 3–6 will each get their own plan file in `docs/superpowers/plans/`:

- **Phase 3 plan** — `2026-XX-XX-confidence-scoring-phase-3-calibration.md`
  - Build script (`scripts/calibrate/build.ts`) producing `src/score/calibration.json`
  - Histogram binning + Platt scaling implementations in `scripts/calibrate/`
  - `pnpm calibrate` / `pnpm calibrate --check` / `pnpm calibrate --report`
  - ECE regression test in CI (`tests/calibration/regression.test.ts`)
  - Reliability diagram snapshot tests
  - Ships 0.20.0

- **Phase 4 plan** — `2026-XX-XX-confidence-scoring-phase-4-dx.md`
  - `precisionTarget` option in `ExtractOptions`
  - `explain: true` option (already wired in scorer; just expose via extractCitations)
  - Scorer profiles (`ProfileSpec`, preset library)
  - P-R curve serialization in `calibration.json`
  - Ships 0.21.0

- **Phase 5 plan** — `2026-XX-XX-confidence-scoring-phase-5-always-on-validation.md`
  - Fold reporters-DB validation into default `extractCitations` pipeline
  - Lazy-load + graceful degradation when DB absent
  - Deprecate `extractWithValidation` (alias for backwards compat)
  - Ships 0.22.0

- **Phase 6 plan** — `2026-XX-XX-confidence-scoring-phase-6-docs.md`
  - `docs/guides/confidence.md` with per-pattern P-R tables
  - README rewrite of confidence section
  - Update migration doc with calibration results
  - Ships 0.22.1

Each subsequent plan should be authored once the previous phase ships, so the engineer working it has fresh feedback on what the prior phase actually delivered.
