# Record Citation Extraction — Design Spec

**Date:** 2026-04-02
**Issue:** #74
**Status:** Draft

## Overview

Add extraction of record citations — references to documents within a case's own record (transcripts, exhibits, docket entries, pleadings, appendices, etc.). These appear in appellate briefs, trial briefs, summary judgment motions, and other litigation filings.

Record citations are fundamentally different from authority citations: they reference the trial record, not published law, and are never shepardized. This spec covers ~50 abbreviation forms across 7 categories of court documents.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | Separate `extractRecordCitations()` function (Approach B) | Record citations are semantically different from authority citations. Separate entry point keeps existing pipeline untouched. |
| Name extraction | Backward search (like `extractCaseName`) | Consistent with existing pattern. `declarant?: string` field for depositions, affidavits, declarations. |
| Party prefixes | Captured as `party?: string` | `Def. Mot. 12` and `Pl. Mot. 12` are different documents. Must distinguish. |
| Resolution | `Id.` can resolve to record citations in v1 | Bluebook explicitly permits `Id.` for record cites. `extractAllCitations()` merges both sets for resolver input. |
| State-specific forms | Always active | TX (`CR`, `RR`) and CA (`CT`, `RT`) forms are distinctive enough with trailing numbers. No opt-in flag needed. |
| `A.` disambiguation | Support with low confidence (0.45), require no preceding volume number and no series suffix (`2d`, `3d`) | Distinguishes `A. 123` (appendix) from `123 A.2d 456` (Atlantic Reporter). |
| Range modeling | Flat fields throughout | Consistent with existing codebase style (`FullCaseCitation` uses flat optional fields). All range types use `start`/`end` pairs as flat fields. |
| Merge strategy | Two-pass extraction with span-conflict resolution | Authority and record extraction run independently. Overlapping spans resolved by confidence, with authority winning ties. |
| `Reply` disambiguation | Require party prefix, parenthetical wrapping, or paragraph symbol | `Reply` is a complete English word; bare `Reply 5` produces too many false positives. |
| Transcript dates | Deferred to v2 | `Tr. 50:1, Jan. 15, 2024` — date extraction adds complexity with low signal value for citation identification. |
| Non-contiguous paragraphs | Deferred to v2 | `Compl. ¶¶ 10, 12, 15` — comma-separated lists require list-type fields. Ranges (`¶¶ 10-12`) are sufficient for v1. |

---

## Versioning Impact

Adding `"record"` to the `CitationType` discriminated union is a **breaking change** for consumers with exhaustive `switch(citation.type)` statements. Their code will get a compile error until they add a `"record"` case.

This requires a **semver-major bump** (or a minor bump with a prominent changeset note, per project convention). The changeset must call out the type union expansion.

---

## Type Definition

```typescript
interface RecordCitation extends CitationBase {
  type: "record"
  recordType: RecordType

  // Context
  party?: string          // "Def.", "Pl.", "Gov't", etc.
  declarant?: string      // "Smith", "Jones" — backward search from abbreviation

  // Page pinpoint (used by page-ref and transcript groups)
  page?: number
  pageEnd?: number        // for ranges: R. at 45-52
  pageSuffix?: string     // "a" in "12a" (Pet. App. 12a)
  pageEndSuffix?: string  // "a" in "32a" (Pet. App. 12a-32a)

  // Line pinpoint (transcripts: Tr. 50:1-15)
  line?: number
  lineEnd?: number

  // Paragraph pinpoint (pleadings: Compl. ¶¶ 10-12)
  paragraph?: number
  paragraphEnd?: number

  // Entry pinpoint (docket/ECF)
  entryNumber?: number
  attachmentNumber?: number  // ECF 12-2 → 2

  // Exhibit/designation
  designation?: string    // "A" in Ex. A (letter/number exhibit designation)

  // Multi-volume records
  volume?: number         // 2CR4, Vol. 2
}

type RecordType =
  | "record"                  // R.
  | "joint_appendix"          // J.A., JA
  | "petition_appendix"       // Pet. App.
  | "appendix"                // App., A.
  | "supplemental_appendix"   // S.A., SA
  | "addendum"                // Addend.
  | "brief"                   // Br.
  | "transcript"              // Tr., Trial Tr.
  | "hearing_transcript"      // Hr'g Tr.
  | "sentencing_transcript"   // Sent. Tr.
  | "plea_transcript"         // Plea Tr.
  | "argument_transcript"     // Arg. Tr.
  | "deposition"              // Dep., Dep. Tr.
  | "docket"                  // Dkt., Doc., DE
  | "ecf"                     // ECF, ECF No.
  | "exhibit"                 // Ex., PX, DX, GX
  | "complaint"               // Compl., Am. Compl.
  | "answer"                  // Ans.
  | "affidavit"               // Aff.
  | "declaration"             // Decl.
  | "motion"                  // Mot.
  | "opposition"              // Opp'n, Opp.
  | "reply"                   // Reply (requires party prefix or ¶)
  | "memorandum"              // Mem.
  | "stipulation"             // Stip., Jt. Stip.
  | "interrogatory"           // Interrog.
  | "request_for_admission"   // RFA, Req. Admis.
  | "statement_of_facts"      // SMF, SOMF, SUF, RSMF, CSOF
  | "clerks_record"           // CR (Texas)
  | "reporters_record"        // RR (Texas)
  | "clerks_transcript"       // CT (California)
  | "reporters_transcript"    // RT (California)
```

### Field Applicability

Not every field applies to every `recordType`. This table documents which fields are populated by which pattern groups, so consumers know what to expect:

| Field | Page-ref group | Paragraph-ref group | Entry-ref group | Transcript group |
|---|---|---|---|---|
| `page` / `pageEnd` | yes | — | optional (`at PAGE`) | yes |
| `pageSuffix` / `pageEndSuffix` | yes (appendixes) | — | — | — |
| `line` / `lineEnd` | — | — | — | yes |
| `paragraph` / `paragraphEnd` | — | yes | — | — |
| `entryNumber` / `attachmentNumber` | — | — | yes | — |
| `designation` | — | — | yes (exhibits) | — |
| `volume` | yes (TX multi-vol) | — | — | — |
| `party` | any | any | any | — |
| `declarant` | — | affidavit, declaration | — | deposition |

---

## Architecture

### Public API

```typescript
// Standalone record citation extraction
export function extractRecordCitations(
  text: string,
  options?: RecordCitationOptions
): RecordCitation[]

// Merged extraction: authority + record citations
export function extractAllCitations(
  text: string,
  options?: ExtractAllOptions
): Citation[]  // sorted by span position

interface RecordCitationOptions {
  cleaners?: Cleaner[]
}

interface ExtractAllOptions {
  cleaners?: Cleaner[]
  // All existing extractCitations options pass through
}
```

### File Structure

```
src/
  patterns/
    recordPatterns.ts          # Pattern definitions for all record citation forms
  extract/
    extractRecord.ts           # Extractor: token → RecordCitation + declarant backward search
  recordIndex.ts               # Public API: extractRecordCitations(), extractAllCitations()
  types/
    citation.ts                # Add RecordCitation, RecordType to existing types
```

### Entry Point

Both `extractRecordCitations` and `extractAllCitations` export from the main `eyecite-ts` entry point. No new package entry point needed.

### Type Union Update

`RecordCitation` is added to the `Citation` discriminated union and `"record"` is added to `CitationType`. This ensures `extractAllCitations()` returns a properly typed `Citation[]` that includes record citations, and `switch(citation.type)` remains exhaustive.

---

## Merge Semantics: `extractAllCitations()`

`extractAllCitations()` runs two independent extraction passes and merges results:

1. **Pass 1:** `extractCitations(text, options)` → authority citations
2. **Pass 2:** `extractRecordCitations(text, options)` → record citations
3. **Merge:** Concatenate, sort by `span.cleanStart`, then resolve overlaps

### Span-Conflict Resolution

When two citations from different passes overlap in span position:

1. **Higher confidence wins.** The citation with the greater `confidence` value is kept; the other is discarded.
2. **Authority wins ties.** If confidence is equal (or within 0.01), the authority citation is kept. Authority citations have stronger downstream utility (verification, shepardization).
3. **No partial overlap.** If spans partially overlap (one starts inside another), both are kept with a `warning` added to each noting the overlap. This is rare but possible with adjacent abbreviations.

### Performance Note

Two-pass extraction doubles tokenization work. For typical legal briefs (5,000–50,000 words) this is negligible. For very large documents (100K+ words), callers who only need one type should use the standalone functions directly.

---

## Pattern Strategy

### Pattern Group 1: Page-Reference

```
[PARTY]? ABBREV [at]? PAGE[-PAGE]?[SUFFIX]?
```

| Abbreviation(s) | `recordType` | Notes |
|---|---|---|
| `R.` | `record` | "at" customary but optional |
| `J.A.`, `JA` | `joint_appendix` | 4 spacing variants: `J.A. 200`, `JA200`, `JA 200`, `J.A.200` |
| `Pet. App.` | `petition_appendix` | Page suffix letters: `12a`, `32a` |
| `App.` | `appendix` | |
| `A.` | `appendix` | Low confidence (0.45). Must NOT have preceding volume or trailing series suffix. |
| `S.A.`, `SA` | `supplemental_appendix` | |
| `Addend.` | `addendum` | |
| `Br.` | `brief` | Often has party prefix: `Resp. Br. 22` |
| `CR` | `clerks_record` | Texas. Multi-volume: `2CR4`. No period. |
| `RR` | `reporters_record` | Texas. Multi-volume: `2RR45`. No period. |
| `Supp. CR` | `clerks_record` | Texas supplemental. |
| `Supp. RR` | `reporters_record` | Texas supplemental. |
| `CT` | `clerks_transcript` | California. |
| `RT` | `reporters_transcript` | California. Page:line optional. |
| `ALCR` | `clerks_record` | Texas Rule 34.5(a) appendix. |

### Pattern Group 2: Paragraph-Reference

```
[NAME]? [PARTY]? ABBREV ¶¶? NUM[-NUM]?
```

| Abbreviation(s) | `recordType` | Notes |
|---|---|---|
| `Compl.` | `complaint` | |
| `Am. Compl.` | `complaint` | |
| `Ans.`, `Answer` | `answer` | |
| `Aff.` | `affidavit` | Declarant backward search applies. |
| `Decl.` | `declaration` | Declarant backward search applies. |
| `Mot.` | `motion` | |
| `Opp'n`, `Opp.` | `opposition` | |
| `Reply` | `reply` | **Requires** party prefix (`Def. Reply`), parenthetical wrapping (`(Reply 5.)`), or paragraph symbol (`Reply ¶ 5`). Bare `Reply 5` does not match. |
| `Mem.` | `memorandum` | |
| `Stip.`, `Jt. Stip.` | `stipulation` | |
| `Interrog.` | `interrogatory` | Uses "No." instead of ¶. |
| `RFA`, `Req. Admis.` | `request_for_admission` | Uses "No." instead of ¶. |
| `SMF`, `SUF` | `statement_of_facts` | |
| `SOMF` | `statement_of_facts` | |
| `RSMF`, `Resp. SMF` | `statement_of_facts` | |
| `CSOF` | `statement_of_facts` | |

### Pattern Group 3: Entry-Reference

```
[PARTY]? ABBREV [No.]? NUM[-NUM]? [at PAGE]?
```

| Abbreviation(s) | `recordType` | Notes |
|---|---|---|
| `Dkt.`, `Dkt. No.` | `docket` | |
| `Doc.`, `Doc. No.` | `docket` | |
| `DE` | `docket` | |
| `ECF`, `ECF No.` | `ecf` | Attachment: `ECF 12-2` → entryNumber=12, attachmentNumber=2 |
| `Ex.` | `exhibit` | Letter or number designation. |
| `Pl. Ex.`, `PX` | `exhibit` | |
| `Def. Ex.`, `DX` | `exhibit` | |
| `GX`, `Gov't Ex.` | `exhibit` | |

### Pattern Group 4: Transcript (hybrid — page or page:line)

```
[NAME]? ABBREV PAGE[:LINE[-LINE]]?
```

| Abbreviation(s) | `recordType` | Notes |
|---|---|---|
| `Tr.`, `Trial Tr.` | `transcript` | |
| `Hr'g Tr.` | `hearing_transcript` | |
| `Sent. Tr.` | `sentencing_transcript` | |
| `Plea Tr.` | `plea_transcript` | |
| `Arg. Tr.` | `argument_transcript` | |
| `Dep.`, `Dep. Tr.` | `deposition` | Declarant backward search applies. |

### Pattern Ordering

Longer/more-specific abbreviations match first:
1. Multi-word compounds: `Pet. App.`, `Am. Compl.`, `ECF No.`, `Hr'g Tr.`, `Dep. Tr.`, etc.
2. Single abbreviations with periods: `Compl.`, `Aff.`, `Decl.`, `Dkt.`, etc.
3. Short/ambiguous forms: `R.`, `A.`, `Ex.`, `Doc.`, `DE`, `Br.`, `CR`, `RR`, etc.

---

## Declarant Backward Search

Follows the `extractCaseName` architectural pattern.

**When:** After matching the citation core for depositions, affidavits, and declarations.

**How:** From the start of the abbreviation, search backward up to 50 characters for capitalized words.

**Boundary stops:** The search terminates at:
- Double newline (paragraph boundary)
- Semicolon (citation list separator)
- Opening parenthesis
- Comma followed by lowercase text (not a name continuation)
- A digit-period-space sequence (`\d\.\s`) — prevents crossing into a prior numbered citation

**Not** a sentence boundary stop: single period followed by uppercase (`Dr. Smith`, `St. Louis`). These are common abbreviation-period patterns within names. The existing `extractCaseName` uses `/\d\.\s+/g` as its boundary, not `/\.\s+[A-Z]/` — this extractor follows the same approach.

**Examples:**
- `Smith Dep. 45:3` → declarant: `Smith`
- `Dr. Smith Dep. 45:3` → declarant: `Dr. Smith`
- `Jones & Doe Aff. ¶ 2` → declarant: `Jones & Doe`
- `The Jefferson Aff. ¶ 2` → declarant: `Jefferson` (strip leading article)
- `Def. Smith Decl. ¶ 8` → party: `Def.`, declarant: `Smith`

**Fallback:** If no clean name boundary found, leave `declarant` as `undefined`. Best-effort, not required.

---

## Resolution Integration

### `extractAllCitations()`

Merges authority citations (`extractCitations()`) and record citations (`extractRecordCitations()`) into a single array sorted by span position. This merged array is the input to `resolveCitations()`.

### `DocumentResolver` Changes

**Eligible antecedents for `Id.`:**
- Record citations become valid antecedents for `Id.` resolution, alongside existing case citations.
- The resolver uses "most recent antecedent" — whichever citation (authority or record) is physically closest before the `Id.` wins.
- Only `Id.` can resolve to record citations. `supra` and short-form case citations cannot.
- Same scope boundary rules as authority citations (paragraph/footnote scope).

**Pincite forwarding:**
- When `Id.` has a pincite (e.g., `Id. at 50`), the pincite overrides the antecedent's page, same as for case citations.
- When `Id.` has no pincite, it inherits the antecedent's full pinpoint unchanged.
- The resolved reference carries forward the antecedent's `recordType`.

**Type narrowing impact:**
- Currently, a resolved `IdCitation` always points to a `FullCaseCitation`. After this change, it may point to a `RecordCitation`.
- Consumers who access the resolved antecedent must handle both types. The `resolvedTo` index already requires consumers to look up the target citation and check its type — no API change needed, but the **behavioral contract** changes.

**Example resolution sequence:**
```
Smith v. Jones, 500 F.2d 123    ← authority citation (index 0)
R. at 45                        ← record citation (index 1)
Id. at 50                       ← resolves to R. (index 1), page=50
Id.                             ← resolves to Id. → R. (index 1), page=50
600 F.2d 789                    ← authority citation (index 4)
Id. at 800                      ← resolves to 600 F.2d (index 4), pincite=800
```

This is a surgical change: add `"record"` to the set of types eligible as `Id.` antecedents in the resolver.

---

## Confidence Scoring

### Base Confidence by Distinctiveness

| Tier | Confidence | Forms |
|---|---|---|
| High (0.85) | Multi-word compounds | `Pet. App.`, `ECF No.`, `Hr'g Tr.`, `Sent. Tr.`, `Plea Tr.`, `Arg. Tr.`, `Jt. Stip.`, `Am. Compl.`, `Dep. Tr.`, `Trial Tr.`, `Dkt. No.`, `Doc. No.`, `Req. Admis.`, `Supp. CR`, `Supp. RR` |
| Medium (0.65) | Abbreviation + distinctive pinpoint | `Tr.` + page:line, `Compl.` + ¶, `Aff.` + ¶, `Decl.` + ¶, `Dkt.` + number, `J.A.` + page, `S.A.` + page, `CR`/`RR` + number, `SMF`/`SOMF` + ¶ |
| Lower (0.45) | Short/ambiguous forms | `R. at`, `A.`, `Ex.`, `Doc.`, `DE`, `Br.`, `Mot.`, `Opp'n`, `Mem.`, `Ans.` |

### Confidence Bumps

- **+0.1** if wrapped in parentheses — `(R. at 45.)` is more likely a citation than bare `R. at 45`
- **+0.05** if party prefix present — `Def. Mot. 12` is more clearly a record cite than `Mot. 12`

---

## Explicitly Deferred to v2

These features are out of scope for v1 to keep the initial implementation focused:

| Feature | Example | Why deferred |
|---|---|---|
| Transcript dates | `Tr. 50:1, Jan. 15, 2024` | Date parsing adds complexity with low signal value for citation identification. The date doesn't affect what was cited. |
| Non-contiguous paragraph lists | `Compl. ¶¶ 10, 12, 15` | Requires a list-type field (`paragraphs: number[]`) rather than a simple range. Ranges (`¶¶ 10-12`) cover the most common case. |
| `supra` resolution for record cites | `Aff., supra, ¶ 5` | Rare in practice. `Id.` covers the vast majority of record citation back-references. |
| Record-to-record short forms | — | No established convention exists. |

---

## Testing Strategy

### Unit Tests (`tests/extract/extractRecord.test.ts`)

- One `describe` block per record type category (page-ref, para-ref, entry-ref, transcript)
- Mock tokens with `createIdentityMap()`, same pattern as existing extractors
- Test each abbreviation variant, pinpoint parsing, party prefix, declarant backward search
- Edge cases: missing page, page suffix letters, page ranges, line ranges, paragraph ranges, multi-volume (TX)

### Integration Tests (`tests/integration/recordCitations.test.ts`)

- Full pipeline: raw text → `extractRecordCitations()` → validate structured output
- Mixed text containing both authority and record citations
- `extractAllCitations()` → `resolveCitations()` with `Id.` resolving to record citations

### Collision Tests (`tests/extract/recordCollisions.test.ts`)

- `A.` vs Atlantic Reporter: `123 A.2d 456` should NOT match as record citation
- `Ex.` in non-citation context
- `R.` as a person's initial
- Authority + record citations in same sentence don't interfere

### Regression Tests (`tests/extract/recordRegression.test.ts`)

- Run the existing authority citation test suite with `extractAllCitations()` instead of `extractCitations()` and confirm identical results for all authority citations
- Ensure no existing test changes output when record extraction is added

### Merge & Overlap Tests (`tests/integration/extractAllMerge.test.ts`)

- `A.` span that could be either appendix or Atlantic Reporter — verify confidence-based resolution picks the right one
- Authority citation immediately adjacent to a record citation (no gap between spans) — both preserved
- Same sentence containing `500 F.2d 123` and `R. at 45` — both extracted, correctly ordered
- `Doc. 45 at 3` does not collide with any authority pattern

### Boundary Tests (`tests/integration/recordBoundary.test.ts`)

- Record citation at start of document, end of document, inside parenthetical
- `Reply 5` without party prefix/parens/¶ — should NOT match
- `Def. Reply 5` — should match
- `(Reply 5.)` — should match
- `Reply ¶ 5` — should match

---

## Abbreviation Catalog Reference

Full catalog of ~50 abbreviation forms with format examples, collision analysis, and frequency assessment is in the companion spike document: [`2026-04-02-record-citations-spike.md`](./2026-04-02-record-citations-spike.md).
