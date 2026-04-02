# Court Inference from Reporter Series (#78)

## Problem

eyecite-ts infers SCOTUS from three reporters (U.S., S. Ct., L. Ed.) but has no court inference for any other reporter. Citations like `500 F.3d 123` or `200 F. Supp. 3d 456` carry implicit court-level information that is currently discarded.

## Decision: Curated Table over Reporter DB

The reporter database (`reporters.json`) contains `mlz_jurisdiction` fields that could power inference, but using it would make the reporter DB a hard dependency of core extraction, defeating the lazy-loading architecture (`eyecite-ts/data` is a separate entry point for tree-shaking). A curated static lookup table keeps court inference zero-dependency and fast while covering the ~40 most common reporters. Full reporter DB coverage can be added later as an opt-in function in the `eyecite-ts/data` entry point.

## Type System

### New type: `CourtInference`

```typescript
interface CourtInference {
  /** Court level classification */
  level: "supreme" | "appellate" | "trial" | "unknown"
  /** Jurisdiction classification */
  jurisdiction: "federal" | "state" | "unknown"
  /** 2-letter state code, only for state-specific reporters */
  state?: string
  /** Confidence score 0.0-1.0 */
  confidence: number
}
```

### Addition to `FullCaseCitation`

```typescript
interface FullCaseCitation extends CitationBase {
  // ... existing fields unchanged ...
  /** Court level/jurisdiction inferred from reporter series */
  inferredCourt?: CourtInference
}
```

`inferredCourt` is always populated independently of the existing `court?: string` field. The `court` field continues to hold the raw string from parentheticals (e.g., "9th Cir."). `inferredCourt` provides structured metadata derived from the reporter abbreviation.

## Data: Curated Reporter-to-Court Mapping

New file: `src/extract/courtInference.ts`

Static `Map<string, CourtInference>` covering reporters grouped by category:

### Federal Supreme (confidence: 1.0)
U.S., S. Ct., L. Ed., L. Ed. 2d

### Federal Appellate (confidence: 1.0)
F., F.2d, F.3d, F.4th, F. App'x

### Federal Trial (confidence: 1.0)
F. Supp., F. Supp. 2d, F. Supp. 3d, F. Supp. 4th, F.R.D., B.R.

### State-Specific (confidence: 1.0)
- **California**: Cal.App.4th, Cal.App.5th (appellate), Cal.Rptr., Cal.Rptr.2d, Cal.Rptr.3d (various)
- **New York**: A.D.3d (appellate), Misc.3d (trial), N.Y.S.3d (various), N.Y.3d (supreme)
- **Illinois**: Ill.App.3d (appellate), Ill.2d, Ill.Dec. (supreme)
- **Others**: as coverage warrants

### Regional Multi-State (confidence: 0.7, no `state` field)
A.2d, A.3d, S.E.2d, N.E.2d, N.E.3d, N.W.2d, S.W.3d, So.2d, So.3d, P.2d, P.3d

Regional reporters serve multiple states so we can infer level (typically appellate/supreme) but not which state.

## Integration Point

In `extractCase.ts`, replace the existing hardcoded `SCOTUS_REPORTER_REGEX` logic (~line 570-572) with a call to `inferCourtFromReporter(reporter: string): CourtInference | undefined`. The SCOTUS regex is removed — subsumed by the table.

The function does a direct `Map.get()` lookup on the normalized reporter string. Returns `undefined` for unknown reporters (no guessing).

## What Stays the Same

- `court?: string` field: unchanged, still populated from parentheticals
- No dependency on `eyecite-ts/data` entry point or reporter DB
- Existing SCOTUS `court = "scotus"` behavior preserved (the table entry for U.S./S. Ct./L. Ed. produces the same inference, and the `court` field still gets set from the parenthetical or existing logic)

## Testing

- Unit tests for `inferCourtFromReporter()` covering each reporter category
- Integration tests verifying `inferredCourt` appears on extracted citations
- Edge cases: unknown reporters return `undefined`, regional reporters have lower confidence and no state
