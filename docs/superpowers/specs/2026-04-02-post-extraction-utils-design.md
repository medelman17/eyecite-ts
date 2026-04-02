# Post-Extraction Utilities & Core Enhancements

**Date:** 2026-04-02
**Version:** 0.6.0 (minor, additive)
**Status:** Approved

## Overview

Two workstreams that improve eyecite-ts for both the Check My Cites (CMC) integration and the broader OSS community:

1. **Core enhancements** — three features enriching what extraction produces (structured court normalization, structured pincite parsing, reporter spacing normalization)
2. **New `eyecite-ts/utils` entry point** — four stateless post-extraction utilities for downstream consumption (sentence context, case grouping, reporter key formatting, Bluebook formatting)

### Boundary Principle

- **Core lib**: extracting/cleaning data inherent to the citation itself
- **Utils entry point**: composing/formatting/grouping citations for downstream consumption
- If the logic depends only on data eyecite-ts already produces, it belongs in eyecite-ts. If it requires external knowledge or application-specific policy, it does not.

---

## Part 1: Core Enhancements

### 1a. Structured Court Normalization

Normalize raw court strings from parentheticals into canonical forms during extraction. Adds a `normalizedCourt` field to `FullCaseCitation` — the existing `court` field remains unchanged for backwards compatibility.

```typescript
// On FullCaseCitation:
normalizedCourt?: string;  // "S.D.N.Y.", "2d Cir.", "U.S."
// Existing field untouched:
court?: string;            // Raw: "S.D. N.Y.", "2d Cir"
```

Integrated directly into the extraction pipeline (not a separate function call).

### 1b. Structured Pincite Parsing

Parse complex pincite expressions into structured data. Adds a `pinciteInfo` field to citation types that have pincites. The existing `pincite` field remains unchanged.

```typescript
interface PinciteInfo {
  /** Primary page number */
  page: number;
  /** End page for ranges: "570-75" -> 575 */
  endPage?: number;
  /** Footnote number: "570 n.3" -> 3 */
  footnote?: number;
  /** True if this is a page range */
  isRange: boolean;
  /** Original text before parsing */
  raw: string;
}

function parsePincite(raw: string): PinciteInfo | null;
```

Called during extraction to enrich citation objects. Exported from the main entry point for consumers who need standalone pincite parsing.

### 1c. Reporter Spacing Normalization

New cleaner function added to `src/clean/cleaners.ts`:

```typescript
function normalizeReporterSpacing(text: string): string;
// "U. S." -> "U.S."
// "F. 2d" -> "F.2d"
// "S. Ct." -> "S.Ct."
```

Added to the default cleaner pipeline in `cleanText()`. Runs before extraction, improving match accuracy for inconsistently-spaced reporter abbreviations.

---

## Part 2: `eyecite-ts/utils` Entry Point

Four stateless functions. Zero dependencies beyond core types. Tree-shakeable — import only what you use.

### 2a. `getSurroundingContext(text, span, options)`

Finds the enclosing sentence or paragraph around a citation span. Legal-text-aware: periods in "Corp.", "U.S.", "F.3d", "No.", "v.", "Supp." are not treated as sentence boundaries.

```typescript
interface ContextOptions {
  /** Boundary type (default: 'sentence') */
  type: 'sentence' | 'paragraph';
  /** Max characters to return (default: 500) */
  maxLength?: number;
}

interface SurroundingContext {
  /** The sentence or paragraph text */
  text: string;
  /** Absolute character offsets in the source document */
  span: { start: number; end: number };
}

function getSurroundingContext(
  text: string,
  span: { start: number; end: number },
  options?: ContextOptions
): SurroundingContext;
```

**Implementation:** Scan backwards from `span.start` and forwards from `span.end` for sentence terminators (`.`, `?`, `!`) followed by whitespace + uppercase letter. Maintain a static abbreviation allowlist of legal terms that contain periods, built from patterns eyecite-ts already knows (reporter abbreviations, procedural terms, court abbreviations). The allowlist is defined in `context.ts` — it does NOT import from `src/data/` to preserve tree-shaking.

### 2b. `groupByCase(citations)`

Composes resolution, parallel linking, and string-cite relationships into case groups.

```typescript
interface CaseGroup {
  /** The first full citation encountered for this case */
  primaryCitation: FullCaseCitation;
  /** All mentions (full, short, id, supra) in document order */
  mentions: ResolvedCitation[];
  /** Distinct reporter strings: ["550 U.S. 544", "127 S. Ct. 1955"] */
  parallelCitations: string[];
}

function groupByCase(citations: ResolvedCitation[]): CaseGroup[];
```

**Grouping logic:**
1. Full citations with the same `groupId` (from parallel detection) -> same group
2. Full citations with identical `volume`/`reporter`/`page` -> same group
3. Short forms where `resolution.resolvedTo` points to a citation in a group -> added to that group
4. Groups returned in document order (by first mention's span)

Non-case citations (statutes, constitutional, journal, etc.) in the input array are ignored — `groupByCase` operates only on case-type citations and their short forms.

**Not included:** UUID generation, documentOrder numbering, canonicalCaseName selection — these are application-level concerns.

### 2c. `toReporterKey(citation)` / `toReporterKeys(citation)`

Extracts the volume-reporter-page lookup key, stripping case name, pincite, year, and parenthetical.

```typescript
/** Single reporter key: "550 U.S. 544" */
function toReporterKey(citation: FullCaseCitation): string;

/** All reporter keys including parallels: ["550 U.S. 544", "127 S. Ct. 1955"] */
function toReporterKeys(citation: FullCaseCitation): string[];
```

Uses `normalizedReporter` when available, falls back to `reporter`. Handles blank-page citations (`hasBlankPage`) by omitting the page.

### 2d. `toBluebook(citation)`

Reconstructs a canonical Bluebook-style citation string from structured fields. Works across all citation types via the discriminated union.

```typescript
function toBluebook(citation: Citation): string;
```

Output by type:

| Input type | Output example |
|-----------|----------------|
| `FullCaseCitation` | `"Bell Atl. Corp. v. Twombly, 550 U.S. 544 (2007)"` |
| `StatuteCitation` | `"42 U.S.C. § 1983"` |
| `ConstitutionalCitation` | `"U.S. Const. amend. XIV, § 1"` |
| `JournalCitation` | `"100 Harv. L. Rev. 1234 (1987)"` |
| `IdCitation` | `"Id. at 570"` |
| `SupraCitation` | `"Smith, supra, at 460"` |
| `ShortFormCaseCitation` | `"500 F.2d at 125"` |
| `NeutralCitation` | `"2020 WL 123456"` |
| `PublicLawCitation` | `"Pub. L. No. 116-283"` |
| `FederalRegisterCitation` | `"85 Fed. Reg. 12345"` |
| `StatutesAtLargeCitation` | `"120 Stat. 1234"` |

Best-effort: uses available fields. If `caseName` is present, includes it; if not, produces the reporter-key form.

---

## Architecture

### Package Exports

```jsonc
{
  ".":          { /* existing core - extraction, resolution, types */ },
  "./data":     { /* existing reporter DB (~86.5 KB) */ },
  "./annotate": { /* existing HTML annotation (~0.7 KB) */ },
  "./utils":    { /* NEW: post-extraction utilities (~2-3 KB) */ }
}
```

New `size-limit` entry for `./utils` targeting ~2-3 KB gzipped.

### File Layout

```
src/utils/
  index.ts              # Barrel export
  context.ts            # getSurroundingContext + abbreviation allowlist
  groupByCase.ts        # Case grouping logic
  reporterKey.ts        # toReporterKey / toReporterKeys
  bluebook.ts           # toBluebook formatter
  types.ts              # SurroundingContext, CaseGroup, ContextOptions

src/extract/
  pincite.ts            # parsePincite (new file)

src/clean/
  cleaners.ts           # normalizeReporterSpacing (added to existing file)
```

Court normalization integrates into the existing extraction pipeline, enriching `FullCaseCitation` with `normalizedCourt`.

### Dependency Rules

- `src/utils/` imports only from `src/types/` and `src/resolve/types.ts` — no dependency on extraction internals, reporter DB, or patterns
- `src/utils/context.ts` owns its own static abbreviation allowlist (does not import from `src/data/`)
- Core types (`CaseGroup`, `PinciteInfo`) defined alongside their implementations, re-exported from relevant barrels

### Future Extension: `eyecite-ts/ml`

The entry point architecture accommodates a future `./ml` entry point for ML-based features (case name similarity, entity recognition, citation classification). That entry point would bring its own runtime dependencies. No design needed now — the extension point is clean.

---

## Testing

| Function | Key test cases |
|----------|---------------|
| `getSurroundingContext` | Simple sentence; legal abbreviation mid-sentence ("Corp.", "U.S.", "F.3d" not treated as sentence end); citation at start/end of text; paragraph mode; multi-sentence with pincite periods; maxLength truncation |
| `groupByCase` | Single full cite; parallel cites grouped; short form -> group; Id. -> group; supra -> group; unresolved short form excluded; document order preserved; multiple independent cases |
| `toReporterKey` | Standard case; normalized reporter preferred; blank page handling; parallel keys via `toReporterKeys` |
| `toBluebook` | All 11 citation types produce correct output; missing optional fields handled gracefully; pincite included when present |
| `parsePincite` | Simple page ("570"); range ("570-75" -> 570-575); footnote ("570 n.3"); combined ("570-75 n.3"); "at" prefix stripped; null for unparseable |
| `normalizeReporterSpacing` | "U. S." -> "U.S."; "F. 2d" -> "F.2d"; "S. Ct." -> "S.Ct."; already-normalized unchanged |
| `normalizedCourt` | "S.D. N.Y." -> "S.D.N.Y."; "2d Cir" -> "2d Cir."; existing `court` field untouched |

---

## Backwards Compatibility

All changes are additive:

- New `pinciteInfo` field on citations (existing `pincite` unchanged)
- New `normalizedCourt` field on `FullCaseCitation` (existing `court` unchanged)
- New cleaner added to default pipeline (improves extraction, does not change API shape)
- New `./utils` entry point (no changes to existing entry points)

**Version bump:** 0.6.0 (minor)

---

## Scope Exclusions

Explicitly out of scope:

- Case name similarity/comparison (deferred to `eyecite-ts/ml`)
- Citation validation (volume/page plausibility checking)
- Reporter metadata queries
- Relationship graph traversal (`groupByCase` is flat grouping, not a graph)
- HTML position mapping (CMC adapter concern)
- UUID generation, documentOrder numbering (application concerns)
- Any network calls, AI, or runtime dependencies (stays zero-dep)
