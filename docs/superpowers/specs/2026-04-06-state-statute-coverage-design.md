# State Statute Coverage Expansion

**Issue:** #155 — Coverage gap: state statutes, CFR, and state-specific codes
**Scope:** Add the ~30 missing US state jurisdictions to the `abbreviated-code` statute pattern family
**Date:** 2026-04-06

## Problem

eyecite-ts supports statute citations from 20 US states. The remaining ~30 states are completely unrecognized. For example, `Alaska Stat. § 08.29.400` produces zero results because Alaska is not in the `abbreviated-code` pattern's regex alternation or the `abbreviatedCodes[]` lookup table.

The root cause is architectural: the `abbreviated-code` pattern in `statutePatterns.ts` uses a hardcoded regex alternation listing every supported abbreviation, and `knownCodes.ts` maintains a separate-but-must-match data array. Adding a state requires editing both in sync — a duplication that discourages expansion.

## Out of Scope

- State constitution citations (`Cal. Const. art. I, § 7`)
- Federal Rules of Procedure (`Federal Rule of Civil Procedure Rule 54(b)`)
- Bare section references (`§1158(a)`, `Section 207(c)`)
- Expanding the `named-code` pattern (multi-code states like NY, CA, TX)
- CFR/USC patterns (already working)

These are separate gap categories identified in the issue investigation and can be addressed in follow-up PRs.

## Design

### 1. Data Model

New file: `src/data/stateStatutes.ts`

```ts
export interface StateStatuteEntry {
  /** Two-letter jurisdiction code (e.g., "AK", "AZ") */
  jurisdiction: string
  /** All recognized abbreviation forms, longest first */
  abbreviations: string[]
  /**
   * Regex fragment for the abbreviation alternation.
   * Auto-generated from abbreviations if omitted (periods become optional,
   * whitespace becomes \s+). Provide explicitly when the abbreviation
   * requires special regex (e.g., optional components, word boundaries).
   */
  regexFragment?: string
}
```

This file contains:
- A `stateStatuteEntries` array with entries for all ~50 states (the existing 12 + ~30 new)
- An `escapeForRegex(abbreviations: string[]): string` helper that converts plain abbreviation strings into regex fragments (e.g., `"T.C.A."` becomes `T\.?\s*C\.?\s*A\.?`)
- Entries are ordered longest-abbreviation-first within each state to prevent partial matches

### 2. Regex Generation

In `statutePatterns.ts`, the `abbreviated-code` entry changes from a hardcoded regex literal to a dynamically built one:

```ts
import { buildAbbreviatedAlternation } from "@/data/stateStatutes"

// In the statutePatterns array:
{
  id: "abbreviated-code",
  regex: buildAbbreviatedCodeRegex(),
  description: "Abbreviated state code citations for all US jurisdictions",
  type: "statute",
}
```

The `buildAbbreviatedCodeRegex()` function:
1. Collects all regex fragments from `stateStatuteEntries`
2. Sorts fragments longest-first (PEG ordered choice — more specific beats less specific)
3. Joins with `|` into a single alternation
4. Wraps in the existing capture group structure: `(?:(title)\s+)?(alternation)\s*§?\s*(section)`
5. Returns a compiled `RegExp` with the `g` flag

This runs once at module load time. The resulting regex is functionally identical to today's — same capture groups, same extraction path — just built from data instead of a literal.

### 3. knownCodes.ts Migration

The existing `abbreviatedCodes[]` array in `knownCodes.ts` migrates to derive from `stateStatuteEntries`:

- `stateStatuteEntries` is the single source of truth for abbreviation data
- `abbreviatedCodes` is computed from it (mapping `StateStatuteEntry` to `CodeEntry[]`)
- `findAbbreviatedCode()` and `findNamedCode()` remain unchanged in interface
- The `namedCodes[]` array is untouched

### 4. Data Population

Source: the OurFirm.ai statute repo's research docs (`docs/srcs/*.md`) and `citation-normalizer.ts`.

For each of the ~30 missing states:
1. Read the state's research doc for citation format variants and abbreviations
2. Cross-reference against `citation-normalizer.ts` patterns
3. Create a `StateStatuteEntry` with all recognized forms
4. For states without statute repo research, derive from standard Bluebook conventions

Example entries:

```ts
{ jurisdiction: "AK", abbreviations: ["Alaska Stat. Ann.", "Alaska Stat.", "AS"] },
{ jurisdiction: "AZ", abbreviations: ["Ariz. Rev. Stat. Ann.", "Ariz. Rev. Stat.", "A.R.S."] },
{ jurisdiction: "CT", abbreviations: ["Conn. Gen. Stat. Ann.", "Conn. Gen. Stat.", "C.G.S."] },
{ jurisdiction: "KS", abbreviations: ["Kan. Stat. Ann.", "K.S.A."] },
{ jurisdiction: "SC", abbreviations: ["S.C. Code Ann.", "S.C. Code"] },
{ jurisdiction: "TN", abbreviations: ["Tenn. Code Ann.", "T.C.A."] },
```

### 5. Verification Strategy

Each new state is verified against real-world citations before being committed:

1. **Per-state smoke test**: For each new state, write a test with 2-3 real citations sourced from court opinions (CourtListener) or legislative text (statute repo fixtures). Assert:
   - Citation is extracted (not missed)
   - `jurisdiction` field is correct
   - `section` is parsed correctly
   - No false positives on surrounding non-citation text

2. **Add-then-test ordering**: Add a state's data entry, write its smoke test with real examples, confirm it passes, then move to the next state. Not batch-add-then-test.

3. **Regression**: Run the full existing test suite after each batch of additions to ensure the expanded regex doesn't break the 12 currently-supported states.

4. **Cross-validation**: For the 22 states supported by both eyecite-ts and the statute repo, run sample citations through both systems — jurisdiction and section should agree.

### 6. Files Changed

| File | Change |
|------|--------|
| `src/data/stateStatutes.ts` | **New.** ~50-state abbreviation table, `escapeForRegex` helper, `buildAbbreviatedCodeRegex` function |
| `src/data/knownCodes.ts` | Migrate `abbreviatedCodes[]` to derive from `stateStatuteEntries`. Lookup functions unchanged. |
| `src/patterns/statutePatterns.ts` | Replace hardcoded `abbreviated-code` regex with call to `buildAbbreviatedCodeRegex()` |
| `src/data/index.ts` | Export `stateStatutes` entry point |
| `tests/extract/extractStatute.test.ts` | Add per-state smoke tests with real citation examples |

### 7. What Doesn't Change

- `named-code` pattern and its 6 jurisdictions (NY, CA, TX, MD, VA, AL)
- `mass-chapter`, `chapter-act`, `usc`, `cfr`, `prose` patterns
- All extraction logic (`extractAbbreviated.ts`, `extractNamedCode.ts`, etc.)
- The `CodeEntry` interface and `findAbbreviatedCode()` / `findNamedCode()` function signatures
- Types, pipeline, resolve, annotate — nothing outside the data + pattern layer

## Architecture Rationale

- **Data-driven over regex-driven** (Raymond: "fold knowledge into data so program logic can be stupid and robust")
- **Single source of truth** eliminates the sync bug class between regex alternation and lookup table
- **Deep module** (Ousterhout): one pattern entry serves all ~50 states rather than N shallow patterns
- **Island grammar tolerance** (Moonen): the tokenizer captures broadly; `extractAbbreviated.ts` validates and assigns confidence. Existing confidence model (0.95 with §, 0.85 without) applies to new states unchanged.
- **PEG ordered choice** (Ford): longest fragments sort first in the alternation, so `Alaska Stat. Ann.` matches before `AS` could grab a false positive.
