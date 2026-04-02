# False Positive Filtering Design

**Issues:** #57 (historical citations), #58 (international citations)
**Date:** 2026-04-02

## Problem

The extraction pipeline produces false positives for non-US citation sources:

1. **Historical:** `3 Edw. 1, ch. 29 (1297)` matches as a case citation (Edwards' Chancery Reports). `8 Co. Rep. 114 (C.P. 1610)` matches as a case citation (Coke's Reports).
2. **International:** `1986 I.C.J. 14 (June 27)` and `1155 U.N.T.S. 331` match as case citations via the broad state-reporter regex.

Root cause: the tokenization layer uses intentionally broad patterns, and no post-extraction filter exists to reject implausible matches. The reporters database contains start/end date ranges but they're never checked. International reporters aren't in the database at all but still match the volume-reporter-page pattern.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where in pipeline | Post-extraction filter phase (Step 4.9) | Clean separation, single responsibility, easy to extend |
| Default behavior | Penalize + warn (no removal) | Backward compatible. Consumers can filter by confidence. |
| Opt-in removal | `filterFalsePositives: true` on ExtractOptions | Explicit opt-in to change result set |
| Reporters DB dependency | None in core | Bundle size constraint: DB stays behind `eyecite-ts/data` entry point |
| Blocklist scope | ~15-20 common non-US reporters | Covers international + UK + European + historical. Trivial memory cost. |
| Year threshold | 1750 | US legal reporting starts ~1790 (Dallas Reports). 1750 gives headroom for colonial era. |

## Data Model

### New option on ExtractOptions

```typescript
interface ExtractOptions {
  // ... existing fields ...

  /**
   * Remove citations flagged as likely false positives (default: false).
   * When false, flagged citations get reduced confidence + warning.
   * When true, flagged citations are removed from results.
   */
  filterFalsePositives?: boolean
}
```

### Flagging behavior

Flagged citations receive:
- Confidence reduced to `0.1` floor
- A `Warning` with `level: "warning"` and descriptive message

No new types needed. Uses existing `Warning` interface.

## Static Blocklist

A `Set<string>` of normalized (lowercase, trimmed) reporter abbreviations known to be non-US sources. Organized by category:

**International tribunals/treaties:**
- `i.c.j.` — International Court of Justice
- `u.n.t.s.` — United Nations Treaty Series
- `i.l.m.` — International Legal Materials
- `i.l.r.` — International Law Reports
- `p.c.i.j.` — Permanent Court of International Justice

**UK reporters:**
- `a.c.` — Appeal Cases
- `w.l.r.` — Weekly Law Reports
- `all e.r.` — All England Reports
- `q.b.` — Queen's Bench
- `k.b.` — King's Bench
- `ch.` — Chancery Division
- `co. rep.` — Coke's Reports

**European:**
- `e.c.r.` — European Court Reports
- `e.h.r.r.` — European Human Rights Reports
- `c.m.l.r.` — Common Market Law Reports

**Historical English:**
- `edw.` — Edwards (standalone only; `Edw. Ch.` is a valid US reporter)

**Lookup:** Normalize extracted reporter to lowercase, trim, check set membership. For `edw.`, match only when it's the entire reporter string (not a prefix of `Edw. Ch.`).

## Year Plausibility Heuristic

Any citation with an extracted `year < 1750` is flagged as implausible.

- Applies to all citation types with a `year` field (case, journal, federal register, statutes at large)
- Independent of the blocklist — catches historical sources not on the list
- Threshold of 1750 is conservative: US legal reporting starts ~1790 (Dallas Reports), colonial era references occasionally cite 1760s-1770s

## Pipeline Integration

### New file: `src/extract/filterFalsePositives.ts`

```typescript
export function applyFalsePositiveFilters(
  citations: Citation[],
  remove: boolean,
): Citation[]
```

- `remove: false` (default): mutates citations in place (penalize + warn), returns same array
- `remove: true`: returns new array excluding flagged citations

### Pipeline position

```
4.5  Subsequent history linking
4.75 String citation grouping
4.9  False positive filtering   ← NEW
5.   Resolve (optional)
```

Runs after string cite grouping (so group metadata is assigned). Runs before resolve (so penalized citations don't pollute resolution).

### Reporter field access

- Case citations: check `reporter` field against blocklist
- Journal citations: check `abbreviation` field against blocklist
- Other types: year heuristic only (no reporter to check)

## Testing Strategy

### Unit tests: `tests/extract/filterFalsePositives.test.ts`

- Blocklist hits: I.C.J., U.N.T.S., Co. Rep., Edw. flagged with warning + confidence 0.1
- Year heuristic: year 1297 and 1610 flagged, year 1850 passes
- `remove: false`: citations kept with reduced confidence
- `remove: true`: flagged citations removed
- Valid US reporters pass through untouched (F.2d, U.S., S. Ct.)
- `Edw. Ch.` (full string) NOT blocked — valid US reporter

### Integration: enable thorny corpus samples

- Remove `knownLimitation` from 4 samples in `thorny-corpus.json`: magna-carta, coke-reports, international-icj, international-treaty
- Verify: with `filterFalsePositives: true`, these produce 0 citations
- Verify: default mode produces citations with low confidence + warnings

### Edge cases

- String cite group member filtered: remaining members keep valid group metadata
- Blocklist is case-insensitive
- Reporter with trailing/leading whitespace still matches
