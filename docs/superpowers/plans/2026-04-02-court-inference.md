# Court Inference from Reporter Series Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Infer court level and jurisdiction from reporter abbreviation on every case citation, using a curated static lookup table with zero dependency on the reporter DB.

**Architecture:** New `src/extract/courtInference.ts` module with a `CourtInference` type and a `Map<string, CourtInference>` lookup table. Called from `extractCase.ts` after parenthetical parsing. Replaces the hardcoded `SCOTUS_REPORTER_REGEX`.

**Tech Stack:** TypeScript, Vitest

---

### Task 1: Add CourtInference type to citation types

**Files:**
- Modify: `src/types/citation.ts:71-193` (FullCaseCitation interface)
- Modify: `src/types/index.ts` (export new type)
- Modify: `src/index.ts` (export new type)

- [ ] **Step 1: Add CourtInference interface and field to FullCaseCitation**

In `src/types/citation.ts`, add the interface before `FullCaseCitation` (after line 63):

```typescript
/**
 * Court level and jurisdiction inferred from reporter series.
 * Populated independently of the parenthetical-extracted `court` field.
 */
export interface CourtInference {
  /** Court level classification */
  level: "supreme" | "appellate" | "trial" | "unknown"
  /** Jurisdiction classification */
  jurisdiction: "federal" | "state" | "unknown"
  /** 2-letter state code, only for state-specific reporters */
  state?: string
  /** Confidence score 0.0-1.0 (1.0 for unambiguous, 0.7 for regional multi-state) */
  confidence: number
}
```

In `FullCaseCitation`, add the field after `disposition` (after line 192):

```typescript
  /**
   * Court level/jurisdiction inferred from reporter series.
   * Always populated independently of the parenthetical `court` field.
   * Uses a curated static lookup table — does not depend on the reporter DB
   * to preserve tree-shaking of the `eyecite-ts/data` entry point.
   */
  inferredCourt?: CourtInference
```

- [ ] **Step 2: Export CourtInference from types barrel**

In `src/types/index.ts`, add `CourtInference` to the type export:

```typescript
export type {
  Citation,
  CitationBase,
  CitationOfType,
  CitationType,
  ConstitutionalCitation,
  CourtInference,  // ← add
  // ... rest unchanged
```

In `src/index.ts`, add `CourtInference` to the type export:

```typescript
export type {
  Citation,
  CitationBase,
  CitationOfType,
  CitationType,
  ConstitutionalCitation,
  CourtInference,  // ← add
  // ... rest unchanged
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (new type added, no consumers yet)

- [ ] **Step 4: Commit**

```bash
git add src/types/citation.ts src/types/index.ts src/index.ts
git commit -m "feat(types): add CourtInference type to FullCaseCitation (#78)"
```

---

### Task 2: Create courtInference module with lookup table

**Files:**
- Create: `src/extract/courtInference.ts`
- Create: `tests/extract/courtInference.test.ts`

- [ ] **Step 1: Write failing tests for inferCourtFromReporter**

Create `tests/extract/courtInference.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { inferCourtFromReporter } from "@/extract/courtInference"

describe("inferCourtFromReporter", () => {
  describe("federal supreme", () => {
    it.each(["U.S.", "S. Ct.", "L. Ed.", "L. Ed. 2d"])(
      "infers supreme/federal for %s",
      (reporter) => {
        const result = inferCourtFromReporter(reporter)
        expect(result).toEqual({
          level: "supreme",
          jurisdiction: "federal",
          confidence: 1.0,
        })
      },
    )
  })

  describe("federal appellate", () => {
    it.each(["F.", "F.2d", "F.3d", "F.4th", "F. App'x"])(
      "infers appellate/federal for %s",
      (reporter) => {
        const result = inferCourtFromReporter(reporter)
        expect(result).toEqual({
          level: "appellate",
          jurisdiction: "federal",
          confidence: 1.0,
        })
      },
    )
  })

  describe("federal trial", () => {
    it.each(["F. Supp.", "F. Supp. 2d", "F. Supp. 3d", "F.R.D.", "B.R."])(
      "infers trial/federal for %s",
      (reporter) => {
        const result = inferCourtFromReporter(reporter)
        expect(result).toEqual({
          level: "trial",
          jurisdiction: "federal",
          confidence: 1.0,
        })
      },
    )
  })

  describe("state-specific", () => {
    it("infers appellate/state/CA for Cal.App.5th", () => {
      expect(inferCourtFromReporter("Cal.App.5th")).toEqual({
        level: "appellate",
        jurisdiction: "state",
        state: "CA",
        confidence: 1.0,
      })
    })

    it("infers trial/state/NY for Misc.3d", () => {
      expect(inferCourtFromReporter("Misc.3d")).toEqual({
        level: "trial",
        jurisdiction: "state",
        state: "NY",
        confidence: 1.0,
      })
    })

    it("infers appellate/state/NY for A.D.3d", () => {
      expect(inferCourtFromReporter("A.D.3d")).toEqual({
        level: "appellate",
        jurisdiction: "state",
        state: "NY",
        confidence: 1.0,
      })
    })

    it("infers appellate/state/IL for Ill.App.3d", () => {
      expect(inferCourtFromReporter("Ill.App.3d")).toEqual({
        level: "appellate",
        jurisdiction: "state",
        state: "IL",
        confidence: 1.0,
      })
    })
  })

  describe("regional multi-state", () => {
    it.each(["A.2d", "A.3d", "S.E.2d", "N.E.2d", "N.E.3d", "N.W.2d", "S.W.3d", "So.2d", "So.3d", "P.2d", "P.3d"])(
      "infers appellate/state with 0.7 confidence for %s (no state)",
      (reporter) => {
        const result = inferCourtFromReporter(reporter)
        expect(result).toBeDefined()
        expect(result!.jurisdiction).toBe("state")
        expect(result!.confidence).toBe(0.7)
        expect(result!.state).toBeUndefined()
      },
    )
  })

  describe("unknown reporters", () => {
    it("returns undefined for unknown reporter", () => {
      expect(inferCourtFromReporter("Xyz.Rptr.")).toBeUndefined()
    })

    it("returns undefined for empty string", () => {
      expect(inferCourtFromReporter("")).toBeUndefined()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/courtInference.test.ts`
Expected: FAIL (module does not exist)

- [ ] **Step 3: Implement courtInference module**

Create `src/extract/courtInference.ts`:

```typescript
/**
 * Court Inference from Reporter Series
 *
 * Infers court level and jurisdiction from reporter abbreviation using a
 * curated static lookup table.
 *
 * Design decision: This uses a hand-curated table rather than parsing
 * mlz_jurisdiction from the reporter DB. Using the reporter DB would make
 * it a hard dependency of core extraction, defeating the lazy-loading
 * architecture where eyecite-ts/data is a separate entry point for
 * tree-shaking. A curated table keeps court inference zero-dependency
 * and fast. Full reporter DB coverage can be added later as an opt-in
 * function in the eyecite-ts/data entry point.
 *
 * @module extract/courtInference
 */

import type { CourtInference } from "@/types/citation"

/** Helper to reduce repetition when building the lookup table. */
function federal(level: CourtInference["level"]): CourtInference {
  return { level, jurisdiction: "federal", confidence: 1.0 }
}

function state(
  level: CourtInference["level"],
  st: string,
): CourtInference {
  return { level, jurisdiction: "state", state: st, confidence: 1.0 }
}

function regional(level: CourtInference["level"]): CourtInference {
  return { level, jurisdiction: "state", confidence: 0.7 }
}

/**
 * Curated reporter → court inference mapping.
 *
 * Covers the ~40 most common reporters. Unknown reporters return undefined
 * from inferCourtFromReporter() — no guessing.
 */
const REPORTER_COURT_MAP = new Map<string, CourtInference>([
  // ── Federal Supreme ──────────────────────────────────────────────
  ["U.S.", federal("supreme")],
  ["S. Ct.", federal("supreme")],
  ["L. Ed.", federal("supreme")],
  ["L. Ed. 2d", federal("supreme")],

  // ── Federal Appellate ────────────────────────────────────────────
  ["F.", federal("appellate")],
  ["F.2d", federal("appellate")],
  ["F.3d", federal("appellate")],
  ["F.4th", federal("appellate")],
  ["F. App'x", federal("appellate")],

  // ── Federal Trial ────────────────────────────────────────────────
  ["F. Supp.", federal("trial")],
  ["F. Supp. 2d", federal("trial")],
  ["F. Supp. 3d", federal("trial")],
  ["F.R.D.", federal("trial")],
  ["B.R.", federal("trial")],

  // ── California ───────────────────────────────────────────────────
  ["Cal.App.4th", state("appellate", "CA")],
  ["Cal.App.5th", state("appellate", "CA")],
  ["Cal.Rptr.", state("unknown", "CA")],
  ["Cal.Rptr.2d", state("unknown", "CA")],
  ["Cal.Rptr.3d", state("unknown", "CA")],
  ["Cal.2d", state("supreme", "CA")],
  ["Cal.3d", state("supreme", "CA")],
  ["Cal.4th", state("supreme", "CA")],
  ["Cal.5th", state("supreme", "CA")],

  // ── New York ─────────────────────────────────────────────────────
  ["N.Y.3d", state("supreme", "NY")],
  ["A.D.3d", state("appellate", "NY")],
  ["Misc.3d", state("trial", "NY")],
  ["N.Y.S.3d", state("unknown", "NY")],
  ["N.Y.S.2d", state("unknown", "NY")],

  // ── Illinois ─────────────────────────────────────────────────────
  ["Ill.2d", state("supreme", "IL")],
  ["Ill.App.3d", state("appellate", "IL")],
  ["Ill.Dec.", state("unknown", "IL")],

  // ── Regional (multi-state, no state field) ───────────────────────
  ["A.2d", regional("appellate")],
  ["A.3d", regional("appellate")],
  ["S.E.2d", regional("appellate")],
  ["N.E.2d", regional("appellate")],
  ["N.E.3d", regional("appellate")],
  ["N.W.2d", regional("appellate")],
  ["S.W.3d", regional("appellate")],
  ["So.2d", regional("appellate")],
  ["So.3d", regional("appellate")],
  ["P.2d", regional("appellate")],
  ["P.3d", regional("appellate")],
])

/**
 * Infer court level and jurisdiction from a reporter abbreviation.
 *
 * @param reporter - Reporter abbreviation (e.g., "F.3d", "Cal.App.5th")
 * @returns CourtInference if reporter is in the curated table, undefined otherwise
 */
export function inferCourtFromReporter(reporter: string): CourtInference | undefined {
  return REPORTER_COURT_MAP.get(reporter)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/extract/courtInference.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/extract/courtInference.ts tests/extract/courtInference.test.ts
git commit -m "feat: add court inference lookup table (#78)"
```

---

### Task 3: Integrate court inference into extractCase

**Files:**
- Modify: `src/extract/extractCase.ts:58,570-573`
- Modify: `tests/extract/extractCase.test.ts`

- [ ] **Step 1: Write failing integration tests**

In `tests/extract/extractCase.test.ts`, add a new describe block after the existing SCOTUS court inference tests (after line ~510):

```typescript
describe("court inference from reporter (#78)", () => {
  it("infers federal appellate from F.3d", () => {
    const citations = extractCitations("500 F.3d 123 (9th Cir. 2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("9th Cir.")
      expect(citations[0].inferredCourt).toEqual({
        level: "appellate",
        jurisdiction: "federal",
        confidence: 1.0,
      })
    }
  })

  it("infers federal trial from F. Supp. 3d", () => {
    const citations = extractCitations("350 F. Supp. 3d 100 (D. Mass. 2019)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("D. Mass.")
      expect(citations[0].inferredCourt).toEqual({
        level: "trial",
        jurisdiction: "federal",
        confidence: 1.0,
      })
    }
  })

  it("infers federal supreme from U.S. reporter", () => {
    const citations = extractCitations("491 U.S. 397 (1989)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("scotus")
      expect(citations[0].inferredCourt).toEqual({
        level: "supreme",
        jurisdiction: "federal",
        confidence: 1.0,
      })
    }
  })

  it("populates inferredCourt even when parenthetical has court", () => {
    const citations = extractCitations("500 F.3d 123 (9th Cir. 2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      // Both court (from parenthetical) and inferredCourt (from reporter) present
      expect(citations[0].court).toBe("9th Cir.")
      expect(citations[0].inferredCourt).toBeDefined()
    }
  })

  it("returns undefined inferredCourt for unknown reporter", () => {
    const citations = extractCitations("10 Wheat. 66 (1825)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].inferredCourt).toBeUndefined()
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extract/extractCase.test.ts -t "court inference from reporter"`
Expected: FAIL (inferredCourt is undefined on all citations)

- [ ] **Step 3: Integrate inferCourtFromReporter into extractCase**

In `src/extract/extractCase.ts`:

Add import at the top (after the existing imports around line 20):

```typescript
import { inferCourtFromReporter } from "./courtInference"
```

Replace the SCOTUS inference block at lines 570-573:

```typescript
  // Infer court from reporter for known Supreme Court reporters
  if (!court && SCOTUS_REPORTER_REGEX.test(reporter)) {
    court = "scotus"
  }
```

With:

```typescript
  // Infer court level/jurisdiction from reporter series
  const inferredCourt = inferCourtFromReporter(reporter)

  // Backward compat: set court string for SCOTUS when not already extracted
  if (!court && inferredCourt?.level === "supreme" && inferredCourt?.jurisdiction === "federal") {
    court = "scotus"
  }
```

Remove the `SCOTUS_REPORTER_REGEX` constant at line 58 (no longer needed).

Add `inferredCourt` to the return object. Find the return statement that builds the `FullCaseCitation` object and add the field. It should be near the end of the `extractCase` function where all the fields are assembled.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/extract/extractCase.test.ts`
Expected: ALL PASS (including existing SCOTUS tests — backward compat preserved)

- [ ] **Step 5: Run full test suite**

Run: `pnpm exec vitest run`
Expected: ALL 1030+ tests pass

- [ ] **Step 6: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/extract/extractCase.ts tests/extract/extractCase.test.ts
git commit -m "feat: integrate court inference into case extraction (#78)"
```

---

### Task 4: Changeset and final verification

**Files:**
- Create: `.changeset/<name>.md`

- [ ] **Step 1: Create changeset**

Create `.changeset/court-inference.md`:

```markdown
---
"eyecite-ts": minor
---

Add court inference from reporter series: new `inferredCourt` field on `FullCaseCitation` with `level`, `jurisdiction`, `state`, and `confidence` derived from a curated lookup table of ~40 common reporters
```

- [ ] **Step 2: Run full verification**

Run: `pnpm exec vitest run && pnpm typecheck && pnpm lint && pnpm build && pnpm size`
Expected: ALL PASS

- [ ] **Step 3: Commit changeset**

```bash
git add .changeset/court-inference.md
git commit -m "chore: add changeset for court inference (#78)"
```
